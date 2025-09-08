import { useState, useEffect } from 'react';
import { simplePlayerPool } from '../services/simplePlayerPool';
import { assetBlobCache } from '../services/assetBlobCache';

export function OptimizationMonitor() {
  const [poolStats, setPoolStats] = useState<Record<string, any>>({});
  const [cacheStats, setCacheStats] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setPoolStats(simplePlayerPool.getPoolStats());
      setCacheStats(assetBlobCache.getCacheStats());
    };

    // Update stats every 2 seconds
    const interval = setInterval(updateStats, 2000);

    // Initial update
    updateStats();

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors z-50"
        title="Show optimization metrics"
      >
        📊 Optimizations
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-800">Performance Optimizations</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
          title="Hide metrics"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 text-sm">
        {/* Player Pool Statistics */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">🔄 Player Pool</h4>
          {Object.keys(poolStats).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(poolStats).map(([playerType, stats]) => (
                <div key={playerType} className="flex justify-between text-xs">
                  <span className="text-gray-600 capitalize">{playerType}:</span>
                  <span className="text-gray-800">
                    {(stats as any).total} total, {(stats as any).inUse} in use,{' '}
                    {(stats as any).available} available
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-xs">No pooled players</div>
          )}
        </div>

        {/* Asset Cache Statistics */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">💾 Asset Cache</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Cached assets:</span>
              <span className="text-gray-800">{cacheStats.totalAssets || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Cache size:</span>
              <span className="text-gray-800">{cacheStats.cacheSize || '0B'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Hit rate:</span>
              <span className="text-gray-800">{(cacheStats.hitRate || 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Most Accessed Assets */}
        {cacheStats.mostAccessedAssets && cacheStats.mostAccessedAssets.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🔥 Top Assets</h4>
            <div className="space-y-1">
              {cacheStats.mostAccessedAssets.slice(0, 3).map((asset: any) => (
                <div key={asset.key} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate max-w-32" title={asset.key}>
                    {asset.key.split('_')[0]}...
                  </span>
                  <span className="text-gray-800">{asset.accessCount} hits</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benefits Summary */}
        <div className="pt-2 border-t border-gray-200">
          <h4 className="font-medium text-gray-700 mb-2">✨ Active Optimizations</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-gray-600">Player instance pooling</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-gray-600">Asset blob caching</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-gray-600">Animation preprocessing</span>
            </div>
          </div>
        </div>

        {/* Clear Cache Button */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={() => {
              assetBlobCache.clear();
              alert('Asset cache cleared!');
            }}
            className="w-full bg-red-100 text-red-700 px-3 py-1 rounded text-xs hover:bg-red-200 transition-colors"
          >
            🗑️ Clear Asset Cache
          </button>
        </div>
      </div>
    </div>
  );
}
