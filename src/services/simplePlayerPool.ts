import type { PlayerAdapter } from './playerService';

interface PooledPlayer {
  adapter: PlayerAdapter;
  lastUsed: number;
  inUse: boolean;
  container?: HTMLElement;
}

export class SimplePlayerPool {
  private pools = new Map<string, PooledPlayer[]>();
  private maxPoolSize = 3; // Keep max 3 instances per player type
  private maxIdleTime = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Cleanup idle players every 2 minutes
    setInterval(() => this.cleanupIdlePlayers(), 2 * 60 * 1000);
  }

  /**
   * Get a player from the pool or create a new one
   */
  async getPlayer(
    type: 'lottie-web' | 'dotlottie',
    createNewPlayer: () => Promise<PlayerAdapter>
  ): Promise<PlayerAdapter> {
    const poolKey = type;
    const pool = this.pools.get(poolKey) || [];

    // Try to find an available player
    const availablePlayer = pool.find((p) => !p.inUse);

    if (availablePlayer) {
      availablePlayer.inUse = true;
      availablePlayer.lastUsed = Date.now();

      console.log(`♻️ [PLAYER-POOL] Reusing ${type} player from pool`);
      return availablePlayer.adapter;
    }

    // Create new player if pool is empty or all players are in use
    console.log(`🆕 [PLAYER-POOL] Creating new ${type} player`);
    const newAdapter = await createNewPlayer();

    const pooledPlayer: PooledPlayer = {
      adapter: newAdapter,
      lastUsed: Date.now(),
      inUse: true,
    };

    // Add to pool
    pool.push(pooledPlayer);
    this.pools.set(poolKey, pool);

    // Limit pool size
    if (pool.length > this.maxPoolSize) {
      const oldestPlayer = pool.shift();
      if (oldestPlayer && !oldestPlayer.inUse) {
        this.destroyPlayer(oldestPlayer.adapter);
      }
    }

    return newAdapter;
  }

  /**
   * Return a player to the pool
   */
  releasePlayer(type: 'lottie-web' | 'dotlottie', adapter: PlayerAdapter): void {
    const poolKey = type;
    const pool = this.pools.get(poolKey) || [];

    const pooledPlayer = pool.find((p) => p.adapter === adapter);
    if (pooledPlayer) {
      pooledPlayer.inUse = false;
      pooledPlayer.lastUsed = Date.now();
      pooledPlayer.container = undefined; // Clear container reference

      console.log(`🔓 [PLAYER-POOL] Released ${type} player to pool`);
    }
  }

  /**
   * Clean up players that have been idle too long
   */
  private cleanupIdlePlayers(): void {
    const now = Date.now();

    for (const [poolKey, pool] of this.pools.entries()) {
      const playersToKeep: PooledPlayer[] = [];
      let cleanedCount = 0;

      for (const pooledPlayer of pool) {
        const isIdle = !pooledPlayer.inUse && now - pooledPlayer.lastUsed > this.maxIdleTime;

        if (isIdle) {
          this.destroyPlayer(pooledPlayer.adapter);
          cleanedCount++;
        } else {
          playersToKeep.push(pooledPlayer);
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 [PLAYER-POOL] Cleaned up ${cleanedCount} idle ${poolKey} players`);
        this.pools.set(poolKey, playersToKeep);
      }
    }
  }

  /**
   * Properly destroy a player adapter
   */
  private destroyPlayer(adapter: PlayerAdapter): void {
    try {
      if (typeof adapter.destroy === 'function') {
        adapter.destroy();
      }
    } catch (error) {
      console.warn('[PLAYER-POOL] Error destroying player:', error);
    }
  }

  /**
   * Get pool statistics for debugging
   */
  getPoolStats(): Record<string, { total: number; inUse: number; available: number }> {
    const stats: Record<string, { total: number; inUse: number; available: number }> = {};

    for (const [poolKey, pool] of this.pools.entries()) {
      const inUse = pool.filter((p) => p.inUse).length;
      stats[poolKey] = {
        total: pool.length,
        inUse,
        available: pool.length - inUse,
      };
    }

    return stats;
  }

  /**
   * Clear all pools (for cleanup on app unmount)
   */
  destroy(): void {
    for (const pool of this.pools.values()) {
      for (const pooledPlayer of pool) {
        this.destroyPlayer(pooledPlayer.adapter);
      }
    }
    this.pools.clear();
    console.log('🗑️ [PLAYER-POOL] All pools destroyed');
  }
}

// Global singleton instance
export const simplePlayerPool = new SimplePlayerPool();
