import { useState, useEffect, useCallback, useRef } from 'react';

export interface PerformanceMetrics {
  frameRate: number;
  avgFrameRate: number;
  syncLatency: number;
  memoryUsage: number;
  activePlayers: number;
  syncAccuracy: number;
  cpuUsage: number;
  lastUpdated: number;
}

export interface UsePerformanceMetricsOptions {
  updateInterval?: number;
  sampleSize?: number;
  trackMemory?: boolean;
}

export function usePerformanceMetrics(options: UsePerformanceMetricsOptions = {}) {
  const {
    updateInterval = 1000, // Update every second
    sampleSize = 60, // Keep 60 seconds of data
    trackMemory = true,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    frameRate: 0,
    avgFrameRate: 0,
    syncLatency: 0,
    memoryUsage: 0,
    activePlayers: 0,
    syncAccuracy: 100,
    cpuUsage: 0,
    lastUpdated: Date.now(),
  });

  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const frameTimestamps = useRef<number[]>([]);
  const syncEvents = useRef<{ playerId: string; timestamp: number; frame: number }[]>([]);
  const lastFrameTime = useRef<number>(performance.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Record frame update
  const recordFrame = useCallback((playerId: string, frame: number) => {
    const now = performance.now();
    frameTimestamps.current.push(now);

    // Record sync event
    syncEvents.current.push({
      playerId,
      timestamp: now,
      frame,
    });

    // Keep only recent timestamps (last 5 seconds)
    const cutoff = now - 5000;
    frameTimestamps.current = frameTimestamps.current.filter((t) => t > cutoff);
    syncEvents.current = syncEvents.current.filter((e) => e.timestamp > cutoff);
  }, []);

  // Calculate frame rate
  const calculateFrameRate = useCallback(() => {
    const now = performance.now();
    const recent = frameTimestamps.current.filter((t) => t > now - 1000);
    return recent.length; // FPS over the last second
  }, []);

  // Calculate sync latency and accuracy
  const calculateSyncMetrics = useCallback(() => {
    if (syncEvents.current.length < 2) {
      return { latency: 0, accuracy: 100 };
    }

    // Group events by approximate timestamp (within 50ms)
    const groups: { playerId: string; timestamp: number; frame: number }[][] = [];
    const tolerance = 50;

    syncEvents.current.forEach((event) => {
      let foundGroup = false;
      for (const group of groups) {
        if (Math.abs(group[0].timestamp - event.timestamp) <= tolerance) {
          group.push(event);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        groups.push([event]);
      }
    });

    // Calculate latency (time between first and last event in each group)
    let totalLatency = 0;
    let latencyCount = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;

    groups.forEach((group) => {
      if (group.length > 1) {
        const timestamps = group.map((e) => e.timestamp);
        const frames = group.map((e) => e.frame);

        const latency = Math.max(...timestamps) - Math.min(...timestamps);
        totalLatency += latency;
        latencyCount++;

        // Calculate frame accuracy (how close frames are to each other)
        const avgFrame = frames.reduce((sum, f) => sum + f, 0) / frames.length;
        const maxDeviation = Math.max(...frames.map((f) => Math.abs(f - avgFrame)));
        const accuracy = Math.max(0, 100 - maxDeviation);

        totalAccuracy += accuracy;
        accuracyCount++;
      }
    });

    return {
      latency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      accuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 100,
    };
  }, []);

  // Get memory usage (if available)
  const getMemoryUsage = useCallback(() => {
    if (!trackMemory) return 0;

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }, [trackMemory]);

  // Estimate CPU usage based on frame timing
  const estimateCPUUsage = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTime.current;
    lastFrameTime.current = now;

    // Rough estimation: if we're taking longer than 16.67ms per update cycle,
    // we're likely using more CPU
    const idealFrameTime = 16.67; // 60 FPS
    const usage = Math.min(100, Math.max(0, (deltaTime / idealFrameTime - 1) * 100));
    return usage;
  }, []);

  // Update metrics
  const updateMetrics = useCallback(
    (activePlayers: number) => {
      const frameRate = calculateFrameRate();
      const { latency, accuracy } = calculateSyncMetrics();
      const memoryUsage = getMemoryUsage();
      const cpuUsage = estimateCPUUsage();

      const newMetrics: PerformanceMetrics = {
        frameRate,
        avgFrameRate:
          metricsHistory.length > 0
            ? (metricsHistory.reduce((sum, m) => sum + m.frameRate, 0) + frameRate) /
              (metricsHistory.length + 1)
            : frameRate,
        syncLatency: latency,
        memoryUsage,
        activePlayers,
        syncAccuracy: accuracy,
        cpuUsage,
        lastUpdated: Date.now(),
      };

      setMetrics(newMetrics);

      // Update history
      setMetricsHistory((prev) => {
        const updated = [...prev, newMetrics];
        return updated.slice(-sampleSize); // Keep only recent samples
      });
    },
    [
      calculateFrameRate,
      calculateSyncMetrics,
      getMemoryUsage,
      estimateCPUUsage,
      metricsHistory,
      sampleSize,
    ]
  );

  // Start monitoring
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      updateMetrics(0); // Will be updated with actual player count
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateInterval, updateMetrics]);

  // Update active players count
  const setActivePlayers = useCallback((count: number) => {
    setMetrics((prev) => ({ ...prev, activePlayers: count }));
  }, []);

  // Get performance status
  const getPerformanceStatus = useCallback(() => {
    if (metrics.frameRate >= 55) return 'excellent';
    if (metrics.frameRate >= 45) return 'good';
    if (metrics.frameRate >= 30) return 'fair';
    return 'poor';
  }, [metrics.frameRate]);

  // Get sync status
  const getSyncStatus = useCallback(() => {
    if (metrics.syncAccuracy >= 95) return 'excellent';
    if (metrics.syncAccuracy >= 85) return 'good';
    if (metrics.syncAccuracy >= 70) return 'fair';
    return 'poor';
  }, [metrics.syncAccuracy]);

  return {
    metrics,
    metricsHistory,
    recordFrame,
    setActivePlayers,
    updateMetrics,
    getPerformanceStatus,
    getSyncStatus,
  };
}
