import { createMachine, assign, fromPromise } from 'xstate';
import { parseLottieFile } from '../services/lottieParser';
import type { LottieAnimation, LoadAnimationOutput } from '../services/lottieParser';

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'seeking'
  | 'error';

export type SynchronizationMode = 'global' | 'individual' | 'mixed';

export interface SyncPlayer {
  id: string;
  type: 'lottie-web' | 'dotlottie';
  status: 'loading' | 'ready' | 'error';
  lastSyncTime: number;
  errorMessage?: string;
}

export interface SyncMachineContext {
  // Parsed animation data
  animationData: LottieAnimation | null;
  sourceFormat: 'json' | 'lottie' | null;
  dotLottieSrcUrl?: string;
  assetsMap?: Record<string, string>;

  // Animation metadata
  metadata: {
    frameRate: number;
    totalFrames: number;
    duration: number;
    width: number;
    height: number;
    version?: string;
    name?: string;
  } | null;

  // Player management
  players: SyncPlayer[];
  playbackState: PlaybackState;

  // Playback controls
  currentFrame: number;
  currentTime: number;
  speed: number;
  loop: boolean;
  synchronizationMode: SynchronizationMode;

  // State tracking
  initializationStatus: 'idle' | 'loading' | 'initializing' | 'ready' | 'error';
  lastError: string | null;

  // Performance tracking
  lastSyncTime: number;
  syncLatency: number;
  lastFrameUpdateTime: number;
  masterPlayerId: string | null;
}

