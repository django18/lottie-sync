import React from 'react';
import { ProgressScrubber } from './ProgressScrubber';
import type { ControlsProps, GlobalControls as GlobalControlsType } from '../types';

interface GlobalControlsProps extends ControlsProps {
  controls: GlobalControlsType;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (frame: number) => void;
  onSpeedChange: (speed: number) => void;
  onLoopToggle: () => void;
  onSyncModeToggle: () => void;
}

export function GlobalControls({
  controls,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onSpeedChange,
  onLoopToggle,
  onSyncModeToggle,
  disabled = false,
  compact = false,
  className = '',
}: GlobalControlsProps) {
  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const speed = parseFloat(e.target.value);
    onSpeedChange(speed);
  };

  return (
    <div className={`card ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Global Controls</h2>
          <div className="flex items-center space-x-2">
            {/* Sync Mode Toggle */}
            <button
              onClick={onSyncModeToggle}
              disabled={disabled}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                controls.synchronizationMode === 'global'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {controls.synchronizationMode === 'global' ? 'Global Sync' : 'Individual'}
            </button>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onPlay}
            disabled={disabled || controls.isPlaying}
            className="btn-primary disabled:opacity-50"
            title="Play"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            onClick={onPause}
            disabled={disabled || !controls.isPlaying}
            className="btn-secondary disabled:opacity-50"
            title="Pause"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            onClick={onStop}
            disabled={disabled}
            className="btn-secondary disabled:opacity-50"
            title="Stop"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Loop Toggle */}
          <button
            onClick={onLoopToggle}
            disabled={disabled}
            className={`p-2 rounded-lg transition-colors ${
              controls.loop
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        </div>

        {/* Enhanced Progress Scrubber */}
        {controls.totalFrames > 0 ? (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-blue-900">Animation Scrubber</h3>
              <p className="text-xs text-blue-700">Click and drag to seek through the animation</p>
            </div>
            <ProgressScrubber
              currentFrame={controls.currentFrame}
              totalFrames={controls.totalFrames}
              currentTime={controls.currentTime}
              duration={controls.duration}
              isPlaying={controls.isPlaying}
              onSeek={onSeek}
              showFrames={true}
              showTime={true}
              className={disabled ? 'opacity-50 pointer-events-none' : ''}
            />
          </div>
        ) : (
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="text-center text-gray-500">
              <h3 className="text-sm font-medium mb-1">Animation Scrubber</h3>
              <p className="text-xs">Upload a file and add players to enable seeking</p>
              <div className="mt-3 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400">Scrubber will appear here</span>
              </div>
            </div>
          </div>
        )}

        {/* Speed Control */}
        {!compact && (
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700">Speed:</label>
            <select
              value={controls.speed}
              onChange={handleSpeedChange}
              disabled={disabled}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
          <span>
            {controls.isPlaying ? '▶ Playing' : controls.isPaused ? '⏸ Paused' : '⏹ Stopped'}
          </span>
          <span>Sync: {controls.synchronizationMode}</span>
        </div>
      </div>
    </div>
  );
}
