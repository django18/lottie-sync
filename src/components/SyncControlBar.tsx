import { useCallback, memo } from 'react';
import { useSelector } from '@xstate/react';
import type { SyncActorRef } from '../machines/syncMachine';

interface SyncControlBarProps {
  actorRef: SyncActorRef;
  className?: string;
}

const SyncControlBarComponent = ({ actorRef, className = '' }: SyncControlBarProps) => {
  // Optimize useSelector to only re-render when specific values change
  const { playbackState, currentFrame, speed, loop, synchronizationMode, metadata, players } =
    useSelector(actorRef, (state: any) => ({
      playbackState: state.context.playbackState,
      currentFrame: Math.round(state.context.currentFrame), // Round to avoid floating point re-renders
      speed: state.context.speed,
      loop: state.context.loop,
      synchronizationMode: state.context.synchronizationMode,
      metadata: state.context.metadata,
      players: state.context.players,
    }));

  const totalFrames = metadata?.totalFrames || 0;
  const duration = metadata?.duration || 0;
  const frameRate = metadata?.frameRate || 30;

  const isPlaying = playbackState === 'playing';
  const isStopped = playbackState === 'stopped';
  const hasAnimation = !!metadata;
  const hasPlayers = players.length > 0;
  const readyPlayers = players.filter((p: any) => p.status === 'ready').length;

  const handlePlay = useCallback(() => {
    actorRef.send({ type: 'PLAY' });
  }, [actorRef]);

  const handlePause = useCallback(() => {
    actorRef.send({ type: 'PAUSE' });
  }, [actorRef]);

  const handleStop = useCallback(() => {
    actorRef.send({ type: 'STOP' });
  }, [actorRef]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const frame = parseInt(e.target.value, 10);
      const time = frame / frameRate;
      actorRef.send({ type: 'SEEK', frame, time });
    },
    [actorRef, frameRate]
  );

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSpeed = parseFloat(e.target.value);
      actorRef.send({ type: 'SET_SPEED', speed: newSpeed });
    },
    [actorRef]
  );

  const handleLoopToggle = useCallback(() => {
    actorRef.send({ type: 'TOGGLE_LOOP' });
  }, [actorRef]);

  const handleSyncModeChange = useCallback(() => {
    const newMode = synchronizationMode === 'global' ? 'individual' : 'global';
    actorRef.send({ type: 'SET_SYNC_MODE', mode: newMode });
  }, [actorRef, synchronizationMode]);

  const canControl = hasAnimation && hasPlayers && readyPlayers > 0;

  return (
    <div className={`sync-control-bar bg-white border-t border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Player Status */}
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Players:</span>{' '}
            <span className="text-green-600">{readyPlayers}</span>
            <span className="text-gray-400">/{players.length}</span>
          </div>
          {metadata && (
            <div className="text-xs text-gray-500">
              {metadata.width}×{metadata.height} • {frameRate}fps • {duration.toFixed(1)}s
            </div>
          )}
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center space-x-4">
          {/* Stop */}
          <button
            onClick={handleStop}
            disabled={!canControl || isStopped}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 transition-colors"
            title="Stop"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" rx="1" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!canControl}
            className="p-3 rounded-md bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="4" width="2" height="12" rx="1" />
                <rect x="12" y="4" width="2" height="12" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>

          {/* Progress Scrubber */}
          <div className="flex items-center space-x-3 min-w-0 flex-1 max-w-md">
            <span className="text-xs text-gray-500 tabular-nums min-w-0">
              {Math.max(0, currentFrame)}
            </span>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min="0"
                max={Math.max(0, totalFrames - 1)}
                value={Math.max(0, Math.min(totalFrames - 1, currentFrame))}
                onChange={handleSeek}
                disabled={!canControl || totalFrames === 0}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <style>{`
                .slider::-webkit-slider-thumb {
                  appearance: none;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .slider::-moz-range-thumb {
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: #3b82f6;
                  cursor: pointer;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .slider:disabled::-webkit-slider-thumb {
                  background: #9ca3af;
                }
                .slider:disabled::-moz-range-thumb {
                  background: #9ca3af;
                }
              `}</style>
            </div>
            <span className="text-xs text-gray-500 tabular-nums min-w-0">
              {Math.max(0, totalFrames - 1)}
            </span>
          </div>
        </div>

        {/* Right: Additional Controls */}
        <div className="flex items-center space-x-3">
          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Speed:</span>
            <select
              value={speed}
              onChange={handleSpeedChange}
              disabled={!canControl}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          {/* Loop Toggle */}
          <button
            onClick={handleLoopToggle}
            disabled={!canControl}
            className={`p-2 rounded-md border transition-colors ${
              loop
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            } disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
            title="Toggle Loop"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Sync Mode Toggle */}
          <button
            onClick={handleSyncModeChange}
            disabled={!hasPlayers}
            className={`px-3 py-2 text-xs rounded-md border transition-colors ${
              synchronizationMode === 'global'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            } disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200`}
            title="Toggle Sync Mode"
          >
            {synchronizationMode === 'global' ? 'Global Sync' : 'Individual'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {!hasAnimation && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            No animation loaded. Upload a .json or .lottie file to begin.
          </p>
        </div>
      )}

      {hasAnimation && !hasPlayers && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">Animation loaded. Add players to start playback.</p>
        </div>
      )}

      {hasAnimation && hasPlayers && readyPlayers === 0 && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">Players are loading...</p>
        </div>
      )}
    </div>
  );
};

export const SyncControlBar = memo(SyncControlBarComponent);