export type SyncMachineEvent =
  | { type: 'LOAD_FILE'; file: File }
  | { type: 'INIT_PLAYER'; playerId: string; playerType: 'lottie-web' | 'dotlottie' }
  | { type: 'PLAYER_READY'; playerId: string }
  | { type: 'PLAYER_ERROR'; playerId: string; error: string }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; frame: number; time?: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TOGGLE_LOOP' }
  | { type: 'SET_SYNC_MODE'; mode: SynchronizationMode }
  | { type: 'FRAME_UPDATE'; frame: number; time: number; playerId?: string }
  | { type: 'ANIMATION_COMPLETE'; playerId?: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

interface LoadAnimationInput {
  file: File;
}

interface InitializePlayersInput {
  animationData: LottieAnimation;
  players: SyncPlayer[];
}

interface InitializePlayersOutput {
  initializedPlayers: SyncPlayer[];
  failures: string[];
  totalTime: number;
}

// Load animation service
export const loadAnimation = fromPromise<LoadAnimationOutput, LoadAnimationInput>(
  async ({ input }) => {
    const { file } = input;

    console.log('🔄 [SYNC-MACHINE] Loading animation file:', file.name);

    try {
      // Use unified parser
      const parsed = await parseLottieFile(file);

      console.log('✅ [SYNC-MACHINE] Animation parsed successfully:', {
        format: parsed.sourceFormat,
        metadata: parsed.metadata,
        hasAssets: !!parsed.assetsMap,
        assetsCount: Object.keys(parsed.assetsMap || {}).length,
      });

      return {
        animationData: parsed.animationData,
        sourceFormat: parsed.sourceFormat,
        dotLottieSrcUrl: parsed.originalBlobUrl,
        assetsMap: parsed.assetsMap,
        metadata: parsed.metadata,
      };
    } catch (error) {
      console.error('❌ [SYNC-MACHINE] Failed to load animation:', error);
      throw new Error(
        `Failed to load animation: ${error instanceof Error ? error.message : error}`
      );
    }
  }
);

// Initialize players service
export const initializeAllPlayers = fromPromise<InitializePlayersOutput, InitializePlayersInput>(
  async ({ input }) => {
    const { players } = input;

    // Mark only new players as loading - React components handle actual initialization
    const initializedPlayers = players.map((player) => ({
      ...player,
      status: player.status === 'ready' ? ('ready' as const) : ('loading' as const),
      lastSyncTime: Date.now(),
    }));

    return {
      initializedPlayers,
      failures: [],
      totalTime: 0,
    };
  }
);

const initialContext: SyncMachineContext = {
  animationData: null,
  sourceFormat: null,
  dotLottieSrcUrl: undefined,
  assetsMap: undefined,
  metadata: null,
  players: [],
  playbackState: 'idle',
  currentFrame: 0,
  currentTime: 0,
  speed: 1,
  loop: false,
  synchronizationMode: 'global',
  initializationStatus: 'idle',
  lastError: null,
  lastSyncTime: 0,
  syncLatency: 0,
  lastFrameUpdateTime: 0,
  masterPlayerId: null,
};

export const syncMachine = createMachine(
  {
    id: 'syncMachine',
    types: {} as {
      context: SyncMachineContext;
      events: SyncMachineEvent;
    },
    context: initialContext,
    initial: 'idle',
    states: {
      idle: {
        on: {
          LOAD_FILE: {
            target: 'loadingFile',
          },
          INIT_PLAYER: {
            actions: 'addPlayer',
          },
          RESET: {
            actions: 'resetMachine',
          },
        },
      },

      loadingFile: {
        invoke: {
          id: 'loadAnimation',
          src: loadAnimation,
          input: ({ event }) => ({ file: (event as any).file }),
          onDone: {
            target: 'fileLoaded',
            actions: 'setAnimationData',
          },
          onError: {
            target: 'error',
            actions: 'setError',
          },
        },
      },

      fileLoaded: {
        always: [
          {
            target: 'initializingPlayers',
            guard: 'hasPlayers',
          },
          {
            target: 'ready',
          },
        ],
        on: {
          INIT_PLAYER: {
            target: 'initializingPlayers',
            actions: 'addPlayer',
          },
        },
      },

      initializingPlayers: {
        invoke: {
          id: 'initializePlayers',
          src: initializeAllPlayers,
          input: ({ context }) => ({
            animationData: context.animationData!,
            players: context.players,
          }),
          onDone: {
            actions: 'setPlayersInitialized',
          },
          onError: {
            target: 'error',
            actions: 'setError',
          },
        },
        always: [
          {
            target: 'ready',
            guard: 'allPlayersReady',
          },
        ],
        on: {
          PLAYER_READY: {
            actions: 'markPlayerReady',
          },
          PLAYER_ERROR: {
            actions: 'markPlayerError',
          },
        },
      },

      ready: {
        initial: 'stopped',
        states: {
          stopped: {
            entry: 'resetPlayback',
            on: {
              PLAY: {
                target: 'playing',
                actions: 'startPlayback',
              },
            },
          },
          playing: {
            entry: 'syncAllPlayers',
            on: {
              PAUSE: {
                target: 'paused',
                actions: 'pausePlayback',
              },
              STOP: {
                target: 'stopped',
                actions: 'stopPlayback',
              },
              SEEK: {
                target: 'seeking',
                actions: 'seekToFrame',
              },
              ANIMATION_COMPLETE: [
                {
                  target: 'stopped',
                  guard: 'shouldStopOnComplete',
                  actions: 'handleAnimationComplete',
                },
                {
                  actions: 'handleLoopComplete',
                },
              ],
            },
          },
          paused: {
            on: {
              PLAY: {
                target: 'playing',
                actions: 'resumePlayback',
              },
              STOP: {
                target: 'stopped',
                actions: 'stopPlayback',
              },
              SEEK: {
                target: 'seeking',
                actions: 'seekToFrame',
              },
            },
          },
          seeking: {
            entry: 'syncAllPlayers',
            after: {
              100: [
                {
                  target: 'playing',
                  guard: 'wasPlaying',
                },
                {
                  target: 'paused',
                },
              ],
            },
            on: {
              SEEK: {
                actions: 'seekToFrame',
              },
            },
          },
        },
        on: {
          LOAD_FILE: {
            target: 'loadingFile',
            actions: 'cleanupCurrentFile',
          },
          INIT_PLAYER: {
            actions: 'addPlayer',
            // Don't transition back to initializingPlayers - stay in ready
          },
          REMOVE_PLAYER: {
            actions: 'removePlayer',
          },
          PLAYER_READY: {
            actions: 'markPlayerReady',
          },
          PLAYER_ERROR: {
            actions: 'markPlayerError',
          },
          SET_SPEED: {
            actions: ['setSpeed', 'syncAllPlayers'],
          },
          TOGGLE_LOOP: {
            actions: ['toggleLoop', 'syncAllPlayers'],
          },
          SET_SYNC_MODE: {
            actions: 'setSyncMode',
          },
          FRAME_UPDATE: {
            actions: 'updateFrameFromPlayer',
          },
          ANIMATION_COMPLETE: [
            {
              guard: 'shouldStopOnComplete',
              actions: 'handleAnimationComplete',
            },
            {
              actions: 'handleLoopComplete',
            },
          ],
        },
      },

      error: {
        on: {
          CLEAR_ERROR: {
            target: 'idle',
            actions: 'clearError',
          },
          RESET: {
            target: 'idle',
            actions: ['clearError', 'resetMachine'],
          },
          LOAD_FILE: {
            target: 'loadingFile',
            actions: 'clearError',
          },
        },
      },
    },
  },
  {
    actions: {
      setAnimationData: assign({
        animationData: ({ event }) => (event as any).output.animationData,
        sourceFormat: ({ event }) => (event as any).output.sourceFormat,
        dotLottieSrcUrl: ({ event }) => (event as any).output.dotLottieSrcUrl,
        assetsMap: ({ event }) => (event as any).output.assetsMap,
        metadata: ({ event }) => (event as any).output.metadata,
        initializationStatus: 'ready',
        currentFrame: 0,
        currentTime: 0,
      }),

      addPlayer: assign({
        players: ({ context, event }) => {
          const { playerId, playerType } = event as any;
          const newPlayer: SyncPlayer = {
            id: playerId || crypto.randomUUID(),
            type: playerType,
            status: 'loading',
            lastSyncTime: Date.now(),
          };
          return [...context.players, newPlayer];
        },
      }),

      removePlayer: assign({
        players: ({ context, event }) => {
          const { playerId } = event as any;
          return context.players.filter((p) => p.id !== playerId);
        },
      }),

      markPlayerReady: assign({
        players: ({ context, event }) => {
          const { playerId } = event as any;
          return context.players.map((player) =>
            player.id === playerId
              ? {
                  ...player,
                  status: 'ready' as const,
                  errorMessage: undefined,
                  lastSyncTime: Date.now(),
                }
              : player
          );
        },
      }),

      markPlayerError: assign({
        players: ({ context, event }) => {
          const { playerId, error } = event as any;
          return context.players.map((player) =>
            player.id === playerId
              ? {
                  ...player,
                  status: 'error' as const,
                  errorMessage: error,
                  lastSyncTime: Date.now(),
                }
              : player
          );
        },
      }),

      setPlayersInitialized: assign({
        players: ({ event }) => (event as any).output.initializedPlayers,
        initializationStatus: 'ready',
      }),

      startPlayback: assign({
        playbackState: 'playing',
        lastSyncTime: () => Date.now(),
      }),

      pausePlayback: assign({
        playbackState: 'paused',
        lastSyncTime: () => Date.now(),
      }),

      stopPlayback: assign({
        playbackState: 'stopped',
        currentFrame: 0,
        currentTime: 0,
        lastSyncTime: () => Date.now(),
      }),

      resumePlayback: assign({
        playbackState: 'playing',
        lastSyncTime: () => Date.now(),
      }),

      resetPlayback: assign({
        playbackState: 'stopped',
        currentFrame: 0,
        currentTime: 0,
      }),

      seekToFrame: assign({
        currentFrame: ({ event }) => (event as any).frame,
        currentTime: ({ event, context }) => {
          const frame = (event as any).frame;
          const time = (event as any).time;
          if (time !== undefined) return time;
          if (context.metadata) {
            return frame / context.metadata.frameRate;
          }
          return 0;
        },
        playbackState: 'seeking',
        lastSyncTime: () => Date.now(),
      }),

      setSpeed: assign({
        speed: ({ event }) => (event as any).speed,
        lastSyncTime: () => Date.now(),
      }),

      toggleLoop: assign({
        loop: ({ context }) => !context.loop,
        lastSyncTime: () => Date.now(),
      }),

      setSyncMode: assign({
        synchronizationMode: ({ event }) => (event as any).mode,
      }),

      updateFrameFromPlayer: assign({
        currentFrame: ({ event, context }) => {
          const { frame, playerId } = event as any;
          const now = Date.now();

          // Throttle updates to 60fps max (16.67ms)
          if (now - context.lastFrameUpdateTime < 16.67) {
            return context.currentFrame;
          }

          // Set master player on first update if not set
          const masterPlayerId =
            context.masterPlayerId || context.players.find((p) => p.status === 'ready')?.id || null;

          // Only accept updates from master player
          if (playerId !== masterPlayerId) {
            return context.currentFrame;
          }

          // Additional throttling: only update if frame changed significantly
          if (Math.abs(frame - context.currentFrame) >= 0.5) {
            return frame;
          }

          return context.currentFrame;
        },
        currentTime: ({ event, context }) => {
          const { time, playerId } = event as any;
          const now = Date.now();

          // Same throttling and master player logic for time updates
          if (now - context.lastFrameUpdateTime < 16.67) {
            return context.currentTime;
          }

          const masterPlayerId =
            context.masterPlayerId || context.players.find((p) => p.status === 'ready')?.id || null;

          if (playerId !== masterPlayerId) {
            return context.currentTime;
          }

          return time;
        },
        masterPlayerId: ({ context }) => {
          // Set master player if not already set
          return (
            context.masterPlayerId || context.players.find((p) => p.status === 'ready')?.id || null
          );
        },
        lastFrameUpdateTime: () => Date.now(),
        lastSyncTime: () => Date.now(),
      }),

      syncAllPlayers: ({ context }) => {
        console.log('🔄 [SYNC-MACHINE] Syncing all players:', {
          playersCount: context.players.length,
          frame: context.currentFrame,
          time: context.currentTime,
          speed: context.speed,
          loop: context.loop,
          mode: context.synchronizationMode,
        });
      },

      setError: assign({
        lastError: ({ event }) => (event as any).error?.message || 'An error occurred',
        initializationStatus: 'error',
      }),

      clearError: assign({
        lastError: null,
        initializationStatus: 'idle',
      }),

      cleanupCurrentFile: ({ context }) => {
        // Cleanup blob URLs
        if (context.dotLottieSrcUrl) {
          URL.revokeObjectURL(context.dotLottieSrcUrl);
        }
        if (context.assetsMap) {
          Object.values(context.assetsMap).forEach((url) => {
            URL.revokeObjectURL(url);
          });
        }
      },

      handleAnimationComplete: assign({
        playbackState: 'stopped',
        currentFrame: 0,
        currentTime: 0,
        lastSyncTime: () => Date.now(),
      }),

      handleLoopComplete: ({ context }) => {
        console.log('🔄 [SYNC-MACHINE] Loop complete, continuing playback');
        // For looped animations, we don't change state
      },

      resetMachine: assign(() => initialContext),
    },

    guards: {
      hasPlayers: ({ context }) => context.players.length > 0,
      wasPlaying: ({ context }) => context.playbackState === 'playing',
      allPlayersReady: ({ context }) => {
        return (
          context.players.length > 0 && context.players.every((player) => player.status === 'ready')
        );
      },
      shouldStopOnComplete: ({ context }) => {
        // Stop on complete only if loop is false
        return !context.loop;
      },
    },
  }
);

export type SyncActorRef = any; // This will be properly typed when used with useMachine
