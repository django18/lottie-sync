import { useMemo, useCallback, useRef, useEffect } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useSelector } from '@xstate/react';
import type { SyncActorRef } from '../../machines/syncMachine';

export interface BasePlayerRef {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (frame: number) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  getCurrentFrame: () => number;
  getTotalFrames: () => number;
  getDuration: () => number;
}

export interface BasePlayerProps {
  animationData?: any;
  srcUrl?: string;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  className?: string;
  onReady?: () => void;
  onError?: (error: string) => void;
  onFrame?: (frame: number, time: number) => void;
  onComplete?: () => void;
}

interface PlayerWrapperProps {
  actorRef: SyncActorRef;
  playerId: string;
  PlayerComponent: React.ForwardRefExoticComponent<
    BasePlayerProps & React.RefAttributes<BasePlayerRef>
  >;
  playerProps?: Record<string, unknown>;
  className?: string;
}

function PlayerErrorBoundary({
  children,
  playerId,
}: {
  children: React.ReactNode;
  playerId: string;
}) {
  return (
    <ErrorBoundary
      fallback={({ error }: { error: Error }) => (
        <div className="player-error p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-red-800">Player Error</span>
          </div>
          <p className="mt-1 text-sm text-red-600">
            Player {playerId.slice(-6)} encountered an error: {error.message}
          </p>
        </div>
      )}
      onError={(error) => {
        console.error(`🚨 [PLAYER-WRAPPER-${playerId}] React Error Boundary caught:`, error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function PlayerWrapper({
  actorRef,
  playerId,
  PlayerComponent,
  playerProps = {},
  className = '',
}: PlayerWrapperProps) {
  const context = useSelector(actorRef, (state: any) => state.context);

  const {
    animationData,
    dotLottieSrcUrl,
    sourceFormat,
    playbackState,
    currentFrame,
    speed,
    loop,
    zoom,
    synchronizationMode,
  } = context;

  // Find this player in the context
  const player = context.players.find((p: any) => p.id === playerId);

  // Ref to control the player imperatively
  const playerRef = useRef<BasePlayerRef>(null);
  const lastSyncFrame = useRef<number>(-1);
  const lastSyncTime = useRef<number>(0);

  const handleReady = useCallback(() => {
    console.log(`✅ [PLAYER-WRAPPER-${playerId}] Player ready`);
    actorRef.send({ type: 'PLAYER_READY', playerId });
  }, [actorRef, playerId]);

  const handleError = useCallback(
    (error: string) => {
      console.error(`❌ [PLAYER-WRAPPER-${playerId}] Player error:`, error);
      actorRef.send({ type: 'PLAYER_ERROR', playerId, error });
    },
    [actorRef, playerId]
  );

  const lastFrameUpdateRef = useRef<number>(0);
  const lastFrameValueRef = useRef<number>(-1);

  const handleFrame = useCallback(
    (frame: number, time: number) => {
      const now = Date.now();
      const frameChanged = Math.abs(frame - lastFrameValueRef.current) >= 0.5;

      // Balanced throttling: update on frame changes or every 66ms (~15 FPS)
      // This provides smooth seek bar updates while reducing unnecessary state changes
      if (frameChanged || now - lastFrameUpdateRef.current >= 66) {
        lastFrameUpdateRef.current = now;
        lastFrameValueRef.current = frame;
        actorRef.send({ type: 'FRAME_UPDATE', frame, time, playerId });
      }
    },
    [actorRef, playerId]
  );

  const handleComplete = useCallback(() => {
    console.log(`🏁 [PLAYER-WRAPPER-${playerId}] Animation complete`);
    actorRef.send({ type: 'ANIMATION_COMPLETE', playerId });
  }, [actorRef, playerId]);

  // Sync player state with machine state
  useEffect(() => {
    if (!playerRef.current || synchronizationMode !== 'global') return;

    const player = playerRef.current;
    const currentTime = Date.now();

    // Balanced throttling for smooth playback with good performance
    if (currentTime - lastSyncTime.current < 33) return; // ~30fps throttle

    try {
      // Handle seeking (most important for immediate response)  
      if (Math.abs(currentFrame - lastSyncFrame.current) > 0.5) {
        player.seek(Math.round(currentFrame));
        lastSyncFrame.current = currentFrame;
      }

      // Handle playback state
      if (playbackState === 'playing') {
        player.play();
      } else if (playbackState === 'paused' || playbackState === 'stopped') {
        player.pause();
      }

      // Handle speed changes
      player.setSpeed(speed);

      // Handle loop changes
      player.setLoop(loop);

      lastSyncTime.current = currentTime;
    } catch (error) {
      console.warn(`⚠️ [PLAYER-WRAPPER-${playerId}] Sync control failed:`, error);
    }
  }, [playerId, synchronizationMode, currentFrame, playbackState, speed, loop]);

  // Memoize player-specific props to prevent unnecessary re-renders
  const playerSpecificProps = useMemo((): Partial<BasePlayerProps> => {
    const baseProps: Partial<BasePlayerProps> = {
      autoplay: playbackState === 'playing',
      loop,
      speed,
      onReady: handleReady,
      onError: handleError,
      onFrame: handleFrame,
      onComplete: handleComplete,
    };

    if (!player) {
      return baseProps;
    }

    // DotLottie player - prefers original .lottie blob URL, falls back to JSON blob
    if (player.type === 'dotlottie') {
      if (dotLottieSrcUrl && sourceFormat === 'lottie') {
        // Use original .lottie blob URL (optimal for DotLottie)
        return {
          ...baseProps,
          srcUrl: dotLottieSrcUrl,
        };
      } else if (animationData) {
        // Create JSON blob URL as fallback
        return {
          ...baseProps,
          animationData,
        };
      }
    }

    // Lottie Web player - always uses JSON animation data
    if (player.type === 'lottie-web') {
      return {
        ...baseProps,
        animationData,
        // Note: Asset paths in animationData are already rewritten for Lottie Web
      };
    }

    return baseProps;
  }, [
    playbackState,
    loop,
    speed,
    handleReady,
    handleError,
    handleFrame,
    handleComplete,
    player,
    dotLottieSrcUrl,
    sourceFormat,
    animationData,
  ]);

  // Don't render if no animation data is available
  if (!animationData && !dotLottieSrcUrl) {
    return (
      <div className={`player-wrapper-empty w-full h-full ${className}`}>
        <div className="flex items-center justify-center w-full h-full bg-gray-100">
          <div className="text-center text-gray-500">
            <svg
              className="mx-auto w-12 h-12 mb-2"
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
            <p className="text-xs text-gray-400">Player {playerId.slice(-6)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlayerErrorBoundary playerId={playerId}>
      <div className={`player-wrapper w-full h-full relative ${className}`}>
        <div
          className="w-full h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease',
          }}
        >
          <PlayerComponent
            ref={playerRef}
            {...playerSpecificProps}
            {...playerProps}
            className="w-full h-full"
          />
        </div>

        {/* Player Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-2 left-2 text-xs bg-black bg-opacity-75 text-white px-2 py-1 rounded z-10">
            <div>ID: {playerId.slice(-6)}</div>
            <div>Type: {player?.type || 'unknown'}</div>
            <div>Status: {player?.status || 'unknown'}</div>
            <div>Format: {sourceFormat || 'none'}</div>
            <div>Frame: {Math.round(currentFrame)}</div>
            <div>Speed: {speed}x</div>
            <div>Sync: {synchronizationMode}</div>
          </div>
        )}
      </div>
    </PlayerErrorBoundary>
  );
}
