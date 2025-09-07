import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { BasePlayerProps } from './PlayerWrapper';

export interface DotLottiePlayerRef {
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

interface DotLottiePlayerProps extends BasePlayerProps {
  srcUrl?: string; // Original .lottie blob URL
}

export const DotLottiePlayer = forwardRef<DotLottiePlayerRef, DotLottiePlayerProps>(
  (
    {
      animationData,
      srcUrl: propSrcUrl,
      autoplay = false,
      loop = false,
      speed = 1,
      className = '',
      onReady,
      onError,
      onFrame,
      onComplete,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dotLottieInstanceRef = useRef<any>(null);
    const frameUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [srcUrl, setSrcUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        if (dotLottieInstanceRef.current) {
          // If we're at the end, reset to beginning before playing
          const totalFrames = dotLottieInstanceRef.current.totalFrames || 0;
          const currentFrame = dotLottieInstanceRef.current.currentFrame || 0;

          if (totalFrames > 0 && currentFrame >= totalFrames - 1) {
            dotLottieInstanceRef.current.setFrame(0);
          }

          dotLottieInstanceRef.current.play();
        }
      },
      pause: () => {
        if (dotLottieInstanceRef.current) {
          dotLottieInstanceRef.current.pause();
        }
      },
      stop: () => {
        if (dotLottieInstanceRef.current) {
          dotLottieInstanceRef.current.stop();
        }
      },
      seek: (frame: number) => {
        if (dotLottieInstanceRef.current) {
          // DotLottie uses setFrame method for seeking
          dotLottieInstanceRef.current.setFrame(frame);
        }
      },
      setSpeed: (newSpeed: number) => {
        if (dotLottieInstanceRef.current) {
          dotLottieInstanceRef.current.setSpeed(newSpeed);
        }
      },
      setLoop: (newLoop: boolean) => {
        if (dotLottieInstanceRef.current) {
          dotLottieInstanceRef.current.setLoop(newLoop);
        }
      },
      getCurrentFrame: () => {
        if (dotLottieInstanceRef.current) {
          // DotLottie provides direct access to currentFrame
          return dotLottieInstanceRef.current.currentFrame || 0;
        }
        return 0;
      },
      getTotalFrames: () => {
        return dotLottieInstanceRef.current?.totalFrames || 0;
      },
      getDuration: () => {
        return dotLottieInstanceRef.current?.duration || 0;
      },
    }));

    // Start frame update tracking
    const startFrameTracking = () => {
      if (frameUpdateIntervalRef.current) {
        clearInterval(frameUpdateIntervalRef.current);
      }

      frameUpdateIntervalRef.current = setInterval(() => {
        if (dotLottieInstanceRef.current && onFrame) {
          const currentFrame = dotLottieInstanceRef.current.currentFrame || 0;
          const currentTime = dotLottieInstanceRef.current.currentTime || 0;

          onFrame(currentFrame, currentTime);
        }
      }, 1000 / 30); // 30 FPS tracking
    };

    // Stop frame update tracking
    const stopFrameTracking = () => {
      if (frameUpdateIntervalRef.current) {
        clearInterval(frameUpdateIntervalRef.current);
        frameUpdateIntervalRef.current = null;
      }
    };

