import { createMachine, assign, fromPromise } from 'xstate';
import type { PlayerContext, PlayerEvent } from '../types/machines';
import type { PlayerState, PlaybackState } from '../types';
import { globalRetryService } from '../services/retryService';

const initialPlayerState: PlayerState = {
  id: '',
  type: 'dotlottie',
  state: 'idle',
  currentFrame: 0,
  totalFrames: 0,
  currentTime: 0,
  duration: 0,
  speed: 1,
  loop: false,
};

export const playerMachine = createMachine(
  {
    id: 'player',
    types: {} as {
      context: PlayerContext;
      events: PlayerEvent;
    },
    context: {
      config: {
        id: '',
        type: 'dotlottie',
        autoplay: false,
        loop: false,
        speed: 1,
        renderer: 'canvas',
      },
      state: initialPlayerState,
      instance: null,
      container: null,
      file: null,
      syncMode: 'global',
      error: null,
      retryCount: 0,
    },
    initial: 'uninitialized',
    states: {
      uninitialized: {
        on: {
          INITIALIZE: {
            target: 'initializing',
            actions: 'assignInitializationData',
          },
        },
      },
      initializing: {
        invoke: {
          id: 'initializePlayer',
          src: fromPromise(async ({ input }: { input: PlayerContext }) => {
            const { container, file, config } = input;

            if (!container || !file) {
              throw new Error('Container and file are required for initialization');
            }

            let instance: any;

            try {
              // Only DotLottie player is supported
              const { DotLottie } = await import('@lottiefiles/dotlottie-web');
              instance = new DotLottie({
                canvas:
                  container.querySelector('canvas') ||
                  container.appendChild(document.createElement('canvas')),
                src: file.url,
                autoplay: config.autoplay,
                loop: config.loop,
                speed: config.speed,
              });

              await new Promise((resolve) => {
                instance.addEventListener('ready', resolve);
              });

              return { instance, config, file };
            } catch (error) {
              throw new Error(`Failed to initialize ${config.type} player: ${error}`);
            }
          }),
          input: ({ context }) => context,
          onDone: {
            target: 'ready',
            actions: 'assignPlayerInstance',
          },
          onError: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      ready: {
        entry: 'notifyReady',
        initial: 'idle',
        states: {
          idle: {
            entry: 'updateState',
            on: {
              PLAY: {
                target: 'playing',
                actions: 'play',
              },
              SEEK: {
                actions: 'seek',
              },
              SET_SPEED: {
                actions: 'setSpeed',
              },
              TOGGLE_LOOP: {
                actions: 'toggleLoop',
              },
            },
          },
          playing: {
            entry: 'updateState',
            invoke: {
              id: 'frameUpdater',
              src: fromPromise(async ({ input }: { input: any }) => {
                const { instance } = input;

                return new Promise<void>((resolve) => {
                  const updateFrame = () => {
                    if (instance && typeof instance.currentFrame !== 'undefined') {
                      // Send frame update event
                      // This would be handled by the parent machine
                      resolve();
                    }
                    requestAnimationFrame(updateFrame);
                  };
                  updateFrame();
                });
              }),
              input: ({ context }) => ({
                instance: context.instance,
                config: context.config,
              }),
            },
            on: {
              PAUSE: {
                target: 'paused',
                actions: 'pause',
              },
              STOP: {
                target: 'idle',
                actions: 'stop',
              },
              SEEK: {
                target: 'seeking',
                actions: 'seek',
              },
              FRAME_UPDATE: {
                actions: 'updateFrameData',
              },
            },
          },
          paused: {
            entry: 'updateState',
            on: {
              PLAY: {
                target: 'playing',
                actions: 'play',
              },
              STOP: {
                target: 'idle',
                actions: 'stop',
              },
              SEEK: {
                actions: 'seek',
              },
            },
          },
          seeking: {
            entry: 'updateState',
            after: {
              100: {
                target: 'idle',
              },
            },
            on: {
              SEEK: {
                actions: 'seek',
              },
            },
          },
        },
        on: {
          SYNC_UPDATE: {
            actions: 'handleSyncUpdate',
            guard: ({ context }) => context.syncMode === 'global',
          },
          SET_SYNC_MODE: {
            actions: 'setSyncMode',
          },
          PLAYER_ERROR: {
            target: 'error',
            actions: 'setError',
          },
        },
      },
      error: {
        entry: ['updateState', 'logError'],
        states: {
          evaluating: {
            invoke: {
              id: 'evaluateRetry',
              src: 'evaluateRetryService',
              input: ({ context }) => ({
                playerId: context.config.id,
                error: context.error || 'Unknown error',
                playerType: context.config.type,
                retryCount: context.retryCount,
              }),
              onDone: {
                target: 'retryable',
                actions: 'setRetryAdvice',
              },
              onError: {
                target: 'permanent',
              },
            },
          },
          retryable: {
            on: {
              RETRY: {
                target: '#player.error.retrying',
                guard: 'canRetryPlayer',
              },
              AUTO_RETRY: {
                target: '#player.error.retrying',
                guard: 'shouldAutoRetry',
              },
              GIVE_UP: {
                target: 'permanent',
              },
            },
            after: {
              3000: {
                target: '#player.error.retrying',
                guard: 'shouldAutoRetry',
              },
            },
          },
          retrying: {
            invoke: {
              id: 'retryPlayer',
              src: 'retryPlayerService',
              input: ({ context }) => ({
                playerId: context.config.id,
                playerType: context.config.type,
                error: context.error || 'Unknown error',
                container: context.container,
                file: context.file,
                config: context.config,
              }),
              onDone: {
                target: '#player.ready.idle',
                actions: ['assignPlayerInstance', 'resetRetryCount', 'clearRetryState'],
              },
              onError: {
                target: 'evaluating',
                actions: ['setError', 'incrementRetryCount'],
              },
            },
          },
          permanent: {
            entry: 'markAsPermanentFailure',
            on: {
              INITIALIZE: {
                target: '#player.initializing',
                actions: ['resetRetryCount', 'assignInitializationData', 'clearRetryState'],
              },
              DISPOSE: {
                target: '#player.disposed',
              },
            },
          },
        },
        initial: 'evaluating',
        on: {
          INITIALIZE: {
            target: '#player.initializing',
            actions: ['resetRetryCount', 'assignInitializationData', 'clearRetryState'],
          },
          DISPOSE: {
            target: '#player.disposed',
          },
        },
      },
      disposed: {
        entry: 'disposePlayer',
        type: 'final',
      },
    },
    onDone: {
      actions: 'finalCleanup',
    },
    on: {
      DISPOSE: {
        target: '.disposed',
      },
    },
  },
  {
    actions: {
      assignInitializationData: assign({
        container: ({ event }) => (event as any).container,
        file: ({ event }) => (event as any).file,
        config: ({ event }) => (event as any).config,
        error: null,
      }),
      assignPlayerInstance: assign({
        instance: ({ event }) => (event as any).output.instance,
        state: ({ context }) => ({
          ...context.state,
          id: context.config.id,
          type: context.config.type,
          state: 'idle' as PlaybackState,
          speed: context.config.speed || 1,
          loop: context.config.loop || false,
        }),
      }),
      updateState: assign({
        state: ({ context }) => ({
          ...context.state,
          state: context.instance ? 'idle' : ('loading' as PlaybackState),
        }),
      }),
      play: ({ context }) => {
        if (context.instance) {
          context.instance.play();
        }
      },
      pause: ({ context }) => {
        if (context.instance) {
          context.instance.pause();
        }
      },
      stop: ({ context }) => {
        if (context.instance) {
          context.instance.stop();
        }
      },
      seek: ({ context, event }) => {
        const { frame } = event as any;
        if (context.instance) {
          if (typeof frame !== 'undefined') {
            context.instance.setFrame(frame);
          }
        }
      },
      setSpeed: assign({
        state: ({ context, event }) => ({
          ...context.state,
          speed: (event as any).speed,
        }),
      }),
      toggleLoop: assign({
        state: ({ context }) => ({
          ...context.state,
          loop: !context.state.loop,
        }),
      }),
      setSyncMode: assign({
        syncMode: ({ event }) => (event as any).mode,
      }),
      handleSyncUpdate: ({ context, event }) => {
        const syncEvent = (event as any).event;

        if (context.instance && context.syncMode === 'global') {
          switch (syncEvent.type) {
            case 'play':
              context.instance.play();
              break;
            case 'pause':
              context.instance.pause();
              break;
            case 'seek':
              if (syncEvent.data?.frame !== undefined) {
                context.instance.setFrame(syncEvent.data.frame);
              }
              break;
          }
        }
      },
      updateFrameData: assign({
        state: ({ context, event }) => ({
          ...context.state,
          currentFrame: (event as any).frame,
          currentTime: (event as any).time,
          lastSyncTime: Date.now(),
        }),
      }),
      setError: assign({
        error: ({ event }) => (event as any).error || 'An error occurred',
        state: ({ context }) => ({
          ...context.state,
          state: 'error' as PlaybackState,
          error: (event as any).error || 'An error occurred',
        }),
      }),
      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1,
      }),
      resetRetryCount: assign({
        retryCount: 0,
        error: null,
      }),
      setRetryAdvice: assign({
        retryAdvice: ({ event }) => (event as any).output.advice,
      }),
      markAsPermanentFailure: assign({
        isPermanentFailure: true,
        state: ({ context }) => ({
          ...context.state,
          state: 'error' as PlaybackState,
        }),
      }),
      clearRetryState: ({ context }) => {
        globalRetryService.clearRetryState(context.config.id);
      },
      logError: ({ context }) => {
        console.error(`💥 [PLAYER-${context.config.id.slice(-6)}] Error:`, context.error);
        console.error(
          `💥 [PLAYER-${context.config.id.slice(-6)}] Retry count:`,
          context.retryCount
        );
      },
      notifyReady: () => {},
      disposePlayer: ({ context }) => {
        if (context.instance) {
          try {
            context.instance.destroy();
          } catch (error) {
            console.error('Error disposing player:', error);
          }
        }
        // Clear container reference
        if (context.container) {
          const canvas = context.container.querySelector('canvas');
          if (canvas) {
            canvas.remove();
          }
        }
        console.log(`🧹 [PLAYER] Player ${context.config.id} disposed`);
      },
      finalCleanup: ({ context }) => {
        console.log(`🏁 [PLAYER] Final cleanup for ${context.config.id}`);
        globalRetryService.clearRetryState(context.config.id);
      },
    },
    guards: {
      canRetryPlayer: ({ context }) => {
        return globalRetryService.shouldRetry(
          context.config.id,
          context.error || 'Unknown error',
          context.config.type
        );
      },
      shouldAutoRetry: ({ context }) => {
        const retryState = globalRetryService.getRetryState(context.config.id);
        return !!(retryState && retryState.totalRetries === 0); // Only auto-retry on first failure
      },
    },
    actors: {
      evaluateRetryService: fromPromise(
        async ({
          input,
        }: {
          input: { playerId: string; error: string; playerType: any; retryCount: number };
        }) => {
          const { playerId, error, playerType } = input;
          const advice = globalRetryService.getRetryAdvice(playerId, error, playerType);
          const canRetry = globalRetryService.shouldRetry(playerId, error, playerType);

          return {
            canRetry,
            advice,
          };
        }
      ),
      retryPlayerService: fromPromise(
        async ({
          input,
        }: {
          input: {
            playerId: string;
            playerType: any;
            error: string;
            container: any;
            file: any;
            config: any;
          };
        }) => {
          const { playerId, playerType, error } = input;

          return await globalRetryService.executeRetry(
            playerId,
            playerType,
            async () => {
              // This would be replaced with actual player initialization logic
              // For now, simulate initialization
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Simulate success/failure based on error type
              if (error.toLowerCase().includes('network') && Math.random() > 0.3) {
                throw new Error('Network still unavailable');
              }

              return { instance: {} }; // Mock instance
            },
            error
          );
        }
      ),
    },
  }
);
