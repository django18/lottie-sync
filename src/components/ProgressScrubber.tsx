import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface ProgressScrubberProps {
  currentFrame: number;
  totalFrames: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (frame: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  className?: string;
  showFrames?: boolean;
  showTime?: boolean;
  keyframes?: number[];
  markers?: Array<{ frame: number; label: string; color?: string }>;
}

export function ProgressScrubber({
  currentFrame,
  totalFrames,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onScrubStart,
  onScrubEnd,
  className = '',
  showFrames = true,
  showTime = true,
  keyframes = [],
  markers = [],
}: ProgressScrubberProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragFrame, setDragFrame] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverFrame, setHoverFrame] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const lastRenderFrameRef = useRef<number>(-1);

  // Memoize calculations while allowing smooth progress during playback
  const { displayFrame, displayTime, progressPercentage } = useMemo(() => {
    const currentFrameRounded = Math.round(currentFrame);
    
    // Always update during playback for smooth progress, only throttle micro-changes when not dragging
    const shouldUpdate = isDragging || !isPlaying || 
                        Math.abs(currentFrameRounded - lastRenderFrameRef.current) >= 0.5 || 
                        lastRenderFrameRef.current === -1;
    
    if (shouldUpdate) {
      lastRenderFrameRef.current = currentFrameRounded;
    }
    
    // Use actual current frame for smooth progress during playback
    const displayFrame = isDragging ? dragFrame : currentFrame;
    // Fix: Ensure time calculation can reach full duration when at final frame
    const displayTime = isDragging
      ? (dragFrame / Math.max(1, totalFrames - 1)) * duration
      : currentTime;
    // Fix: Ensure percentage can reach exactly 100% when at final frame
    const progressPercentage =
      totalFrames > 0 ? Math.min(100, (displayFrame / Math.max(1, totalFrames - 1)) * 100) : 0;
      
    return { displayFrame, displayTime, progressPercentage };
  }, [currentFrame, dragFrame, isDragging, isPlaying, totalFrames, duration, currentTime]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }, []);

  const getFrameFromPosition = useCallback(
    (clientX: number, rect: DOMRect) => {
      const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // Fix: Ensure frame can reach totalFrames (not totalFrames-1)
      const frame = Math.round(position * totalFrames);
      return Math.max(0, Math.min(totalFrames, frame));
    },
    [totalFrames]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (totalFrames === 0) return;

      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect) return;

      const frame = getFrameFromPosition(e.clientX, rect);

      // PERFORMANCE: Immediate seek on first click
      onSeek(frame);

      setIsDragging(true);
      setDragFrame(frame);
      onScrubStart?.();

      let hasMoved = false;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        hasMoved = true;
        const newFrame = getFrameFromPosition(moveEvent.clientX, rect);
        setDragFrame(newFrame);
        // PERFORMANCE: Immediate seek during drag for live preview
        onSeek(newFrame);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        // Only seek again if we actually dragged, not just clicked
        if (hasMoved) {
          onSeek(dragFrame);
        }
        onScrubEnd?.();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [totalFrames, dragFrame, getFrameFromPosition, onSeek, onScrubStart, onScrubEnd]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging || totalFrames === 0) return;

      const rect = sliderRef.current?.getBoundingClientRect();
      if (!rect) return;

      const frame = getFrameFromPosition(e.clientX, rect);
      setHoverFrame(frame);
    },
    [isDragging, totalFrames, getFrameFromPosition]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (totalFrames === 0) return;

      let newFrame = currentFrame;

      switch (e.key) {
        case 'ArrowLeft':
          newFrame = Math.max(0, currentFrame - 1);
          break;
        case 'ArrowRight':
          newFrame = Math.min(totalFrames, currentFrame + 1);
          break;
        case 'Home':
          newFrame = 0;
          break;
        case 'End':
          newFrame = totalFrames;
          break;
        default:
          return;
      }

      e.preventDefault();
      onSeek(newFrame);
    },
    [currentFrame, totalFrames, onSeek]
  );

  // Keyboard support
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (document.activeElement === sliderRef.current) {
        handleKeyDown(e as any);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyDown]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between text-sm">
        {showTime && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Time:</span>
            <span className="font-mono font-medium text-gray-900">{formatTime(displayTime)}</span>
            <span className="text-gray-400">/ {formatTime(duration)}</span>
          </div>
        )}

        {showFrames && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Frame:</span>
            <span className="font-mono font-medium text-gray-900">
              {Math.min(totalFrames, Math.round(displayFrame) + 1)}
            </span>
            <span className="text-gray-400">/ {totalFrames}</span>
          </div>
        )}
      </div>

      {/* Progress Bar Container */}
      <div className="relative">
        <div
          ref={sliderRef}
          className="relative h-8 bg-gray-300 rounded-lg cursor-pointer group shadow-inner border-2 border-gray-400 hover:border-blue-400 transition-colors"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={totalFrames}
          aria-valuenow={Math.round(displayFrame)}
          aria-label="Animation progress scrubber"
        >
          {/* Background Track */}
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            {/* Keyframes */}
            {keyframes.map((frame, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-0.5 bg-blue-300 opacity-60"
                style={{ left: `${(frame / totalFrames) * 100}%` }}
                title={`Keyframe at frame ${frame}`}
              />
            ))}

            {/* Markers */}
            {markers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 flex items-center"
                style={{ left: `${(marker.frame / totalFrames) * 100}%` }}
              >
                <div
                  className={`w-1 h-full ${marker.color || 'bg-purple-400'} rounded-sm`}
                  title={`${marker.label} (frame ${marker.frame})`}
                />
              </div>
            ))}
          </div>

          {/* Progress Fill */}
          <div
            className={`absolute top-1 left-1 rounded-md transition-all duration-100 progress-fill ${
              isPlaying ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{
              '--progress': `${progressPercentage}%`,
              width: `calc(var(--progress) - 4px)`,
              height: 'calc(100% - 8px)',
            } as React.CSSProperties}
          />

          {/* Current Position Indicator - Larger, more visible handle */}
          <div
            className="absolute top-0 bottom-0 w-3 bg-white border-2 border-gray-800 rounded-md transform -translate-x-1.5 transition-all duration-100 shadow-lg cursor-grab active:cursor-grabbing hover:border-blue-600 progress-thumb"
            style={{
              '--progress': `${progressPercentage}%`,
              left: 'var(--progress)',
            } as React.CSSProperties}
          />

          {/* Hover Indicator */}
          {isHovering && !isDragging && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-600 opacity-50"
              style={{ left: `${(hoverFrame / totalFrames) * 100}%` }}
            />
          )}

          {/* Dragging Indicator */}
          {isDragging && (
            <div
              className="absolute top-0 bottom-0 w-1 bg-red-400 rounded-sm transform -translate-x-0.5"
              style={{ left: `${(dragFrame / totalFrames) * 100}%` }}
            />
          )}
        </div>

        {/* Tooltip */}
        {isHovering && !isDragging && (
          <div
            className="absolute -top-10 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded pointer-events-none z-10"
            style={{ left: `${(hoverFrame / totalFrames) * 100}%` }}
          >
            Frame {Math.round(hoverFrame)}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-800" />
          </div>
        )}

        {/* Drag Tooltip */}
        {isDragging && (
          <div
            className="absolute -top-10 transform -translate-x-1/2 px-2 py-1 bg-red-600 text-white text-xs rounded pointer-events-none z-10"
            style={{ left: `${(dragFrame / totalFrames) * 100}%` }}
          >
            {Math.round(dragFrame)} / {totalFrames}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-red-600" />
          </div>
        )}
      </div>

      {/* Quick Jump Buttons */}
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => onSeek(0)}
          className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title="Jump to start"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </button>

        <button
          onClick={() => onSeek(Math.max(0, currentFrame - 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title="Previous frame"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
        </button>

        <button
          onClick={() => onSeek(Math.min(totalFrames, currentFrame + 1))}
          className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title="Next frame"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
          </svg>
        </button>

        <button
          onClick={() => onSeek(totalFrames)}
          className="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          title="Jump to end"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11.555 5.168A1 1 0 0010 6v2.798L4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z" />
          </svg>
        </button>
      </div>

      {/* Playback Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-gray-300'}`} />
          <span>{isPlaying ? 'Playing' : 'Paused'}</span>
        </div>

        {duration > 0 && (
          <div>
            {displayFrame >= totalFrames - 1
              ? 100
              : Math.round((Math.min(displayTime, duration) / duration) * 100)}
            % complete
          </div>
        )}
      </div>
    </div>
  );
}
