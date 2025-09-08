import { useRef, useEffect, useState, useCallback } from 'react';
import type { PlayerAdapter } from '../services/playerService';
import { ErrorDisplay } from './ErrorDisplay';

interface PlayerContainerProps {
  playerId: string;
  type: string;
  file?: any;
  isActive?: boolean;
  onPlayerRef?: (ref: HTMLDivElement | null) => void;
  playerStatus?: 'idle' | 'loading' | 'ready' | 'error';
  playerAdapter?: PlayerAdapter;
  globalSyncEnabled?: boolean;
  onIndividualControl?: (playerId: string, action: string, data?: any) => void;
  currentFrame?: number;
  totalFrames?: number;
  isPlaying?: boolean;
  speed?: number;
  loop?: boolean;
  globalZoom?: number;
  className?: string;
  retryCount?: number;
  onRetry?: () => void;
}

export function PlayerContainer({
  playerId,
  type,
  file,
  isActive = false,
  onPlayerRef,
  playerStatus,
  playerAdapter,
  globalSyncEnabled = true,
  onIndividualControl,
  currentFrame = 0,
  totalFrames = 0,
  isPlaying = false,
  speed = 1,
  loop = false,
  globalZoom = 1,
  className = '',
  retryCount = 0,
  onRetry,
}: PlayerContainerProps) {
  console.log(`📦 [CONTAINER-${playerId}] PlayerContainer render with props:`, {
    playerId: playerId.slice(-6),
    type,
    hasFile: !!file,
    fileName: file?.name,
    isActive,
    playerStatus,
    hasAdapter: !!playerAdapter,
    globalSyncEnabled,
    currentFrame,
    totalFrames,
    isPlaying,
    speed,
    loop,
    globalZoom,
    className,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  console.log(`🔗 [CONTAINER-${playerId}] Container ref initialized`);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localFrame, setLocalFrame] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(1);
  const [localLoop, setLocalLoop] = useState(false);
  const [localZoom, setLocalZoom] = useState(1);

  const hasCalledPlayerRef = useRef(false);

  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);
  console.log(
    `🔄 [CONTAINER-${playerId}] hasCalledPlayerRef initialized:`,
    hasCalledPlayerRef.current
  );

  useEffect(() => {
    console.log(`🎯 [CONTAINER-${playerId}] onPlayerRef effect triggered`);
    console.log(`🔍 [CONTAINER-${playerId}] Effect conditions:`, {
      hasContainerRef: !!containerRef.current,
      hasOnPlayerRef: !!onPlayerRef,
      hasNotCalledBefore: !hasCalledPlayerRef.current,
      containerElement: containerRef.current
        ? {
            tagName: containerRef.current.tagName,
            className: containerRef.current.className,
            id: containerRef.current.id,
            clientWidth: containerRef.current.clientWidth,
            clientHeight: containerRef.current.clientHeight,
            isConnected: containerRef.current.isConnected,
            offsetParent: !!containerRef.current.offsetParent,
          }
        : 'null',
    });

    if (containerRef.current && onPlayerRef && !hasCalledPlayerRef.current) {
      console.log(
        `🏗️ [CONTAINER-${playerId}] Setting up container reference - calling onPlayerRef`
      );
      hasCalledPlayerRef.current = true;
      console.log(`🔐 [CONTAINER-${playerId}] Marked hasCalledPlayerRef as true`);
      onPlayerRef(containerRef.current);
      console.log(`✅ [CONTAINER-${playerId}] onPlayerRef callback completed`);
    } else {
      console.log(`⏸️ [CONTAINER-${playerId}] Skipping onPlayerRef call - conditions not met`);
    }
  }, [onPlayerRef, playerId]);

  useEffect(() => {
    console.log(`📊 [CONTAINER-${playerId}] Status effect triggered`);
    console.log(`🔍 [CONTAINER-${playerId}] Status effect conditions:`, {
      playerStatus,
      hasFile: !!file,
      fileName: file?.name,
      hasContainerRef: !!containerRef.current,
      containerConnected: containerRef.current?.isConnected,
    });

    if (playerStatus) {
      console.log(`📋 [CONTAINER-${playerId}] Using provided playerStatus: ${playerStatus}`);
      setStatus(playerStatus);
    } else if (file && containerRef.current) {
      console.log(
        `⏳ [CONTAINER-${playerId}] File and container ready - setting status to 'loading'`
      );
      setStatus('loading');
      setError(null);
    } else if (!file) {
      console.log(`💤 [CONTAINER-${playerId}] No file - setting status to 'idle'`);
      setStatus('idle');
      setError(null);
    } else {
      console.log(`⚠️ [CONTAINER-${playerId}] Unexpected status condition - no action taken`);
    }
  }, [file, playerStatus]);

  // Update local state when global state changes or when sync is enabled
  useEffect(() => {
    console.log(`🔄 [CONTAINER-${playerId}] Global sync effect triggered`);
    console.log(`🌍 [CONTAINER-${playerId}] Global sync state:`, {
      globalSyncEnabled,
      currentFrame,
      isPlaying,
      speed,
      loop,
      globalZoom,
    });
    console.log(`📊 [CONTAINER-${playerId}] Current local state:`, {
      localFrame,
      localIsPlaying,
      localSpeed,
      localLoop,
      localZoom,
    });

    if (globalSyncEnabled) {
      console.log(`🔄 [CONTAINER-${playerId}] Updating local state from global state`);
      setLocalFrame(currentFrame);
      setLocalIsPlaying(isPlaying);
      setLocalSpeed(speed);
      setLocalLoop(loop);
      setLocalZoom(globalZoom);
      console.log(`✅ [CONTAINER-${playerId}] Local state updated to match global`);
    } else {
      console.log(`🚫 [CONTAINER-${playerId}] Global sync disabled - keeping local state`);
    }
  }, [globalSyncEnabled, currentFrame, isPlaying, speed, loop, globalZoom]);

  // For individual mode, listen to frame updates from player adapter
  useEffect(() => {
    console.log(`🎧 [CONTAINER-${playerId}] Individual frame listener effect triggered`);
    console.log(`🔍 [CONTAINER-${playerId}] Individual mode conditions:`, {
      globalSyncEnabled,
      hasPlayerAdapter: !!playerAdapter,
      status,
      shouldSetupListener: !globalSyncEnabled && !!playerAdapter && status === 'ready',
    });

    if (!globalSyncEnabled && playerAdapter && status === 'ready') {
      console.log(`🎧 [CONTAINER-${playerId}] Setting up individual frame update listener`);

      const handleFrameUpdate = (data: { frame: number; time: number }) => {
        console.log(
          `🎬 [CONTAINER-${playerId}] Individual frame update: ${data.frame} (time: ${data.time})`
        );
        setLocalFrame(data.frame);
      };

      playerAdapter.addEventListener('frame', handleFrameUpdate);
      console.log(`✅ [CONTAINER-${playerId}] Frame update listener attached`);

      return () => {
        console.log(`🧹 [CONTAINER-${playerId}] Removing frame update listener`);
        playerAdapter.removeEventListener('frame', handleFrameUpdate);
        console.log(`✅ [CONTAINER-${playerId}] Frame update listener removed`);
      };
    } else {
      console.log(`⏸️ [CONTAINER-${playerId}] Not setting up frame listener - conditions not met`);
    }
  }, [globalSyncEnabled, playerAdapter, status]);

  const displayFrame = globalSyncEnabled ? currentFrame : localFrame;
  const displayTotalFrames = playerAdapter ? playerAdapter.getTotalFrames() : totalFrames;
  const displayIsPlaying = globalSyncEnabled ? isPlaying : localIsPlaying;
  const displaySpeed = globalSyncEnabled ? speed : localSpeed;
  const displayLoop = globalSyncEnabled ? loop : localLoop;
  const displayZoom = globalSyncEnabled ? globalZoom : localZoom;

  console.log(`🎭 [CONTAINER-${playerId}] Display state calculated:`, {
    syncMode: globalSyncEnabled ? 'global' : 'individual',
    displayFrame: displayFrame.toFixed(2),
    displayTotalFrames,
    displayIsPlaying,
    displaySpeed,
    displayLoop,
    displayZoom,
    adapterFrames: playerAdapter ? playerAdapter.getTotalFrames() : 'no adapter',
    globalValues: { currentFrame, totalFrames, isPlaying, speed, loop, globalZoom },
    localValues: { localFrame, localIsPlaying, localSpeed, localLoop, localZoom },
  });

  const handleIndividualPlay = useCallback(() => {
    if (playerAdapter && onIndividualControl) {
      playerAdapter.play();
      setLocalIsPlaying(true);
      onIndividualControl(playerId, 'play');
    }
  }, [playerAdapter, playerId, onIndividualControl]);

  const handleIndividualPause = useCallback(() => {
    if (playerAdapter && onIndividualControl) {
      playerAdapter.pause();
      setLocalIsPlaying(false);
      onIndividualControl(playerId, 'pause');
    }
  }, [playerAdapter, playerId, onIndividualControl]);

  const handleIndividualStop = useCallback(() => {
    if (playerAdapter && onIndividualControl) {
      playerAdapter.stop();
      setLocalIsPlaying(false);
      setLocalFrame(0);
      onIndividualControl(playerId, 'stop');
    }
  }, [playerAdapter, playerId, onIndividualControl]);

  const handleIndividualSeek = useCallback(
    (frame: number) => {
      if (playerAdapter && onIndividualControl) {
        playerAdapter.seek(frame);
        setLocalFrame(frame);
        onIndividualControl(playerId, 'seek', { frame });
      }
    },
    [playerAdapter, playerId, onIndividualControl]
  );

  const handleIndividualSpeedChange = useCallback(
    (speed: number) => {
      if (playerAdapter && onIndividualControl) {
        playerAdapter.setSpeed(speed);
        setLocalSpeed(speed);
        onIndividualControl(playerId, 'setSpeed', { speed });
      }
    },
    [playerAdapter, playerId, onIndividualControl]
  );

  const handleIndividualLoopToggle = useCallback(() => {
    if (playerAdapter && onIndividualControl) {
      const newLoop = !localLoop;
      playerAdapter.setLoop(newLoop);
      setLocalLoop(newLoop);
      onIndividualControl(playerId, 'setLoop', { loop: newLoop });
    }
  }, [playerAdapter, playerId, localLoop, onIndividualControl]);

  const getPlayerTypeLabel = (playerType: string): string => {
    return playerType === 'dotlottie' ? 'DotLottie' : playerType;
  };

  const getPlayerTypeColor = (playerType: string): string => {
    return playerType === 'dotlottie' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="text-xs font-medium text-gray-900">Player {playerId.slice(-6)}</h3>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getPlayerTypeColor(type)}`}
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
            <div className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              Active
            </div>
          )}
        </div>
      </div>

      {/* Player Container */}
      <div className={`player-container relative flex-1 ${!file ? 'bg-gray-100' : 'bg-gray-50'}`}>
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
              ref={(element) => {
                containerRef.current = element;
                if (element) {
                  console.log(`🎯 [CONTAINER-${playerId}] Container ref assigned to DOM element:`, {
                    element: element.tagName,
                    id: element.id,
                    className: element.className,
                    clientWidth: element.clientWidth,
                    clientHeight: element.clientHeight,
                    offsetWidth: element.offsetWidth,
                    offsetHeight: element.offsetHeight,
                    isConnected: element.isConnected,
                    parentElement: element.parentElement?.tagName,
                    hasChildren: element.children.length,
                    currentZoom: displayZoom,
                  });
                } else {
                  console.log(`❌ [CONTAINER-${playerId}] Container ref set to null`);
                }
              }}
              className="w-full h-full overflow-hidden"
              style={{
                transform: `scale(${displayZoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease',
              }}
            />

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
              <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center p-2">
                <ErrorDisplay
                  title={`Player ${playerId.slice(-6)} Error`}
                  error={error}
                  errorType="player"
                  retryCount={retryCount}
                  onRetry={handleRetry}
                  className="text-xs max-w-full"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Minimal Individual Controls - Only show when sync is disabled */}
      {!globalSyncEnabled && status === 'ready' && playerAdapter && (
        <div className="border-t border-gray-200 p-2 bg-gray-50">
          <div className="flex items-center justify-between space-x-1 mb-1">
            {/* Play/Pause/Stop */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleIndividualPlay}
                disabled={displayIsPlaying}
                className="w-5 h-5 rounded bg-green-100 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 text-green-700 text-xs flex items-center justify-center"
                title="Play"
              >
                ▶
              </button>
              <button
                onClick={handleIndividualPause}
                disabled={!displayIsPlaying}
                className="w-5 h-5 rounded bg-yellow-100 hover:bg-yellow-200 disabled:bg-gray-100 disabled:text-gray-400 text-yellow-700 text-xs flex items-center justify-center"
                title="Pause"
              >
                ⏸
              </button>
              <button
                onClick={handleIndividualStop}
                className="w-5 h-5 rounded bg-red-100 hover:bg-red-200 text-red-700 text-xs flex items-center justify-center"
                title="Stop"
              >
                ⏹
              </button>
            </div>

            {/* Frame Info */}
            <div className="text-xs text-gray-600 min-w-0 flex-shrink-0">
              {Math.max(0, Math.round(displayFrame))}/{Math.max(0, displayTotalFrames - 1)}
            </div>

            {/* Speed Control */}
            <select
              value={displaySpeed}
              onChange={(e) => handleIndividualSpeedChange(parseFloat(e.target.value))}
              className="text-xs border border-gray-300 rounded px-1 py-0 bg-white w-10"
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
              className={`w-5 h-5 rounded text-xs flex items-center justify-center ${
                displayLoop ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
              title="Toggle Loop"
            >
              🔄
            </button>
          </div>

          {/* Seek Slider */}
          {displayTotalFrames > 0 && (
            <div>
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
