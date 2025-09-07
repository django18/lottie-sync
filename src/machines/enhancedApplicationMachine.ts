import { createMachine, assign, fromPromise } from 'xstate';
import type { ApplicationContext, ApplicationEvent } from '../types/machines';
import type { LottieFile, GlobalControls } from '../types';

const initialGlobalControls: GlobalControls = {
  isPlaying: false,
  isPaused: false,
  currentFrame: 0,
  totalFrames: 0,
  currentTime: 0,
  duration: 0,
  speed: 1,
  loop: false,
  synchronizationMode: 'global',
};

// Enhanced Application Machine with hierarchical states
export const enhancedApplicationMachine = createMachine(
  {
    id: 'enhancedApplication',
    types: {} as {
      context: ApplicationContext;
      events: ApplicationEvent;
    },
    context: {
      files: [],
      selectedFile: null,
      players: [],
      globalControls: initialGlobalControls,
      performanceMetrics: [],
      error: null,
      dragActive: false,
    },
    initial: 'initialization',
    states: {
      // Initial setup and validation
      initialization: {
        initial: 'checkingEnvironment',
        states: {
          checkingEnvironment: {
            invoke: {
              src: fromPromise(async () => {
                // Check browser capabilities
                const capabilities = {
                  webAssembly: typeof WebAssembly !== 'undefined',
                  canvas: typeof CanvasRenderingContext2D !== 'undefined',
                  fileApi: typeof FileReader !== 'undefined',
                  dragAndDrop: 'ondrop' in window,
                };

                console.log('Browser capabilities:', capabilities);
                return capabilities;
              }),
              onDone: {
                target: 'ready',
                actions: assign({
                  // Store capabilities if needed
                  // capabilities: ({ event }) => event.output,
                }),
              },
              onError: {
                target: '#enhancedApplication.error',
                actions: assign({
                  error: () => 'Failed to initialize application environment',
                }),
              },
            },
          },
          ready: {
            always: '#enhancedApplication.idle',
          },
        },
      },

      // Main application states
      idle: {
        initial: 'empty',
        states: {
          empty: {
            // No files loaded
            on: {
              UPLOAD_FILE: {
                target: '#enhancedApplication.fileManagement.uploading.single',
              },
              DROP_FILES: {
                target: '#enhancedApplication.fileManagement.uploading.multiple',
                guard: 'hasValidDragFiles',
              },
            },
          },
          withFiles: {
            // Files are loaded but no players
            on: {
              ADD_PLAYER: {
                target: '#enhancedApplication.playerManagement.adding',
                guard: 'canAddPlayer',
              },
            },
          },
          withPlayersAndFiles: {
            // Both files and players are available
            type: 'parallel',
            states: {
              playback: {
                initial: 'stopped',
                states: {
                  stopped: {
                    on: {
                      GLOBAL_PLAY: {
                        target: 'playing',
                        actions: 'globalPlay',
                      },
                    },
                  },
                  playing: {
                    on: {
                      GLOBAL_PAUSE: {
                        target: 'paused',
                        actions: 'globalPause',
                      },
                      GLOBAL_STOP: {
                        target: 'stopped',
                        actions: 'globalStop',
                      },
                    },
                  },
                  paused: {
                    on: {
                      GLOBAL_PLAY: {
                        target: 'playing',
                        actions: 'globalPlay',
                      },
                      GLOBAL_STOP: {
                        target: 'stopped',
                        actions: 'globalStop',
                      },
                    },
                  },
                },
              },
              synchronization: {
                initial: 'global',
                states: {
                  global: {
                    on: {
                      TOGGLE_SYNC_MODE: {
                        target: 'individual',
                        actions: 'toggleSyncMode',
                      },
                    },
                  },
                  individual: {
                    on: {
                      TOGGLE_SYNC_MODE: {
                        target: 'global',
                        actions: 'toggleSyncMode',
                      },
                    },
                  },
                  mixed: {
                    // Some players in sync, others individual
                    on: {
                      TOGGLE_SYNC_MODE: {
                        target: 'global',
                        actions: 'toggleSyncMode',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        on: {
          UPLOAD_FILE: {
            target: 'fileManagement.uploading.single',
          },
          DROP_FILES: {
            target: 'fileManagement.uploading.multiple',
          },
          SELECT_FILE: {
            actions: ['selectFile', 'transitionToAppropriateState'],
          },
          REMOVE_FILE: {
            actions: ['removeFile', 'transitionToAppropriateState'],
            guard: 'canRemoveFile',
          },
          ADD_PLAYER: {
            target: 'playerManagement.adding',
            guard: 'canAddPlayer',
          },
          REMOVE_PLAYER: {
            actions: ['removePlayer', 'transitionToAppropriateState'],
            guard: 'canRemovePlayer',
          },
          DRAG_ENTER: {
            actions: 'setDragActive',
          },
          DRAG_LEAVE: {
            actions: 'clearDragActive',
          },
          GLOBAL_SEEK: {
            actions: 'globalSeek',
          },
          GLOBAL_SPEED_CHANGE: {
            actions: 'globalSpeedChange',
          },
          GLOBAL_LOOP_TOGGLE: {
            actions: 'globalLoopToggle',
          },
          UPDATE_GLOBAL_CONTROLS: {
            actions: 'updateGlobalControls',
          },
          UPDATE_FRAME_TIME: {
            actions: 'updateFrameTime',
          },
          PERFORMANCE_UPDATE: {
            actions: 'updatePerformanceMetrics',
          },
        },
      },

      // File management with substates
      fileManagement: {
        initial: 'uploading',
        states: {
          uploading: {
            initial: 'single',
            states: {
              single: {
                invoke: {
                  id: 'uploadFile',
                  src: fromPromise(async ({ input }: { input: { file: File } }) => {
                    const { file } = input;
                    return new Promise<LottieFile>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const lottieFile: LottieFile = {
                            id: crypto.randomUUID(),
                            name: file.name,
                            url: reader.result as string,
                            file,
                            type: 'lottie',
                          };

                          // Basic validation for .lottie files
                          resolve(lottieFile);
                        } catch (error) {
                          reject(error);
                        }
                      };
                      reader.onerror = () => reject(new Error('Failed to read file'));
                      reader.readAsDataURL(file);
                    });
                  }),
                  input: ({ event }) => ({ file: (event as any).file }),
                  onDone: {
                    target: '#enhancedApplication.idle',
                    actions: ['addFile', 'transitionToAppropriateState'],
                  },
                  onError: {
                    target: '#enhancedApplication.error',
                    actions: 'setError',
                  },
                },
              },
              multiple: {
                invoke: {
                  id: 'uploadFiles',
                  src: fromPromise(async ({ input }: { input: { files: File[] } }) => {
                    const { files } = input;
                    const lottieFiles: LottieFile[] = [];
                    const errors: string[] = [];

                    for (const file of files) {
                      try {
                        const result = await new Promise<LottieFile>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            try {
                              const lottieFile: LottieFile = {
                                id: crypto.randomUUID(),
                                name: file.name,
                                url: reader.result as string,
                                file,
                                type: 'lottie',
                              };

                              // Basic validation for .lottie files
                              resolve(lottieFile);
                            } catch (error) {
                              reject(error);
                            }
                          };
                          reader.onerror = () => reject(new Error('Failed to read file'));
                          reader.readAsDataURL(file);
                        });
                        lottieFiles.push(result);
                      } catch (error) {
                        console.error(`Failed to process file ${file.name}:`, error);
                        errors.push(`${file.name}: ${error}`);
                      }
                    }

                    return { files: lottieFiles, errors };
                  }),
                  input: ({ event }) => ({ files: (event as any).files }),
                  onDone: {
                    target: '#enhancedApplication.idle',
                    actions: ['addFiles', 'clearDragActive', 'transitionToAppropriateState'],
                  },
                  onError: {
                    target: '#enhancedApplication.error',
                    actions: ['setError', 'clearDragActive'],
                  },
                },
              },
            },
          },
        },
      },

      // Player management with substates
      playerManagement: {
        initial: 'adding',
        states: {
          adding: {
            entry: 'addPlayer',
            always: {
              target: '#enhancedApplication.idle',
              actions: 'transitionToAppropriateState',
            },
          },
          initializing: {
            invoke: {
              id: 'initializePlayers',
              src: 'playerInitializationService',
              input: ({ context }) => ({
                players: context.players,
                selectedFile: context.selectedFile,
              }),
              onDone: {
                target: '#enhancedApplication.idle.withPlayersAndFiles',
                actions: 'handlePlayersInitialized',
              },
              onError: {
                target: '#enhancedApplication.error',
                actions: 'setError',
              },
            },
            on: {
              PLAYER_READY: {
                actions: 'markPlayerReady',
              },
              PLAYER_ERROR: {
                actions: 'markPlayerError',
              },
            },
          },
        },
      },

      // Error states with recovery options
      error: {
        initial: 'displaying',
        states: {
          displaying: {
            on: {
              CLEAR_ERROR: {
                target: 'recovering',
                actions: 'clearError',
              },
              RETRY: {
                target: 'recovering',
                guard: 'canRetry',
              },
            },
          },
          recovering: {
            invoke: {
              id: 'recoveryService',
              src: 'recoveryService',
              onDone: {
                target: '#enhancedApplication.idle',
                actions: 'handleRecoverySuccess',
              },
              onError: {
                target: 'displaying',
                actions: 'handleRecoveryFailure',
              },
            },
          },
        },
      },
    },
  },
  {
    actions: {
      // File management actions
      addFile: assign({
        files: ({ context, event }) => [...context.files, (event as any).output],
        selectedFile: ({ context, event }) => context.selectedFile || (event as any).output,
      }),
      addFiles: assign({
        files: ({ context, event }) => [...context.files, ...(event as any).output.files],
        selectedFile: ({ context, event }) =>
          context.selectedFile || (event as any).output.files[0],
      }),
      selectFile: assign({
        selectedFile: ({ context, event }) => {
          const fileId = (event as any).fileId;
          return context.files.find((f) => f.id === fileId) || null;
        },
      }),
      removeFile: assign({
        files: ({ context, event }) => {
          const fileId = (event as any).fileId;
          return context.files.filter((f) => f.id !== fileId);
        },
        selectedFile: ({ context, event }) => {
          const fileId = (event as any).fileId;
          if (context.selectedFile?.id === fileId) {
            // Select first remaining file or null
            const remaining = context.files.filter((f) => f.id !== fileId);
            return remaining.length > 0 ? remaining[0] : null;
          }
          return context.selectedFile;
        },
      }),

      // Player management actions
      addPlayer: assign({
        players: ({ context, event }) => {
          const { playerType, config } = event as any;
          const newPlayer = {
            id: crypto.randomUUID(),
            type: playerType,
            instance: null,
            container: null as any,
            config: {
              id: crypto.randomUUID(),
              type: playerType,
              autoplay: false,
              loop: false,
              speed: 1,
              renderer: 'canvas',
              ...config,
            },
          };
          return [...context.players, newPlayer];
        },
      }),
      removePlayer: assign({
        players: ({ context, event }) => {
          const playerId = (event as any).playerId;
          return context.players.filter((p) => p.id !== playerId);
        },
      }),

      // Global control actions
      globalPlay: assign({
        globalControls: ({ context }) => ({
          ...context.globalControls,
          isPlaying: true,
          isPaused: false,
        }),
      }),
      globalPause: assign({
        globalControls: ({ context }) => ({
          ...context.globalControls,
          isPlaying: false,
          isPaused: true,
        }),
      }),
      globalStop: assign({
        globalControls: ({ context }) => ({
          ...context.globalControls,
          isPlaying: false,
          isPaused: false,
          currentFrame: 0,
          currentTime: 0,
        }),
      }),
      globalSeek: assign({
        globalControls: ({ context, event }) => ({
          ...context.globalControls,
          currentFrame: (event as any).frame,
          currentTime:
            ((event as any).frame / context.globalControls.totalFrames) *
            context.globalControls.duration,
        }),
      }),
      globalSpeedChange: assign({
        globalControls: ({ context, event }) => ({
          ...context.globalControls,
          speed: (event as any).speed,
        }),
      }),
      globalLoopToggle: assign({
        globalControls: ({ context }) => ({
          ...context.globalControls,
          loop: !context.globalControls.loop,
        }),
      }),
      toggleSyncMode: assign({
        globalControls: ({ context }) => ({
          ...context.globalControls,
          synchronizationMode:
            context.globalControls.synchronizationMode === 'global'
              ? ('individual' as const)
              : ('global' as const),
        }),
      }),

      // State transition logic
      transitionToAppropriateState: ({ context }) => {
        // This action will trigger the machine to re-evaluate guards
        // The actual state transition is handled by the guard logic
        console.log('Evaluating appropriate state transition:', {
          filesCount: context.files.length,
          playersCount: context.players.length,
          hasSelectedFile: !!context.selectedFile,
        });
      },

      // Utility actions
      setError: assign({
        error: ({ event }) => (event as any).error?.message || 'An error occurred',
      }),
      clearError: assign({
        error: null,
      }),
      setDragActive: assign({
        dragActive: true,
      }),
      clearDragActive: assign({
        dragActive: false,
      }),
      updateGlobalControls: assign({
        globalControls: ({ context, event }) => ({
          ...context.globalControls,
          totalFrames: (event as any).totalFrames,
          duration: (event as any).duration,
          currentFrame: 0, // Initialize to frame 0 when setting up global controls
        }),
      }),
      updateFrameTime: assign({
        globalControls: ({ context, event }) => ({
          ...context.globalControls,
          currentFrame: (event as any).frame,
          currentTime: (event as any).time,
        }),
      }),
      updatePerformanceMetrics: assign({
        performanceMetrics: ({ context, event }) => {
          const metrics = (event as any).metrics;
          const newMetrics = [...context.performanceMetrics, metrics];
          return newMetrics.slice(-10); // Keep only recent metrics
        },
      }),
      markPlayerReady: () => {
        console.log('Player marked as ready');
      },
      markPlayerError: () => {
        console.log('Player marked as error');
      },
      handleRecoverySuccess: assign({
        error: null,
      }),
      handleRecoveryFailure: assign({
        error: ({ event }) =>
          `Recovery failed: ${(event as any).error?.message || 'Unknown error'}`,
      }),
      handlePlayersInitialized: assign({
        players: ({ event }) => (event as any).output.initializedPlayers,
      }),
    },

    guards: {
      hasValidFile: ({ context }) => context.selectedFile !== null,
      hasFiles: ({ context }) => context.files.length > 0,
      hasPlayers: ({ context }) => context.players.length > 0,
      canAddPlayer: ({ context }) => context.players.length < 10, // Reasonable limit
      isValidPlayerType: ({ event }) => {
        const playerType = (event as any).playerType;
        return ['dotlottie', 'lottie-web'].includes(playerType);
      },
      hasFilesAndPlayers: ({ context }) => context.files.length > 0 && context.players.length > 0,
      canRemoveFile: ({ context, event }) => {
        const fileId = (event as any).fileId;
        return context.files.some((f) => f.id === fileId);
      },
      canRemovePlayer: ({ context, event }) => {
        const playerId = (event as any).playerId;
        return context.players.some((p) => p.id === playerId);
      },
      isNotMaxPlayers: ({ context }) => context.players.length < 50, // Max players limit
      hasValidDragFiles: ({ event }) => {
        const files = (event as any).files;
        return (
          Array.isArray(files) && files.length > 0 && files.every((file) => file instanceof File)
        );
      },
      canRetry: ({ context }) => {
        // Allow retry if error isn't a validation error
        return context.error !== null && !context.error.includes('validation');
      },
    },

    actors: {
      recoveryService: fromPromise(async () => {
        // Simple recovery - just wait a bit and then resolve
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { recovered: true };
      }),
      playerInitializationService: fromPromise(
        async ({ input }: { input: { players: any[]; selectedFile: any } }) => {
          const { players } = input;
          console.log('🎬 [APP] Initializing players:', {
            playerCount: players.length,
          });

          // Simulate initialization time
          await new Promise((resolve) => setTimeout(resolve, 100));

          return {
            initializedPlayers: players.map((player) => ({
              ...player,
              status: 'ready',
            })),
          };
        }
      ),
    },
  }
);