    // Handle src URL creation from animation data or prop
    useEffect(() => {
      if (propSrcUrl) {
        // Use original .lottie blob URL (optimal)
        setSrcUrl(propSrcUrl);
        return;
      }

      if (animationData) {
        // Create JSON blob URL as fallback
        try {
          const blob = new Blob([JSON.stringify(animationData)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          setSrcUrl(url);

          return () => URL.revokeObjectURL(url);
        } catch (error) {
          console.error('❌ [DOTLOTTIE] Failed to create blob URL:', error);
          const errorMsg = 'Failed to create animation source';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      }
    }, [animationData, propSrcUrl, onError]);

    // Initialize DotLottie instance
    useEffect(() => {
      if (!srcUrl || !canvasRef.current) {
        return;
      }

      let isMounted = true;
      setIsLoading(true);
      setError(null);
      setIsReady(false);

      const initializeDotLottie = async () => {
        try {
          console.log(
            '🎯 [DOTLOTTIE] Initializing DotLottie player with src:',
            srcUrl.slice(0, 50) + '...'
          );

          // Dynamic import to avoid SSR issues
          const { DotLottie } = await import('@lottiefiles/dotlottie-web');

          if (!isMounted) return;

          // Create DotLottie instance
          const instance = new DotLottie({
            canvas: canvasRef.current!,
            src: srcUrl,
            autoplay: false, // We'll control playback manually
            loop: loop,
            speed: speed,
          });

          if (!isMounted) {
            instance.destroy();
            return;
          }

          // Event handlers
          instance.addEventListener('load', () => {
            if (!isMounted) return;
            console.log('✅ [DOTLOTTIE] Animation loaded and ready');

            // Ensure we start at frame 0 for consistent initial state
            instance.setFrame(0);

            setIsLoading(false);
            setIsReady(true);
            onReady?.();
          });

          instance.addEventListener('loadError', (error) => {
            if (!isMounted) return;
            console.error('❌ [DOTLOTTIE] Load error:', error);
            const errorMsg = 'Failed to load animation';
            setError(errorMsg);
            setIsLoading(false);
            onError?.(errorMsg);
          });

          instance.addEventListener('complete', () => {
            if (!isMounted) return;
            console.log('🏁 [DOTLOTTIE] Animation complete');
            stopFrameTracking();
            onComplete?.();
          });

          instance.addEventListener('play', () => {
            if (!isMounted) return;
            console.log('▶️ [DOTLOTTIE] Playing');
            startFrameTracking();
          });

          instance.addEventListener('pause', () => {
            if (!isMounted) return;
            console.log('⏸️ [DOTLOTTIE] Paused');
            stopFrameTracking();
          });

          instance.addEventListener('stop', () => {
            if (!isMounted) return;
            console.log('⏹️ [DOTLOTTIE] Stopped');
            stopFrameTracking();
          });

          dotLottieInstanceRef.current = instance;
        } catch (error) {
          if (!isMounted) return;
          console.error('❌ [DOTLOTTIE] Failed to initialize:', error);
          const errorMsg = `Failed to initialize DotLottie: ${error instanceof Error ? error.message : error}`;
          setError(errorMsg);
          setIsLoading(false);
          onError?.(errorMsg);
        }
      };

      initializeDotLottie();

      return () => {
        isMounted = false;
        stopFrameTracking();
        if (dotLottieInstanceRef.current) {
          try {
            dotLottieInstanceRef.current.destroy();
          } catch (error) {
            console.warn('⚠️ [DOTLOTTIE] Error during cleanup:', error);
          }
          dotLottieInstanceRef.current = null;
        }
      };
    }, [srcUrl, loop, speed, onReady, onError, onComplete]);

    // Handle autoplay changes
    useEffect(() => {
      if (!dotLottieInstanceRef.current || !isReady) return;

      if (autoplay) {
        dotLottieInstanceRef.current.play();
        startFrameTracking();
      } else {
        dotLottieInstanceRef.current.pause();
        stopFrameTracking();
      }
    }, [autoplay, isReady]);

    // Handle speed changes
    useEffect(() => {
      if (dotLottieInstanceRef.current && isReady) {
        dotLottieInstanceRef.current.setSpeed(speed);
      }
    }, [speed, isReady]);

    // Handle loop changes
    useEffect(() => {
      if (dotLottieInstanceRef.current && isReady) {
        dotLottieInstanceRef.current.setLoop(loop);
      }
    }, [loop, isReady]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopFrameTracking();
      };
    }, []);

    return (
      <div className={`dotlottie-player relative ${className}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{
            minHeight: '200px',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
              <p className="text-sm text-gray-600">Loading DotLottie...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
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
              <p className="text-sm text-red-600">DotLottie Error</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Player Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
          DotLottie
        </div>
      </div>
    );
  }
);
