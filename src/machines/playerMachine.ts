import { createMachine, assign, fromPromise } from 'xstate';
import type { PlayerContext, PlayerEvent } from '../types/machines';
import type { PlayerState, PlaybackState } from '../types';

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
                const { instance, config } = input;

                return new Promise<void>((resolve) => {
                  const updateFrame = () => {
                    if (instance && typeof instance.currentFrame !== 'undefined') {
                      const currentFrame = Math.floor(instance.currentFrame);
                      const totalFrames = instance.totalFrames || 0;
                      const currentTime = currentFrame / 30;
                      const duration = totalFrames / 30;

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
        entry: 'updateState',
        on: {
          RETRY: {
            target: 'initializing',
            actions: 'incrementRetryCount',
            guard: ({ context }) => context.retryCount < 3,
          },
          INITIALIZE: {
            target: 'initializing',
            actions: ['resetRetryCount', 'assignInitializationData'],
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
        state: ({ context, event }) => ({
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
        const { frame, time } = event as any;
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
        }),
      }),
      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1,
      }),
      resetRetryCount: assign({
        retryCount: 0,
        error: null,
      }),
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
      },
    },
  }
);
