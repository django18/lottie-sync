import { useRef, useEffect, useState, useCallback } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface ReactPlayerContainerProps {
  playerId: string;
  type: string;
  file?: any;
  isActive?: boolean;
  onPlayerReady?: (playerId: string) => void;
  onPlayerError?: (playerId: string, error: string) => void;
  globalSyncEnabled?: boolean;
  onIndividualControl?: (playerId: string, action: string, data?: any) => void;
  currentFrame?: number;
  totalFrames?: number;
  isPlaying?: boolean;
  speed?: number;
  loop?: boolean;
  globalZoom?: number;
  className?: string;
}

export function ReactPlayerContainer({
  playerId,
  type,
  file,
  isActive = false,
  onPlayerReady,
  onPlayerError,
  globalSyncEnabled = true,
  onIndividualControl,
  currentFrame = 0,
  totalFrames = 0,
  isPlaying = false,
  speed = 1,
  loop = false,
  globalZoom = 1,
  className = '',
}: ReactPlayerContainerProps) {
  console.log(`📦 [REACT-CONTAINER-${playerId}] ReactPlayerContainer render with props:`, {
    playerId: playerId.slice(-6),
    hasFile: !!file,
    fileName: file?.name,
    isActive,
    globalSyncEnabled,
    currentFrame,
    totalFrames,
    isPlaying,
    speed,
    loop,
    globalZoom,
  });

  const dotLottieRef = useRef<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localFrame, setLocalFrame] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(1);
  const [localLoop, setLocalLoop] = useState(false);
  const [localZoom, setLocalZoom] = useState(1);

  // Handle DotLottie React component events
  const handleLoad = useCallback(() => {
    console.log(`🎉 [REACT-CONTAINER-${playerId}] DotLottie loaded successfully`);
    setStatus('ready');
    setError(null);
    onPlayerReady?.(playerId);
  }, [playerId, onPlayerReady]);

  const handleError = useCallback(
    (error: any) => {
      console.error(`❌ [REACT-CONTAINER-${playerId}] DotLottie error:`, error);
      setStatus('error');
      setError(error?.message || 'Failed to load animation');
      onPlayerError?.(playerId, error?.message || 'Failed to load animation');
    },
    [playerId, onPlayerError]
  );

  // Note: DotLottieReact doesn't have onFrame prop - we'll handle frame updates differently

  // Note: DotLottieReact may not have onComplete prop - we'll handle completion differently

  // Set up file loading
  useEffect(() => {
    if (file) {
      console.log(`📁 [REACT-CONTAINER-${playerId}] File changed, setting loading status`);
      setStatus('loading');
      setError(null);
    } else {
      setStatus('idle');
      setError(null);
    }
  }, [file, playerId]);

  // Update local state when global state changes
  useEffect(() => {
    if (globalSyncEnabled) {
      setLocalFrame(currentFrame);
      setLocalIsPlaying(isPlaying);
      setLocalSpeed(speed);
      setLocalLoop(loop);
      setLocalZoom(globalZoom);
    }
  }, [globalSyncEnabled, currentFrame, isPlaying, speed, loop, globalZoom]);

  // Control DotLottie instance based on global/local state
  useEffect(() => {
    if (!dotLottieRef.current || status !== 'ready') return;

    const dotLottie = dotLottieRef.current;
    const targetFrame = globalSyncEnabled ? currentFrame : localFrame;
    const targetIsPlaying = globalSyncEnabled ? isPlaying : localIsPlaying;
    const targetSpeed = globalSyncEnabled ? speed : localSpeed;
    const targetLoop = globalSyncEnabled ? loop : localLoop;

    console.log(`🎮 [REACT-CONTAINER-${playerId}] Controlling DotLottie:`, {
      targetFrame,
      targetIsPlaying,
      targetSpeed,
      targetLoop,
      syncMode: globalSyncEnabled ? 'global' : 'local',
    });

    try {
      // Set frame
      if (dotLottie.seek !== undefined) {
        dotLottie.seek(targetFrame);
      }

      // Set speed
      if (dotLottie.setSpeed !== undefined) {
        dotLottie.setSpeed(targetSpeed);
      }

      // Set loop
      if (dotLottie.setLoop !== undefined) {
        dotLottie.setLoop(targetLoop);
      }

      // Control playback
      if (targetIsPlaying) {
        if (dotLottie.play !== undefined) {
          dotLottie.play();
        }
      } else {
        if (dotLottie.pause !== undefined) {
          dotLottie.pause();
        }
      }
    } catch (err) {
      console.error(`❌ [REACT-CONTAINER-${playerId}] Error controlling DotLottie:`, err);
    }
  }, [
    playerId,
    status,
    globalSyncEnabled,
    currentFrame,
    isPlaying,
    speed,
    loop,
    localFrame,
    localIsPlaying,
    localSpeed,
    localLoop,
  ]);

  // Individual control handlers
  const handleIndividualPlay = useCallback(() => {
    if (dotLottieRef.current && onIndividualControl) {
      try {
        dotLottieRef.current.play();
        setLocalIsPlaying(true);
        onIndividualControl(playerId, 'play');
      } catch (err) {
        console.error(`❌ [REACT-CONTAINER-${playerId}] Individual play failed:`, err);
      }
    }
  }, [playerId, onIndividualControl]);

  const handleIndividualPause = useCallback(() => {
    if (dotLottieRef.current && onIndividualControl) {
      try {
        dotLottieRef.current.pause();
        setLocalIsPlaying(false);
        onIndividualControl(playerId, 'pause');
      } catch (err) {
        console.error(`❌ [REACT-CONTAINER-${playerId}] Individual pause failed:`, err);
      }
    }
  }, [playerId, onIndividualControl]);

  const handleIndividualStop = useCallback(() => {
    if (dotLottieRef.current && onIndividualControl) {
      try {
        dotLottieRef.current.stop();
        setLocalIsPlaying(false);
        setLocalFrame(0);
        onIndividualControl(playerId, 'stop');
      } catch (err) {
        console.error(`❌ [REACT-CONTAINER-${playerId}] Individual stop failed:`, err);
      }
    }
  }, [playerId, onIndividualControl]);

  const handleIndividualSeek = useCallback(
    (frame: number) => {
      if (dotLottieRef.current && onIndividualControl) {
        try {
          dotLottieRef.current.seek(frame);
          setLocalFrame(frame);
          onIndividualControl(playerId, 'seek', { frame });
        } catch (err) {
          console.error(`❌ [REACT-CONTAINER-${playerId}] Individual seek failed:`, err);
        }
      }
    },
    [playerId, onIndividualControl]
  );

  const handleIndividualSpeedChange = useCallback(
    (speed: number) => {
      if (dotLottieRef.current && onIndividualControl) {
        try {
          dotLottieRef.current.setSpeed(speed);
          setLocalSpeed(speed);
          onIndividualControl(playerId, 'setSpeed', { speed });
        } catch (err) {
          console.error(`❌ [REACT-CONTAINER-${playerId}] Individual speed change failed:`, err);
        }
      }
    },
    [playerId, onIndividualControl]
  );

  const handleIndividualLoopToggle = useCallback(() => {
    if (dotLottieRef.current && onIndividualControl) {
      try {
        const newLoop = !localLoop;
        dotLottieRef.current.setLoop(newLoop);
        setLocalLoop(newLoop);
        onIndividualControl(playerId, 'setLoop', { loop: newLoop });
      } catch (err) {
        console.error(`❌ [REACT-CONTAINER-${playerId}] Individual loop toggle failed:`, err);
      }
    }
  }, [playerId, localLoop, onIndividualControl]);

  const displayFrame = globalSyncEnabled ? currentFrame : localFrame;
  const displayTotalFrames = totalFrames;
  const displayIsPlaying = globalSyncEnabled ? isPlaying : localIsPlaying;
  const displaySpeed = globalSyncEnabled ? speed : localSpeed;
  const displayLoop = globalSyncEnabled ? loop : localLoop;
  const displayZoom = globalSyncEnabled ? globalZoom : localZoom;

  const getPlayerTypeLabel = (playerType: string): string => {
    return playerType === 'dotlottie' ? 'DotLottie React' : playerType;
  };

  const getPlayerTypeColor = (playerType: string): string => {
    return playerType === 'dotlottie' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900">Player {playerId.slice(-6)}</h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getPlayerTypeColor(type)}`}
          >
            {getPlayerTypeLabel(type)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'ready'
                ? 'bg-green-400'
                : status === 'loading'
                  ? 'bg-yellow-400 animate-pulse'
                  : status === 'error'
                    ? 'bg-red-400'
                    : 'bg-gray-300'
            }`}
          />

          {/* Active Indicator */}
          {isActive && (
            <div className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              Active
            </div>
          )}
        </div>
      </div>

      {/* Player Container */}
      <div
        className={`player-container relative min-h-[300px] max-h-[60vh] aspect-square ${!file ? 'bg-gray-100' : 'bg-gray-50'}`}
      >
        {!file ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg
                className="mx-auto w-8 h-8 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8m-8 0v1a1 1 0 001 1h6a1 1 0 001-1V4"
                />
              </svg>
              <p className="text-sm">No animation loaded</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="w-full h-full overflow-hidden"
              style={{
                transform: `scale(${displayZoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease',
              }}
            >
              <DotLottieReact
                ref={dotLottieRef}
                src={file.url}
                autoplay={false}
                loop={displayLoop}
                speed={displaySpeed}
                className="w-full h-full"
                onLoad={handleLoad}
                onError={handleError}
              />
            </div>

            {/* Loading Overlay */}
            {status === 'loading' && (
              <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                  <p className="text-sm text-gray-600">Loading animation...</p>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {status === 'error' && error && (
              <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto w-8 h-8 text-red-400 mb-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-600">Failed to load</p>
                  <p className="text-xs text-red-500 mt-1">{error}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Individual Controls - Only show when sync is disabled */}
      {!globalSyncEnabled && status === 'ready' && (
        <div className="border-t border-gray-200 p-1 bg-gray-50">
          <div className="flex items-center justify-between space-x-1">
            {/* Play/Pause/Stop */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleIndividualPlay}
                disabled={displayIsPlaying}
                className="w-6 h-6 rounded bg-green-100 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 text-green-700 text-xs flex items-center justify-center"
                title="Play"
              >
                ▶
              </button>
              <button
                onClick={handleIndividualPause}
                disabled={!displayIsPlaying}
                className="w-6 h-6 rounded bg-yellow-100 hover:bg-yellow-200 disabled:bg-gray-100 disabled:text-gray-400 text-yellow-700 text-xs flex items-center justify-center"
                title="Pause"
              >
                ⏸
              </button>
              <button
                onClick={handleIndividualStop}
                className="w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-700 text-xs flex items-center justify-center"
                title="Stop"
              >
                ⏹
              </button>
            </div>

            {/* Frame Info */}
            <div className="text-xs text-gray-600 min-w-0">
              {Math.max(0, Math.round(displayFrame))}/{Math.max(0, displayTotalFrames - 1)}
            </div>

            {/* Speed Control */}
            <select
              value={displaySpeed}
              onChange={(e) => handleIndividualSpeedChange(parseFloat(e.target.value))}
              className="text-xs border border-gray-300 rounded px-1 py-0 bg-white w-12"
              title="Speed"
            >
              <option value="0.25">0.25x</option>
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>

            {/* Loop Toggle */}
            <button
              onClick={handleIndividualLoopToggle}
              className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                displayLoop ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
              title="Toggle Loop"
            >
              🔄
            </button>
          </div>

          {/* Seek Slider */}
          {displayTotalFrames > 0 && (
            <div className="mt-1">
              <input
                type="range"
                min="0"
                max={Math.max(0, displayTotalFrames - 1)}
                value={Math.max(0, Math.min(displayTotalFrames - 1, Math.round(displayFrame)))}
                onChange={(e) => handleIndividualSeek(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(displayFrame / (displayTotalFrames - 1)) * 100}%, #e5e7eb ${(displayFrame / (displayTotalFrames - 1)) * 100}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
