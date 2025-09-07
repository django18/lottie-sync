import { createMachine, assign } from 'xstate';
import type { SyncCoordinatorContext, SyncCoordinatorEvent } from '../types/machines';
import type { SyncEvent } from '../types';

export const syncCoordinatorMachine = createMachine(
  {
    id: 'syncCoordinator',
    types: {} as {
      context: SyncCoordinatorContext;
      events: SyncCoordinatorEvent;
    },
    context: {
      masterPlayerId: null,
      syncMode: 'global',
      syncEvents: [],
      playerRefs: new Map(),
      syncThreshold: 16.67,
      maxLatency: 50,
      performanceMode: 'quality',
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          REGISTER_PLAYER: {
            actions: 'registerPlayer',
            target: 'coordinating',
          },
          SET_SYNC_MODE: {
            actions: 'setSyncMode',
          },
          UPDATE_PERFORMANCE_MODE: {
            actions: 'updatePerformanceMode',
          },
        },
      },
      coordinating: {
        initial: 'monitoring',
        states: {
          monitoring: {
            invoke: {
              id: 'syncMonitor',
              src: 'syncMonitorService',
            },
            on: {
              BROADCAST_EVENT: {
                actions: 'broadcastEvent',
              },
              VALIDATE_SYNC: {
                target: 'validating',
              },
              SYNC_DRIFT_DETECTED: {
                target: 'correcting',
                actions: 'logSyncDrift',
              },
            },
          },
          validating: {
            invoke: {
              id: 'validateSync',
              src: 'validateSyncService',
              onDone: {
                target: 'monitoring',
                actions: 'handleSyncValidation',
              },
              onError: {
                target: 'correcting',
                actions: 'handleSyncError',
              },
            },
          },
          correcting: {
            entry: 'initiateSyncCorrection',
            after: {
              100: {
                target: 'monitoring',
                actions: 'completeSyncCorrection',
              },
            },
            on: {
              FORCE_SYNC: {
                actions: 'forceSync',
              },
            },
          },
        },
        on: {
          REGISTER_PLAYER: {
            actions: 'registerPlayer',
          },
          UNREGISTER_PLAYER: {
            actions: 'unregisterPlayer',
          },
          SET_MASTER: {
            actions: 'setMaster',
          },
          SET_SYNC_MODE: {
            actions: ['setSyncMode', 'notifyPlayersOfSyncModeChange'],
          },
        },
      },
      offline: {
        entry: 'cleanupCoordinator',
        on: {
          REGISTER_PLAYER: {
            target: 'coordinating',
            actions: 'registerPlayer',
          },
        },
      },
    },
    on: {
      UPDATE_PERFORMANCE_MODE: {
        actions: 'updatePerformanceMode',
      },
    },
  },
  {
    actions: {
      registerPlayer: assign({
        playerRefs: ({ context, event }) => {
          const { playerId, playerRef } = event as any;
          const newPlayerRefs = new Map(context.playerRefs);
          newPlayerRefs.set(playerId, playerRef);

          if (!context.masterPlayerId && context.syncMode === 'global') {
            return newPlayerRefs;
          }

          return newPlayerRefs;
        },
        masterPlayerId: ({ context, event }) => {
          const { playerId } = event as any;
          return !context.masterPlayerId ? playerId : context.masterPlayerId;
        },
      }),

      unregisterPlayer: assign({
        playerRefs: ({ context, event }) => {
          const { playerId } = event as any;
          const newPlayerRefs = new Map(context.playerRefs);
          newPlayerRefs.delete(playerId);
          return newPlayerRefs;
        },
        masterPlayerId: ({ context, event }) => {
          const { playerId } = event as any;
          if (context.masterPlayerId === playerId) {
            const remainingPlayers = Array.from(context.playerRefs.keys()).filter(
              (id) => id !== playerId
            );
            return remainingPlayers.length > 0 ? remainingPlayers[0] : null;
          }
          return context.masterPlayerId;
        },
      }),

      setMaster: assign({
        masterPlayerId: ({ event }) => (event as any).playerId,
      }),

      setSyncMode: assign({
        syncMode: ({ event }) => (event as any).mode,
      }),

      updatePerformanceMode: assign({
        performanceMode: ({ event }) => (event as any).mode,
        syncThreshold: ({ context, event }) => {
          const mode = (event as any).mode;
          return mode === 'performance' ? 33.33 : 16.67;
        },
      }),

      broadcastEvent: assign({
        syncEvents: ({ context, event }) => {
          const syncEvent = (event as any).event as SyncEvent;
          const newEvents = [...context.syncEvents, syncEvent];

          if (context.syncMode === 'global') {
            context.playerRefs.forEach((playerRef, playerId) => {
              try {
                playerRef.send({
                  type: 'SYNC_UPDATE',
                  event: syncEvent,
                });
              } catch (error) {
                console.error(`Failed to sync with player ${playerId}:`, error);
              }
            });
          }

          return newEvents.slice(-50);
        },
      }),

      logSyncDrift: ({ event }) => {
        const { playerId, drift } = event as any;
        console.warn(`Sync drift detected for player ${playerId}: ${drift}ms`);
      },

      initiateSyncCorrection: ({ context }) => {
        if (context.masterPlayerId && context.playerRefs.has(context.masterPlayerId)) {
          console.log('Initiating sync correction...');
        }
      },

      completeSyncCorrection: ({ context }) => {
        console.log('Sync correction completed');
      },

      forceSync: ({ context }) => {
        if (context.masterPlayerId && context.playerRefs.has(context.masterPlayerId)) {
          const masterRef = context.playerRefs.get(context.masterPlayerId);

          const forceSyncEvent: SyncEvent = {
            type: 'seek',
            timestamp: Date.now(),
            data: { frame: 0, time: 0 },
          };

          context.playerRefs.forEach((playerRef, playerId) => {
            if (playerId !== context.masterPlayerId) {
              try {
                playerRef.send({
                  type: 'SYNC_UPDATE',
                  event: forceSyncEvent,
                });
              } catch (error) {
                console.error(`Failed to force sync with player ${playerId}:`, error);
              }
            }
          });
        }
      },

      notifyPlayersOfSyncModeChange: ({ context }) => {
        context.playerRefs.forEach((playerRef) => {
          try {
            playerRef.send({
              type: 'SET_SYNC_MODE',
              mode: context.syncMode,
            });
          } catch (error) {
            console.error('Failed to notify player of sync mode change:', error);
          }
        });
      },

      handleSyncValidation: ({ event }) => {
        const validationResult = (event as any).output;
        console.log('Sync validation result:', validationResult);
      },

      handleSyncError: ({ event }) => {
        const error = (event as any).error;
        console.error('Sync validation error:', error);
      },

      cleanupCoordinator: ({ context }) => {
        // Clear all intervals and timeouts
        context.playerRefs.forEach((ref, playerId) => {
          try {
            if (ref.getSnapshot && ref.getSnapshot().status === 'active') {
              ref.send({ type: 'DISPOSE' });
            }
          } catch (error) {
            console.error(`Failed to dispose player ${playerId}:`, error);
          }
        });
        // Clear the Map
        context.playerRefs.clear();
        console.log('🧹 [SYNC-COORDINATOR] Coordinator cleaned up');
      },
    },

    actors: {
      syncMonitorService:
        ({ context }) =>
        (callback) => {
          const monitorInterval = setInterval(() => {
            if (context.syncMode === 'global' && context.playerRefs.size > 1) {
              callback({ type: 'VALIDATE_SYNC' });
            }
          }, context.syncThreshold);

          return () => {
            clearInterval(monitorInterval);
          };
        },

      validateSyncService: async ({ context }) => {
        return new Promise<{ inSync: boolean; maxDrift: number }>((resolve) => {
          const players = Array.from(context.playerRefs.entries());

          if (players.length < 2) {
            resolve({ inSync: true, maxDrift: 0 });
            return;
          }

          let maxDrift = 0;
          let inSync = true;

          setTimeout(() => {
            resolve({ inSync, maxDrift });
          }, 10);
        });
      },
    },
  }
);
