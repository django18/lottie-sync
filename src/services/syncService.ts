import type { PlayerAdapter } from './playerService';
import type { SyncEvent, PerformanceMetrics } from '../types';

export interface SyncOptions {
  threshold: number; // milliseconds
  maxLatency: number; // milliseconds
  performanceMode: 'quality' | 'performance';
}

export class SynchronizationService {
  private players: Map<string, PlayerAdapter> = new Map();
  private masterPlayerId: string | null = null;
  private syncOptions: SyncOptions;
  private syncInterval: number | null = null;
  private performanceMetrics: PerformanceMetrics[] = [];
  private isBroadcasting: boolean = false; // Prevent infinite loops

  constructor(options: Partial<SyncOptions> = {}) {
    this.syncOptions = {
      threshold: 16.67, // 60fps
      maxLatency: 50,
      performanceMode: 'quality',
      ...options,
    };
  }

  registerPlayer(id: string, adapter: PlayerAdapter): void {
    console.log(
      `SyncService: Registering player ${id}, total players will be: ${this.players.size + 1}`
    );
    this.players.set(id, adapter);

    // Set first player as master if no master exists
    if (!this.masterPlayerId) {
      this.masterPlayerId = id;
      console.log(`SyncService: Set ${id} as master player`);
    }

    // REMOVED: Individual player event listeners that caused infinite loops
    // These will be handled by external calls to broadcastEvent only
    console.log(
      `SyncService: Player ${id} registered without internal event listeners to prevent loops`
    );
  }

  unregisterPlayer(id: string): void {
    this.players.delete(id);

    // If this was the master, choose a new one
    if (this.masterPlayerId === id) {
      const remainingPlayers = Array.from(this.players.keys());
      this.masterPlayerId = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
    }
  }

  setMaster(id: string): void {
    if (this.players.has(id)) {
      this.masterPlayerId = id;
    }
  }

  broadcastEvent(event: SyncEvent, excludePlayerId?: string): void {
    // Prevent infinite loops and concurrent broadcasts
    if (this.isBroadcasting) {
      console.log(`SyncService: Skipping broadcast of ${event.type} - already broadcasting`);
      return;
    }

    this.isBroadcasting = true;
    console.log(`SyncService: Broadcasting ${event.type} event to ${this.players.size} players`);
    const startTime = performance.now();

    // PERFORMANCE FIX: Make seeking immediate, other events can be async
    const isSeekEvent = event.type === 'seek';

    const executeSync = () => {
      this.players.forEach((adapter, playerId) => {
        if (playerId === excludePlayerId) {
          return; // Don't broadcast to the originating player
        }

        try {
          console.log(`SyncService: Sending ${event.type} to player ${playerId}`);
          switch (event.type) {
            case 'play':
              console.log(`SyncService: Calling play() on player ${playerId}`);
              adapter.play();
              break;
            case 'pause':
              adapter.pause();
              break;
            case 'stop':
              adapter.stop();
              break;
            case 'seek':
              if (event.data?.frame !== undefined) {
                adapter.seek(event.data.frame);
              }
              break;
            case 'speed-change':
              if (event.data?.speed !== undefined) {
                adapter.setSpeed(event.data.speed);
              }
              break;
            case 'loop-toggle':
              if (event.data?.loop !== undefined) {
                adapter.setLoop(event.data.loop);
              }
              break;
          }
        } catch (error) {
          console.error(`Failed to sync event ${event.type} to player ${playerId}:`, error);
        }
      });

      // Record performance metrics
      const executionTime = performance.now() - startTime;
      this.recordPerformanceMetric({
        frameRate: 1000 / this.syncOptions.threshold,
        renderTime: executionTime,
        syncLatency: executionTime,
      });

      this.isBroadcasting = false;
    };

    // Execute seek events immediately for better performance
    if (isSeekEvent) {
      executeSync();
    } else {
      // Use async processing for non-critical events to prevent blocking
      setTimeout(executeSync, 0);
    }
  }

  startSyncMonitoring(): void {
    if (this.syncInterval) {
      return; // Already monitoring
    }

    // Adaptive interval based on player count to prevent performance degradation
    const playerCount = this.players.size;
    const baseInterval =
      this.syncOptions.performanceMode === 'performance'
        ? this.syncOptions.threshold * 2 // 30fps
        : this.syncOptions.threshold; // 60fps

    // Scale interval based on player count: more players = less frequent monitoring
    const intervalMs = Math.max(baseInterval, baseInterval * Math.ceil(playerCount / 2));

    console.log(
      `SyncService: Starting monitoring with ${intervalMs}ms interval for ${playerCount} players`
    );

    this.syncInterval = window.setInterval(() => {
      this.validateSync();
    }, intervalMs);
  }

  stopSyncMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private validateSync(): void {
    if (this.players.size < 2 || !this.masterPlayerId) {
      return;
    }

    const masterAdapter = this.players.get(this.masterPlayerId);
    if (!masterAdapter) {
      return;
    }

    const masterFrame = masterAdapter.getCurrentFrame();
    const masterTime = masterAdapter.getCurrentTime();

    let maxDrift = 0;
    let driftedPlayers: string[] = [];

    this.players.forEach((adapter, playerId) => {
      if (playerId === this.masterPlayerId) {
        return;
      }

      const playerTime = adapter.getCurrentTime();

      const timeDrift = Math.abs(masterTime - playerTime) * 1000; // Convert to ms

      if (timeDrift > this.syncOptions.maxLatency) {
        maxDrift = Math.max(maxDrift, timeDrift);
        driftedPlayers.push(playerId);
      }
    });

    if (driftedPlayers.length > 0) {
      this.correctSyncDrift(driftedPlayers, masterFrame, masterTime);
    }
  }

  private correctSyncDrift(
    driftedPlayerIds: string[],
    targetFrame: number,
    _targetTime: number
  ): void {
    console.warn(`Correcting sync drift for players: ${driftedPlayerIds.join(', ')}`);

    driftedPlayerIds.forEach((playerId) => {
      const adapter = this.players.get(playerId);
      if (adapter) {
        try {
          adapter.seek(targetFrame);
        } catch (error) {
          console.error(`Failed to correct drift for player ${playerId}:`, error);
        }
      }
    });
  }

  forceSync(): void {
    if (!this.masterPlayerId) {
      return;
    }

    const masterAdapter = this.players.get(this.masterPlayerId);
    if (!masterAdapter) {
      return;
    }

    const masterFrame = masterAdapter.getCurrentFrame();
    const masterTime = masterAdapter.getCurrentTime();

    this.broadcastEvent(
      {
        type: 'seek',
        timestamp: Date.now(),
        data: { frame: masterFrame, time: masterTime },
      },
      this.masterPlayerId
    );
  }

  updateSyncOptions(options: Partial<SyncOptions>): void {
    this.syncOptions = { ...this.syncOptions, ...options };

    // Restart monitoring with new options
    if (this.syncInterval) {
      this.stopSyncMonitoring();
      this.startSyncMonitoring();
    }
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  private recordPerformanceMetric(metric: PerformanceMetrics): void {
    this.performanceMetrics.push(metric);

    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  destroy(): void {
    this.stopSyncMonitoring();
    this.players.clear();
    this.masterPlayerId = null;
    this.performanceMetrics = [];
  }
}
