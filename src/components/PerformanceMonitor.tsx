import { useState } from 'react';
import { usePerformanceMetrics } from '../hooks/usePerformanceMetrics';

interface PerformanceMonitorProps {
  activePlayers: number;
  onFrameUpdate?: (playerId: string, frame: number) => void;
  className?: string;
  compact?: boolean;
}

export function PerformanceMonitor({
  activePlayers,
  onFrameUpdate,
  className = '',
  compact = false,
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    metrics,
    metricsHistory,
    recordFrame,
    setActivePlayers,
    getPerformanceStatus,
    getSyncStatus,
  } = usePerformanceMetrics({
    updateInterval: 1000,
    sampleSize: 60,
    trackMemory: true,
  });

  // Update active players when prop changes
  React.useEffect(() => {
    setActivePlayers(activePlayers);
  }, [activePlayers, setActivePlayers]);

  // Expose recordFrame to parent components
  React.useEffect(() => {
    if (onFrameUpdate) {
      // This is a bit of a hack - we'll need to pass recordFrame up somehow
      // For now, we'll attach it to the window for debugging
      (window as any).recordFrame = recordFrame;
    }
  }, [onFrameUpdate, recordFrame]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      case 'fair':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatMetric = (value: number, unit: string = '', decimals: number = 1) => {
    return `${value.toFixed(decimals)}${unit}`;
  };

  const performanceStatus = getPerformanceStatus();
  const syncStatus = getSyncStatus();

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 text-sm ${className}`}>
        <div className="flex items-center space-x-1">
          <div
            className={`w-2 h-2 rounded-full ${
              performanceStatus === 'excellent'
                ? 'bg-green-400'
                : performanceStatus === 'good'
                  ? 'bg-blue-400'
                  : performanceStatus === 'fair'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
            }`}
          />
          <span className="text-gray-600">{metrics.frameRate.toFixed(0)} FPS</span>
        </div>

        <div className="flex items-center space-x-1">
          <span className="text-gray-500">Sync:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(syncStatus)}`}>
            {metrics.syncAccuracy.toFixed(0)}%
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <span className="text-gray-500">Latency:</span>
          <span className="text-gray-600">{metrics.syncLatency.toFixed(0)}ms</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              performanceStatus === 'excellent'
                ? 'bg-green-400'
                : performanceStatus === 'good'
                  ? 'bg-blue-400'
                  : performanceStatus === 'fair'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
            }`}
          />
          <h3 className="text-sm font-semibold text-gray-900">Performance Monitor</h3>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <svg
            className={`w-4 h-4 text-gray-500 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Metrics Overview */}
      <div className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Frame Rate */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatMetric(metrics.frameRate, '', 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">FPS</div>
            <div className="text-xs text-gray-400 mt-1">
              Avg: {formatMetric(metrics.avgFrameRate, '', 0)}
            </div>
          </div>

          {/* Sync Accuracy */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatMetric(metrics.syncAccuracy, '%', 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Sync Accuracy</div>
            <div
              className={`text-xs mt-1 px-2 py-1 rounded-full font-medium ${getStatusColor(syncStatus)}`}
            >
              {syncStatus}
            </div>
          </div>

          {/* Sync Latency */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatMetric(metrics.syncLatency, '', 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Latency (ms)</div>
            <div className="text-xs text-gray-400 mt-1">
              {metrics.syncLatency < 16.67 ? 'Real-time' : 'Delayed'}
            </div>
          </div>

          {/* Active Players */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.activePlayers}</div>
            <div className="text-xs text-gray-500 mt-1">Active Players</div>
            <div className="text-xs text-gray-400 mt-1">
              Load:{' '}
              {metrics.activePlayers > 4 ? 'High' : metrics.activePlayers > 2 ? 'Medium' : 'Low'}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-4">
            {/* System Resources */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">System Resources</h4>
              <div className="grid grid-cols-2 gap-4">
                {metrics.memoryUsage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Memory Usage</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatMetric(metrics.memoryUsage, ' MB', 0)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CPU Estimate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatMetric(metrics.cpuUsage, '%', 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance History Chart (Simple) */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Frame Rate History</h4>
              <div className="h-20 bg-gray-50 rounded-lg p-2 flex items-end space-x-1">
                {metricsHistory.slice(-20).map((metric, index) => {
                  const height = Math.max(2, (metric.frameRate / 60) * 100);
                  const color =
                    metric.frameRate >= 55
                      ? 'bg-green-400'
                      : metric.frameRate >= 45
                        ? 'bg-blue-400'
                        : metric.frameRate >= 30
                          ? 'bg-yellow-400'
                          : 'bg-red-400';

                  return (
                    <div
                      key={index}
                      className={`w-2 ${color} rounded-t`}
                      style={{ height: `${height}%` }}
                      title={`${metric.frameRate.toFixed(1)} FPS`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-20s</span>
                <span>Now</span>
              </div>
            </div>

            {/* Status Indicators */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Performance</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(performanceStatus)}`}
                  >
                    {performanceStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Synchronization</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(syncStatus)}`}
                  >
                    {syncStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fix React import
import React from 'react';
