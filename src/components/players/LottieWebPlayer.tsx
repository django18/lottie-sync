import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { BasePlayerProps } from './PlayerWrapper';

export interface LottieWebPlayerRef {
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

interface LottieWebPlayerProps extends BasePlayerProps {
  renderer?: 'svg' | 'canvas' | 'html';
}

export const LottieWebPlayer = forwardRef<LottieWebPlayerRef, LottieWebPlayerProps>(
  (
    {
      animationData,
      autoplay = false,
      loop = false,
      speed = 1,
      renderer = 'svg',
      className = '',
      onReady,
      onError,
      onFrame,
      onComplete,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lottieInstanceRef = useRef<any>(null);
    const frameUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        if (lottieInstanceRef.current) {
          // If we're at the end, reset to beginning before playing
          const totalFrames = lottieInstanceRef.current.totalFrames || 0;
          const currentFrame = lottieInstanceRef.current.currentFrame || 0;

          if (totalFrames > 0 && currentFrame >= totalFrames - 1) {
            lottieInstanceRef.current.goToAndStop(0, true);
          }

          lottieInstanceRef.current.play();
          startFrameTracking();
        }
      },
      pause: () => {
        if (lottieInstanceRef.current) {
          lottieInstanceRef.current.pause();
          stopFrameTracking();
        }
      },
      stop: () => {
        if (lottieInstanceRef.current) {
          lottieInstanceRef.current.stop();
          stopFrameTracking();
        }
      },
      seek: (frame: number) => {
        if (lottieInstanceRef.current) {
          lottieInstanceRef.current.goToAndStop(frame, true);
        }
      },
      setSpeed: (newSpeed: number) => {
        if (lottieInstanceRef.current) {
          lottieInstanceRef.current.setSpeed(newSpeed);
        }
      },
      setLoop: (newLoop: boolean) => {
        if (lottieInstanceRef.current) {
          lottieInstanceRef.current.loop = newLoop;
        }
      },
      getCurrentFrame: () => {
        return lottieInstanceRef.current?.currentFrame || 0;
      },
      getTotalFrames: () => {
        return lottieInstanceRef.current?.totalFrames || 0;
      },
      getDuration: () => {
        return lottieInstanceRef.current?.getDuration() || 0;
      },
    }));

    // Start frame update tracking
    const startFrameTracking = () => {
      if (frameUpdateIntervalRef.current) {
        clearInterval(frameUpdateIntervalRef.current);
      }

      frameUpdateIntervalRef.current = setInterval(() => {
        if (lottieInstanceRef.current && onFrame) {
          const currentFrame = lottieInstanceRef.current.currentFrame || 0;
          const duration = lottieInstanceRef.current.getDuration() || 0;
          const frameRate = animationData?.fr || 30;
          const currentTime = duration > 0 ? currentFrame / frameRate : 0;

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

    // Initialize Lottie instance
    useEffect(() => {
      if (!animationData || !containerRef.current) {
        return;
      }

      let isMounted = true;
      setIsLoading(true);
      setError(null);
      setIsReady(false);

      const initializeLottie = async () => {
        try {
          console.log('🎬 [LOTTIE-WEB] Initializing Lottie Web player...');

          // Dynamic import to avoid SSR issues
          const lottie = await import('lottie-web');

          if (!isMounted) return;

          // Clear container
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }

          // Create Lottie instance
          const instance = lottie.default.loadAnimation({
            container: containerRef.current!,
            animationData: animationData,
            renderer: renderer,
            loop: loop,
            autoplay: false, // We'll control playback manually
            rendererSettings: {
              // SVG renderer settings
              preserveAspectRatio: 'xMidYMid meet',
              // Canvas renderer settings
              clearCanvas: true,
              progressiveLoad: false,
              hideOnTransparent: true,
            },
          });

          if (!isMounted) {
            instance.destroy();
            return;
          }

          // Set initial speed
          instance.setSpeed(speed);

          // Event handlers
          instance.addEventListener('DOMLoaded', () => {
            if (!isMounted) return;
            console.log('✅ [LOTTIE-WEB] Animation loaded and ready');

            // Ensure we start at frame 0 for consistent initial state
            instance.goToAndStop(0, true);

            setIsLoading(false);
            setIsReady(true);
            onReady?.();
          });

          instance.addEventListener('complete', () => {
            if (!isMounted) return;
            console.log('🏁 [LOTTIE-WEB] Animation complete');
            stopFrameTracking();
            onComplete?.();
          });

          instance.addEventListener('loopComplete', () => {
            if (!isMounted) return;
            console.log('🔄 [LOTTIE-WEB] Loop complete');
          });

          instance.addEventListener('data_ready', () => {
            if (!isMounted) return;
            console.log('📊 [LOTTIE-WEB] Data ready');
          });

          instance.addEventListener('data_failed', (error) => {
            if (!isMounted) return;
            console.error('❌ [LOTTIE-WEB] Data failed:', error);
            const errorMsg = 'Failed to load animation data';
            setError(errorMsg);
            setIsLoading(false);
            onError?.(errorMsg);
          });

          lottieInstanceRef.current = instance;
        } catch (error) {
          if (!isMounted) return;
          console.error('❌ [LOTTIE-WEB] Failed to initialize:', error);
          const errorMsg = `Failed to initialize Lottie Web: ${error instanceof Error ? error.message : error}`;
          setError(errorMsg);
          setIsLoading(false);
          onError?.(errorMsg);
        }
      };

      initializeLottie();

      return () => {
        isMounted = false;
        stopFrameTracking();
        if (lottieInstanceRef.current) {
          lottieInstanceRef.current.destroy();
          lottieInstanceRef.current = null;
        }
      };
    }, [animationData, renderer, onReady, onError, onComplete]);

    // Handle autoplay changes
    useEffect(() => {
      if (!lottieInstanceRef.current || !isReady) return;

      if (autoplay) {
        lottieInstanceRef.current.play();
        startFrameTracking();
      } else {
        lottieInstanceRef.current.pause();
        stopFrameTracking();
      }
    }, [autoplay, isReady]);

    // Handle speed changes
    useEffect(() => {
      if (lottieInstanceRef.current && isReady) {
        lottieInstanceRef.current.setSpeed(speed);
      }
    }, [speed, isReady]);

    // Handle loop changes
    useEffect(() => {
      if (lottieInstanceRef.current && isReady) {
        lottieInstanceRef.current.loop = loop;
      }
    }, [loop, isReady]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopFrameTracking();
      };
    }, []);

    return (
      <div className={`lottie-web-player relative ${className}`}>
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            minHeight: '200px',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 bg-opacity-90 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-gray-600">Loading Lottie Web...</p>
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
              <p className="text-sm text-red-600">Lottie Web Error</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Player Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
          Lottie Web
        </div>
      </div>
    );
  }
);
