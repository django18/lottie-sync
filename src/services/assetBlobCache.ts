interface CachedAsset {
  url: string;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export class AssetBlobCache {
  private cache = new Map<string, CachedAsset>();
  private maxCacheSize = 20 * 1024 * 1024; // 20MB total cache size
  private currentCacheSize = 0;
  private maxAge = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup expired assets every 5 minutes
    setInterval(() => this.cleanupExpiredAssets(), 5 * 60 * 1000);
  }

  /**
   * Generate a cache key for an asset
   */
  private generateCacheKey(path: string, data: Uint8Array): string {
    // Simple key based on path and size for quick lookup
    return `${path}_${data.length}_${this.getDataHash(data)}`;
  }

  /**
   * Simple hash function for data integrity
   */
  private getDataHash(data: Uint8Array): string {
    // Simple hash using first and last bytes + length
    if (data.length === 0) return '0';
    const first = data[0];
    const last = data[data.length - 1];
    const middle = data[Math.floor(data.length / 2)];
    return `${first}${middle}${last}${data.length}`;
  }

  /**
   * Get cached asset URL or create new one
   */
  getCachedAssetUrl(path: string, data: Uint8Array, mimeType?: string): string {
    const cacheKey = this.generateCacheKey(path, data);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // Update access statistics
      cached.accessCount++;
      cached.lastAccessed = Date.now();

      console.log(`📦 [ASSET-CACHE] Cache HIT for ${path} (accessed ${cached.accessCount} times)`);
      return cached.url;
    }

    // Cache miss - create new blob URL
    console.log(`🔍 [ASSET-CACHE] Cache MISS for ${path}, creating new blob URL`);

    const inferredMimeType = mimeType || this.inferMimeType(path);
    const blob = new Blob([data], { type: inferredMimeType });
    const url = URL.createObjectURL(blob);
    const size = data.length;

    // Ensure we have space in cache
    this.ensureCacheSpace(size);

    // Add to cache
    const cachedAsset: CachedAsset = {
      url,
      createdAt: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    this.cache.set(cacheKey, cachedAsset);
    this.currentCacheSize += size;

    console.log(
      `💾 [ASSET-CACHE] Cached ${path} (${this.formatSize(size)}), total cache: ${this.formatSize(this.currentCacheSize)}`
    );

    return url;
  }

  /**
   * Infer MIME type from file extension
   */
  private inferMimeType(path: string): string {
    const extension = path.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'svg':
        return 'image/svg+xml';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'ttf':
        return 'font/ttf';
      case 'otf':
        return 'font/otf';
      case 'woff':
        return 'font/woff';
      case 'woff2':
        return 'font/woff2';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Ensure we have enough space in cache
   */
  private ensureCacheSpace(requiredSize: number): void {
    if (this.currentCacheSize + requiredSize <= this.maxCacheSize) {
      return;
    }

    console.log(`🧹 [ASSET-CACHE] Cache size limit reached, cleaning up...`);

    // Sort by LRU (least recently used first)
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    let removedCount = 0;

    for (const [key, asset] of entries) {
      if (freedSpace >= requiredSize) break;

      // Remove from cache
      URL.revokeObjectURL(asset.url);
      this.cache.delete(key);
      this.currentCacheSize -= asset.size;
      freedSpace += asset.size;
      removedCount++;
    }

    console.log(
      `🗑️ [ASSET-CACHE] Removed ${removedCount} assets, freed ${this.formatSize(freedSpace)}`
    );
  }

  /**
   * Clean up expired assets
   */
  private cleanupExpiredAssets(): void {
    const now = Date.now();
    let removedCount = 0;
    let freedSpace = 0;

    for (const [key, asset] of this.cache.entries()) {
      const age = now - asset.createdAt;

      if (age > this.maxAge) {
        URL.revokeObjectURL(asset.url);
        this.cache.delete(key);
        this.currentCacheSize -= asset.size;
        freedSpace += asset.size;
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(
        `⏰ [ASSET-CACHE] Cleaned up ${removedCount} expired assets, freed ${this.formatSize(freedSpace)}`
      );
    }
  }

  /**
   * Format byte size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalAssets: number;
    cacheSize: string;
    hitRate: number;
    mostAccessedAssets: Array<{ key: string; accessCount: number }>;
  } {
    const assets = Array.from(this.cache.entries());
    const totalAccesses = assets.reduce((sum, [, asset]) => sum + asset.accessCount, 0);
    const totalAssets = assets.length;

    // Calculate approximate hit rate (this is simplified)
    const hitRate = totalAssets > 0 ? ((totalAccesses - totalAssets) / totalAccesses) * 100 : 0;

    const mostAccessed = assets
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 5)
      .map(([key, asset]) => ({ key, accessCount: asset.accessCount }));

    return {
      totalAssets,
      cacheSize: this.formatSize(this.currentCacheSize),
      hitRate: Math.max(0, hitRate),
      mostAccessedAssets: mostAccessed,
    };
  }

  /**
   * Clear all cached assets
   */
  clear(): void {
    for (const asset of this.cache.values()) {
      URL.revokeObjectURL(asset.url);
    }
    this.cache.clear();
    this.currentCacheSize = 0;
    console.log('🗑️ [ASSET-CACHE] All assets cleared from cache');
  }

  /**
   * Destroy cache (cleanup on app unmount)
   */
  destroy(): void {
    this.clear();
  }
}

// Global singleton instance
export const assetBlobCache = new AssetBlobCache();
