import { useCallback } from 'react';
import type { GlobalControls } from '../types';
import { useKeyboardShortcuts } from '../hooks';

interface BottomControlBarProps {
  playerCount: number;
  onPlayerCountChange: (count: number) => void;
  globalControls: GlobalControls;
  onGlobalPlay: () => void;
  onGlobalPause: () => void;
  onGlobalStop: () => void;
  onGlobalSeek: (frame: number) => void;
  onGlobalSpeedChange: (speed: number) => void;
  onGlobalLoopToggle: () => void;
  onToggleSyncMode: () => void;
  onGlobalZoomChange?: (zoom: number) => void;
  currentFrame: number;
  totalFrames: number;
  globalZoom?: number;
  className?: string;
}

export function BottomControlBar({
  playerCount,
  onPlayerCountChange,
  globalControls,
  onGlobalPlay,
  onGlobalPause,
  onGlobalStop,
  onGlobalSeek,
  onGlobalSpeedChange,
  onGlobalLoopToggle,
  onToggleSyncMode,
  onGlobalZoomChange,
  currentFrame,
  totalFrames,
  globalZoom = 1,
  className = '',
}: BottomControlBarProps) {
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const frame = parseInt(e.target.value, 10);
      onGlobalSeek(frame);
    },
    [onGlobalSeek]
  );

  const handleSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const speed = parseFloat(e.target.value);
      onGlobalSpeedChange(speed);
    },
    [onGlobalSpeedChange]
  );

  const handleZoomChange = useCallback(
    (newZoom: number) => {
      if (onGlobalZoomChange) {
        onGlobalZoomChange(newZoom);
      }
    },
    [onGlobalZoomChange]
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onZoomIn: () => handleZoomChange(Math.min(5, globalZoom + 0.25)),
    onZoomOut: () => handleZoomChange(Math.max(0.25, globalZoom - 0.25)),
    onZoomReset: () => handleZoomChange(1),
    onPlay: globalControls.isPlaying ? onGlobalPause : onGlobalPlay,
    onStop: onGlobalStop,
    disabled: totalFrames === 0,
  });

  return (
    <div className={`bg-white border-t border-gray-200 px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Add Player Button */}
        <div className="flex items-center">
          <button
            onClick={() => onPlayerCountChange(Math.max(1, playerCount + 1))}
            className="px-3 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium"
            title="Add Player"
          >
            + Add Player
          </button>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center space-x-4">
          {/* Stop */}
          <button
            onClick={onGlobalStop}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            title="Stop"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" rx="1" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={globalControls.isPlaying ? onGlobalPause : onGlobalPlay}
            className="p-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            title={globalControls.isPlaying ? 'Pause' : 'Play'}
          >
            {globalControls.isPlaying ? (
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
              {Math.max(1, Math.round(currentFrame) + 1)}
            </span>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min="0"
                max={Math.max(0, totalFrames - 1)}
                value={Math.max(0, Math.min(totalFrames - 1, Math.round(currentFrame)))}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={totalFrames === 0}
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
              `}</style>
            </div>
            <span className="text-xs text-gray-500 tabular-nums min-w-0">
              {Math.max(0, totalFrames)}
            </span>
          </div>
        </div>

        {/* Right: Additional Controls */}
        <div className="flex items-center space-x-3">
          {/* Zoom Control */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Zoom:</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleZoomChange(Math.max(0.25, globalZoom - 0.25))}
                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs flex items-center justify-center transition-colors"
                title="Zoom Out (25%) - Ctrl/Cmd + -"
              >
                −
              </button>
              <button
                onClick={() => handleZoomChange(1)}
                className={`text-xs font-mono w-12 text-center py-1 rounded transition-colors ${
                  globalZoom === 1 ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="Reset to 100% - Ctrl/Cmd + 0"
              >
                {globalZoom.toFixed(2)}x
              </button>
              <button
                onClick={() => handleZoomChange(Math.min(5, globalZoom + 0.25))}
                className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs flex items-center justify-center transition-colors"
                title="Zoom In (25%) - Ctrl/Cmd + +"
              >
                +
              </button>
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">Speed:</span>
            <select
              value={globalControls.speed}
              onChange={handleSpeedChange}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
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
            onClick={onGlobalLoopToggle}
            className={`p-2 rounded-md border transition-colors ${
              globalControls.loop
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
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
            onClick={onToggleSyncMode}
            className={`px-3 py-2 text-xs rounded-md border transition-colors ${
              globalControls.synchronizationMode === 'global'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle Sync Mode"
          >
            {globalControls.synchronizationMode === 'global' ? 'Sync' : 'Individual'}
          </button>
        </div>
      </div>
    </div>
  );
}
