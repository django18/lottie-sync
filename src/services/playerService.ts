import type { PlayerType, PlayerConfig, LottieFile } from '../types';

export interface PlayerAdapter {
  initialize(container: HTMLElement, file: LottieFile, config: PlayerConfig): Promise<any>;
  play(): void;
  pause(): void;
  stop(): void;
  seek(frame: number): void;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
  getCurrentFrame(): number;
  getTotalFrames(): number;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
  addEventListener(event: string, callback: Function): void;
  removeEventListener(event: string, callback: Function): void;
}

export class DotLottieAdapter implements PlayerAdapter {
  private instance: any = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frameUpdateInterval: number | null = null;
  private initializationAttempts: number = 0;
  private lastFailureTime: number = 0;
  private isDestroyed: boolean = false;
  private isInitializing: boolean = false;
  private readyPromise: Promise<any> | null = null;

  async initialize(container: HTMLElement, file: LottieFile, config: PlayerConfig): Promise<any> {
    const initId = `${config.id || 'unknown'}-${this.initializationAttempts + 1}`;
    const initStartTime = performance.now();

    console.log(`🎬 [DOTLOTTIE-${initId}] INITIALIZATION START`);
    console.log(`📋 [DOTLOTTIE-${initId}] Config:`, {
      playerId: config.id,
      type: config.type,
      autoplay: config.autoplay,
      loop: config.loop,
      speed: config.speed,
      renderer: config.renderer,
      fileName: file.name,
      fileSize: file.file?.size || 'unknown',
    });
    console.log(`🏠 [DOTLOTTIE-${initId}] Container details:`, {
      tagName: container.tagName,
      id: container.id,
      className: container.className,
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight,
      scrollWidth: container.scrollWidth,
      scrollHeight: container.scrollHeight,
      isConnected: container.isConnected,
      offsetParent: !!container.offsetParent,
      children: container.children.length,
      hasExistingCanvas: !!container.querySelector('canvas'),
    });

    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      console.log(`⏳ [DOTLOTTIE-${initId}] Already initializing, waiting for completion...`);
      if (this.readyPromise) {
        console.log(`🔄 [DOTLOTTIE-${initId}] Returning existing ready promise`);
        return this.readyPromise;
      }
    }

    // Prevent initialization on destroyed instance
    if (this.isDestroyed) {
      console.error(`💀 [DOTLOTTIE-${initId}] Cannot initialize destroyed adapter`);
      throw new Error('Cannot initialize destroyed adapter');
    }

    this.isInitializing = true;
    this.initializationAttempts++;

    console.log(
      `🚦 [DOTLOTTIE-${initId}] Flags set - isInitializing: true, attempts: ${this.initializationAttempts}`
    );

    // Store the ready promise to avoid duplicate initialization
    this.readyPromise = this._performInitialization(container, file, config);

    try {
      console.log(`⚡ [DOTLOTTIE-${initId}] Starting initialization promise...`);
      const result = await this.readyPromise;
      this.isInitializing = false;
      const initEndTime = performance.now();
      console.log(
        `🎊 [DOTLOTTIE-${initId}] INITIALIZATION SUCCESS in ${(initEndTime - initStartTime).toFixed(2)}ms`
      );
      return result;
    } catch (error) {
      this.isInitializing = false;
      this.readyPromise = null;
      const initErrorTime = performance.now();
      console.error(
        `💥 [DOTLOTTIE-${initId}] INITIALIZATION FAILED in ${(initErrorTime - initStartTime).toFixed(2)}ms:`,
        error
      );
      throw error;
    }
  }

  private async _performInitialization(
    container: HTMLElement,
    file: LottieFile,
    config: PlayerConfig
  ): Promise<any> {
    const performanceId = `${config.id || 'unknown'}-${this.initializationAttempts}`;
    const perfStartTime = performance.now();

    // Circuit breaker: if we've had recent failures, add a delay
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    console.log(
      `🔧 [DOTLOTTIE-${performanceId}] Circuit breaker check - attempts: ${this.initializationAttempts}, time since last failure: ${timeSinceLastFailure}ms`
    );

    if (this.initializationAttempts > 1 && timeSinceLastFailure < 2000) {
      console.log(
        `🚧 [DOTLOTTIE-${performanceId}] Circuit breaker ACTIVE - adding 1000ms delay due to recent failure`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`⏰ [DOTLOTTIE-${performanceId}] Circuit breaker delay completed`);
    }

    try {
      console.log(
        `🎯 [DOTLOTTIE-${performanceId}] Starting _performInitialization attempt ${this.initializationAttempts}`
      );
      console.log(`📁 [DOTLOTTIE-${performanceId}] File details:`, {
        name: file.name,
        type: file.type,
        url: file.url ? file.url.substring(0, 100) + '...' : 'no url',
        fileSize: file.file?.size,
        fileType: file.file?.type,
      });

      // Destroy any existing instance first
      console.log(`🧨 [DOTLOTTIE-${performanceId}] Destroying any existing instance...`);
      this._destroyInstance();
      console.log(`✅ [DOTLOTTIE-${performanceId}] Existing instance destroyed`);

      console.log(`📦 [DOTLOTTIE-${performanceId}] Importing @lottiefiles/dotlottie-web...`);
      const importStartTime = performance.now();
      const { DotLottie } = await import('@lottiefiles/dotlottie-web');
      const importEndTime = performance.now();
      console.log(
        `✅ [DOTLOTTIE-${performanceId}] Import completed in ${(importEndTime - importStartTime).toFixed(2)}ms`
      );

      this.container = container;
      console.log(`🏠 [DOTLOTTIE-${performanceId}] Container reference stored`);

      // Always create a fresh canvas to avoid conflicts
      console.log(`🎨 [DOTLOTTIE-${performanceId}] Creating fresh canvas...`);
      const canvasStartTime = performance.now();
      this._createFreshCanvas(container);
      const canvasEndTime = performance.now();
      console.log(
        `✅ [DOTLOTTIE-${performanceId}] Fresh canvas created in ${(canvasEndTime - canvasStartTime).toFixed(2)}ms`
      );

      // Set up resize observer for responsive scaling
      console.log(`👁️ [DOTLOTTIE-${performanceId}] Setting up resize observer...`);
      const resizeStartTime = performance.now();
      this.setupResizeObserver();
      const resizeEndTime = performance.now();
      console.log(
        `✅ [DOTLOTTIE-${performanceId}] Resize observer setup in ${(resizeEndTime - resizeStartTime).toFixed(2)}ms`
      );

      // Use the .lottie file URL directly
      const src = file.url;
      console.log(`🔗 [DOTLOTTIE-${performanceId}] Source URL prepared:`, {
        srcLength: src ? src.length : 0,
        srcType: typeof src,
        srcPrefix: src ? src.substring(0, 50) + '...' : 'null',
      });

      console.log(`🖼️ [DOTLOTTIE-${performanceId}] Canvas state before DotLottie creation:`, {
        canvasExists: !!this.canvas,
        canvasWidth: this.canvas?.width,
        canvasHeight: this.canvas?.height,
        canvasClientWidth: this.canvas?.clientWidth,
        canvasClientHeight: this.canvas?.clientHeight,
        canvasStyle: this.canvas
          ? {
              width: this.canvas.style.width,
              height: this.canvas.style.height,
              display: this.canvas.style.display,
              border: this.canvas.style.border,
            }
          : 'no canvas',
        canvasParent: this.canvas?.parentElement?.tagName,
        canvasInDOM: this.canvas ? document.contains(this.canvas) : false,
      });

      // Create DotLottie instance
      // HACK: Force autoplay true to ensure first frame renders, then we'll control it manually
      console.log(`🏗️ [DOTLOTTIE-${performanceId}] Creating DotLottie instance...`);
      const instanceStartTime = performance.now();

      const dotLottieConfig = {
        canvas: this.canvas!,
        src,
        autoplay: true, // Force true initially to ensure first frame renders
        loop: config.loop || false,
        speed: config.speed || 1,
      };

      console.log(`⚙️ [DOTLOTTIE-${performanceId}] DotLottie config:`, {
        canvasValid: !!dotLottieConfig.canvas,
        canvasSize: dotLottieConfig.canvas
          ? `${dotLottieConfig.canvas.width}x${dotLottieConfig.canvas.height}`
          : 'invalid',
        srcValid: !!dotLottieConfig.src,
        srcLength: dotLottieConfig.src ? dotLottieConfig.src.length : 0,
        autoplay: dotLottieConfig.autoplay,
        loop: dotLottieConfig.loop,
        speed: dotLottieConfig.speed,
        originalAutoplay: config.autoplay || false,
        forcedAutoplay: true,
      });

      try {
        this.instance = new DotLottie(dotLottieConfig);
        const instanceEndTime = performance.now();
        console.log(
          `🎊 [DOTLOTTIE-${performanceId}] DotLottie instance created successfully in ${(instanceEndTime - instanceStartTime).toFixed(2)}ms`
        );
        console.log(`📊 [DOTLOTTIE-${performanceId}] Instance state after creation:`, {
          instanceExists: !!this.instance,
          instanceType: typeof this.instance,
          hasCanvas: this.instance ? !!this.instance.canvas : false,
          currentFrame: this.instance ? this.instance.currentFrame : 'N/A',
          totalFrames: this.instance ? this.instance.totalFrames : 'N/A',
          isPlaying: this.instance ? this.instance.isPlaying : 'N/A',
          frameRate: this.instance ? this.instance.frameRate : 'N/A',
        });
      } catch (instanceError) {
        const instanceErrorTime = performance.now();
        console.error(
          `💥 [DOTLOTTIE-${performanceId}] DotLottie instance creation FAILED in ${(instanceErrorTime - instanceStartTime).toFixed(2)}ms:`,
          instanceError
        );
        console.error(`💥 [DOTLOTTIE-${performanceId}] Instance error details:`, {
          errorName: instanceError instanceof Error ? instanceError.name : 'Unknown',
          errorMessage:
            instanceError instanceof Error ? instanceError.message : String(instanceError),
          errorStack: instanceError instanceof Error ? instanceError.stack : 'No stack',
          canvasValid: !!this.canvas,
          srcValid: !!src,
        });
        throw new Error(`Failed to create DotLottie instance: ${instanceError}`);
      }

      // Wait for the animation to be ready with simplified logic
      console.log(`⏳ [DOTLOTTIE-${performanceId}] Waiting for animation to be ready...`);
      const waitStartTime = performance.now();
      await this._waitForReady();
      const waitEndTime = performance.now();
      console.log(
        `🎉 [DOTLOTTIE-${performanceId}] Animation ready wait completed in ${(waitEndTime - waitStartTime).toFixed(2)}ms`
      );

      const totalPerfTime = performance.now() - perfStartTime;
      console.log(
        `🏁 [DOTLOTTIE-${performanceId}] _performInitialization COMPLETE in ${totalPerfTime.toFixed(2)}ms`
      );

      return this.instance;
    } catch (error) {
      this.lastFailureTime = Date.now();
      const totalErrorTime = performance.now() - perfStartTime;
      console.error(
        `💥 [DOTLOTTIE-${performanceId}] _performInitialization FAILED after ${totalErrorTime.toFixed(2)}ms:`,
        error
      );
      console.error(`💥 [DOTLOTTIE-${performanceId}] Error details:`, {
        attemptNumber: this.initializationAttempts,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack',
        containerValid: !!container,
        fileValid: !!file,
        canvasValid: !!this.canvas,
        instanceValid: !!this.instance,
      });
      throw new Error(
        `Failed to initialize DotLottie player (attempt ${this.initializationAttempts}): ${error}`
      );
    }
  }

  private _createFreshCanvas(container: HTMLElement): void {
    const canvasId = `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🎨 [CANVAS-${canvasId}] Creating fresh canvas...`);

    // Remove any existing canvas
    const existingCanvas = container.querySelector('canvas');
    console.log(`🔍 [CANVAS-${canvasId}] Existing canvas check:`, {
      found: !!existingCanvas,
      count: container.querySelectorAll('canvas').length,
      existingId: existingCanvas?.id || 'no-id',
      existingDimensions: existingCanvas
        ? `${existingCanvas.width}x${existingCanvas.height}`
        : 'N/A',
    });

    if (existingCanvas) {
      console.log(`🗑️ [CANVAS-${canvasId}] Removing existing canvas...`);
      existingCanvas.remove();
      console.log(`✅ [CANVAS-${canvasId}] Existing canvas removed`);
    }

    // Create new canvas
    console.log(`🆕 [CANVAS-${canvasId}] Creating new canvas element...`);
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;

    // Set canvas styles
    console.log(`🎨 [CANVAS-${canvasId}] Applying canvas styles...`);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';
    canvas.style.display = 'block';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    // canvas.style.border = '2px solid red'; // DEBUG: Removed red border

    console.log(`✅ [CANVAS-${canvasId}] Canvas styles applied`);

    // Set canvas size to fill container
    console.log(`📐 [CANVAS-${canvasId}] Calculating container dimensions...`);
    const containerRect = container.getBoundingClientRect();
    const containerWidth = Math.max(containerRect.width || 400, 400);
    const containerHeight = Math.max(containerRect.height || 400, 400);

    console.log(`📊 [CANVAS-${canvasId}] Container measurements:`, {
      boundingClientRect: {
        width: containerRect.width,
        height: containerRect.height,
        top: containerRect.top,
        left: containerRect.left,
        right: containerRect.right,
        bottom: containerRect.bottom,
      },
      clientDimensions: {
        clientWidth: container.clientWidth,
        clientHeight: container.clientHeight,
      },
      offsetDimensions: {
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight,
      },
      scrollDimensions: {
        scrollWidth: container.scrollWidth,
        scrollHeight: container.scrollHeight,
      },
      computedDimensions: {
        containerWidth,
        containerHeight,
      },
    });

    console.log(
      `🎯 [CANVAS-${canvasId}] Setting canvas backing store size to ${containerWidth}x${containerHeight}...`
    );
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    console.log(`✅ [CANVAS-${canvasId}] Canvas backing store size set`);

    console.log(`📎 [CANVAS-${canvasId}] Appending canvas to container...`);
    container.appendChild(canvas);
    console.log(`✅ [CANVAS-${canvasId}] Canvas appended to DOM`);

    // Verify canvas is properly attached
    const canvasInDOM = document.contains(canvas);
    const canvasParent = canvas.parentElement;
    const canvasComputedStyle = window.getComputedStyle(canvas);

    console.log(`🔍 [CANVAS-${canvasId}] Canvas verification after DOM attachment:`, {
      isInDOM: canvasInDOM,
      hasParent: !!canvasParent,
      parentIsContainer: canvasParent === container,
      canvasDimensions: `${canvas.width}x${canvas.height}`,
      canvasStyle: {
        width: canvas.style.width,
        height: canvas.style.height,
        display: canvas.style.display,
        border: canvas.style.border,
        objectFit: canvas.style.objectFit,
      },
      computedStyle: {
        width: canvasComputedStyle.width,
        height: canvasComputedStyle.height,
        display: canvasComputedStyle.display,
        visibility: canvasComputedStyle.visibility,
        opacity: canvasComputedStyle.opacity,
      },
      canvasClientRect: canvas.getBoundingClientRect(),
    });

    this.canvas = canvas;
    console.log(`🎊 [CANVAS-${canvasId}] Canvas creation and setup COMPLETE`);
  }

  private async _waitForReady(): Promise<void> {
    const waitId = `wait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const waitStartTime = performance.now();

    return new Promise<void>((resolve, reject) => {
      console.log(`⏳ [WAIT-${waitId}] Starting _waitForReady promise...`);
      console.log(`🔍 [WAIT-${waitId}] Initial state check:`, {
        isDestroyed: this.isDestroyed,
        instanceExists: !!this.instance,
        canvasExists: !!this.canvas,
        containerExists: !!this.container,
      });

      if (this.isDestroyed) {
        console.error(`💀 [WAIT-${waitId}] Adapter was destroyed during initialization`);
        reject(new Error('Adapter was destroyed during initialization'));
        return;
      }

      let resolved = false;
      let timeoutId: number;

      console.log(`🎧 [WAIT-${waitId}] Setting up ready promise with events...`);
      console.log(`📊 [WAIT-${waitId}] Instance details at setup:`, {
        instanceType: typeof this.instance,
        currentFrame: this.instance?.currentFrame,
        totalFrames: this.instance?.totalFrames,
        isPlaying: this.instance?.isPlaying,
        frameRate: this.instance?.frameRate,
        canvas: this.instance?.canvas ? 'exists' : 'missing',
      });

      let frameCheckInterval: number;
      let eventCheckCount = 0;

      const cleanup = () => {
        console.log(`🧹 [WAIT-${waitId}] Cleaning up event listeners and intervals...`);
        if (this.instance) {
          this.instance.removeEventListener('ready', onReady);
          this.instance.removeEventListener('load', onLoad);
          this.instance.removeEventListener('error', onError);
          console.log(`✅ [WAIT-${waitId}] Event listeners removed`);
        }
        clearTimeout(timeoutId);
        clearInterval(frameCheckInterval);
        console.log(`✅ [WAIT-${waitId}] Timers cleared`);
      };

      const resolveReady = (source: string, totalFrames: number) => {
        if (!resolved && !this.isDestroyed) {
          resolved = true;
          cleanup();
          console.log(`DotLottie ready via ${source} - totalFrames: ${totalFrames}`);

          // DEBUG: Add more info about the canvas and DotLottie instance
          console.log('DotLottie DEBUG:', {
            canvasWidth: this.canvas?.width,
            canvasHeight: this.canvas?.height,
            canvasClientWidth: this.canvas?.clientWidth,
            canvasClientHeight: this.canvas?.clientHeight,
            instanceState: this.instance ? 'exists' : 'null',
            currentFrame: this.instance?.currentFrame,
            isPlaying: this.instance?.isPlaying,
            frameRate: this.instance?.frameRate,
            canvasContext: this.canvas ? !!this.canvas.getContext('2d') : false,
            canvasInDOM: this.canvas ? document.contains(this.canvas) : false,
            instanceCanvas: this.instance?.canvas === this.canvas,
            canvasVisibility: this.canvas
              ? window.getComputedStyle(this.canvas).visibility
              : 'no canvas',
            canvasDisplay: this.canvas ? window.getComputedStyle(this.canvas).display : 'no canvas',
          });

          try {
            // Since we forced autoplay=true, pause immediately and go to frame 0 for manual control
            console.log('DotLottie: Pausing after autoplay start and going to frame 0');
            this.instance.pause();
            this.instance.setFrame(0);

            console.log(
              `DotLottie: setFrame(0) called successfully, currentFrame now: ${this.instance.currentFrame}`
            );

            // Ensure the first frame is visible immediately after loading
            console.log('DotLottie: Ensuring first frame visibility...');

            // Force immediate render of frame 0
            this._forceRender(0);

            // Wait a brief moment then force render again to ensure visibility
            setTimeout(() => {
              if (!this.isDestroyed && this.instance) {
                console.log('DotLottie: Secondary first frame visibility check');
                this._forceRender(0);
                console.log('DotLottie: First frame should now be visible');
              }
            }, 50); // Reduced timeout for faster visibility

            // Try to force a render/refresh
            if (typeof this.instance.render === 'function') {
              this.instance.render();
              console.log('DotLottie: Forced render() call');
            } else if (typeof this.instance.refresh === 'function') {
              this.instance.refresh();
              console.log('DotLottie: Forced refresh() call');
            } else {
              console.log('DotLottie: No render/refresh method available');

              // Try other potential render methods
              const methods = ['draw', 'paint', 'update', 'repaint'];
              let foundMethod = false;
              for (const method of methods) {
                if (typeof this.instance[method] === 'function') {
                  try {
                    this.instance[method]();
                    console.log(`DotLottie: Called ${method}() method successfully`);
                    foundMethod = true;
                    break;
                  } catch (e) {
                    console.log(`DotLottie: ${method}() method failed:`, e);
                  }
                }
              }

              if (!foundMethod) {
                console.log(
                  'DotLottie: Available instance methods:',
                  Object.getOwnPropertyNames(this.instance)
                    .filter((name) => typeof this.instance[name] === 'function')
                    .slice(0, 20)
                );
              }
            }
          } catch (error) {
            console.error('DotLottie: Error during frame setup:', error);
          }

          // FINAL TEST: Try to play for a brief moment to test if DotLottie actually renders
          console.log('DotLottie: Testing playback capability...');
          try {
            this.instance.play();
            console.log('DotLottie: Started playback test');
            setTimeout(() => {
              if (!this.isDestroyed && this.instance) {
                this.instance.pause();
                this.instance.setFrame(0);
                console.log('DotLottie: Playback test completed, returned to frame 0');
              }
            }, 200); // Play for 200ms then stop
          } catch (playError) {
            console.error('DotLottie: Playback test failed:', playError);
          }

          this.emit('ready');
          resolve();
        }
      };

      const onReady = () => {
        if (!resolved && !this.isDestroyed) {
          console.log('DotLottie player ready event fired');

          // Check if we have frame data yet
          const totalFrames = this.instance?.totalFrames || 0;
          if (totalFrames > 0) {
            resolveReady('ready event', totalFrames);
          } else {
            console.log(
              'DotLottie ready event fired but no frames yet, waiting for load event or timeout'
            );
          }
        }
      };

      const onError = (error: any) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.error('DotLottie player error:', error);
          reject(error);
        }
      };

      const onLoad = () => {
        if (!resolved && !this.isDestroyed) {
          console.log('DotLottie animation load event fired');

          // Check if we have frame data now
          const totalFrames = this.instance?.totalFrames || 0;
          if (totalFrames > 0) {
            resolveReady('load event', totalFrames);
          } else {
            console.log('DotLottie load event fired but still no frames, waiting for timeout');
          }
        }
      };

      // Set up event listeners
      this.instance.addEventListener('ready', onReady);
      this.instance.addEventListener('load', onLoad);
      this.instance.addEventListener('error', onError);

      // Add periodic check for frame data availability
      frameCheckInterval = window.setInterval(() => {
        if (!resolved && !this.isDestroyed && this.instance) {
          const totalFrames = this.instance.totalFrames || 0;
          if (totalFrames > 0) {
            resolveReady('periodic check', totalFrames);
          }
        }
      }, 100); // Check every 100ms

      // Add completion event listener to handle animation end
      this.instance.addEventListener('complete', () => {
        console.log('DotLottie animation completed');
        this.stopFrameUpdates();
        this.emit('complete');
      });

      // Timeout with frame check
      timeoutId = window.setTimeout(() => {
        if (!resolved && !this.isDestroyed) {
          const totalFrames = this.instance?.totalFrames || 0;
          console.log(`DotLottie timeout check - totalFrames: ${totalFrames}`);

          if (totalFrames > 0) {
            resolved = true;
            cleanup();
            this.instance.setFrame(0);
            console.log('DotLottie timeout but has frames - resolving as ready');
            this.emit('ready');
            resolve();
          } else {
            resolved = true;
            cleanup();
            console.error('DotLottie timeout and no frames - rejecting');
            reject(new Error('DotLottie initialization timeout - no animation data'));
          }
        }
      }, 6000); // Reduced timeout to 6 seconds
    });
  }

  play(): void {
    if (this.instance && !this.isDestroyed) {
      this.instance.play();
      // Ensure the animation is visible when starting playback
      this._forceRender();
      this.emit('play');
      this.startFrameUpdates();
    }
  }

  pause(): void {
    if (this.instance && !this.isDestroyed) {
      this.instance.pause();
      this.emit('pause');
      this.stopFrameUpdates();
    }
  }

  stop(): void {
    if (this.instance && !this.isDestroyed) {
      this.instance.stop();
      this.emit('stop');
      this.stopFrameUpdates();
    }
  }

  seek(frame: number): void {
    if (this.instance && !this.isDestroyed) {
      const clampedFrame = Math.max(0, Math.min(this.getTotalFrames(), frame));
      console.log(
        `DotLottieAdapter: Seeking to frame ${clampedFrame} (requested: ${frame}, max: ${this.getTotalFrames()})`
      );

      // DotLottie uses setFrame method for seeking
      this.instance.setFrame(clampedFrame);

      // Force render to ensure frame is visually displayed
      this._forceRender(clampedFrame);

      this.emit('seek', { frame: clampedFrame });

      // Immediate frame update emission for sync
      this.emit('frame', {
        frame: this.getCurrentFrame(),
        time: this.getCurrentTime(),
      });
    }
  }

  setSpeed(speed: number): void {
    if (this.instance && !this.isDestroyed) {
      this.instance.setSpeed(speed);
      this.emit('speedChange', { speed });
    }
  }

  setLoop(loop: boolean): void {
    if (this.instance && !this.isDestroyed) {
      this.instance.setLoop(loop);
      this.emit('loopChange', { loop });
    }
  }

  getCurrentFrame(): number {
    return this.instance?.currentFrame || 0;
  }

  getTotalFrames(): number {
    return this.instance?.totalFrames || 0;
  }

  getCurrentTime(): number {
    const frame = this.getCurrentFrame();
    const totalFrames = this.getTotalFrames();
    const duration = this.getDuration();
    return totalFrames > 0 ? (frame / totalFrames) * duration : 0;
  }

  getDuration(): number {
    const totalFrames = this.getTotalFrames();
    const frameRate = this.instance?.frameRate || 30;
    const duration = totalFrames / frameRate;
    console.log(
      `DotLottieAdapter: getDuration - totalFrames: ${totalFrames}, frameRate: ${frameRate}, duration: ${duration}`
    );
    return duration;
  }

  destroy(): void {
    console.log('DotLottie: DESTROY called');

    this.isDestroyed = true;
    this.isInitializing = false;
    this.readyPromise = null;

    this._destroyInstance();
    this._cleanupResources();
  }

  private _destroyInstance(): void {
    if (this.instance) {
      try {
        this.instance.destroy();
        console.log('DotLottie: Instance destroyed successfully');
      } catch (error) {
        console.error('Error destroying DotLottie instance:', error);
      } finally {
        this.instance = null;
      }
    }
  }

  private _cleanupResources(): void {
    // Clear event listeners
    this.eventListeners.clear();

    // Remove canvas from DOM and clear reference
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up frame updates
    this.stopFrameUpdates();

    // Clear container reference
    this.container = null;
  }

  private setupResizeObserver(): void {
    if (!this.container || !this.canvas || !window.ResizeObserver || this.isDestroyed) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.isDestroyed) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const containerWidth = Math.max(width || 400, 400);
        const containerHeight = Math.max(height || 400, 400);

        if (this.canvas && !this.isDestroyed) {
          const needsResize =
            this.canvas.width !== containerWidth || this.canvas.height !== containerHeight;

          // Update canvas backing store size and keep responsive styles
          if (needsResize) {
            this.canvas.width = containerWidth;
            this.canvas.height = containerHeight;
          }
          this.canvas.style.width = '100%';
          this.canvas.style.height = '100%';
          this.canvas.style.objectFit = 'contain';

          // Important: resizing a canvas clears its contents. If our player is ready,
          // re-render the current frame so the animation remains visible after layout changes.
          if (needsResize && this.instance && !this.isDestroyed) {
            try {
              const current = this.getCurrentFrame();
              console.log(`DotLottie: Canvas resized, re-rendering frame ${current}`);
              this.instance.setFrame(current);

              // Force additional render methods to ensure frame visibility after resize
              setTimeout(() => {
                if (!this.isDestroyed && this.instance) {
                  try {
                    if (typeof this.instance.render === 'function') {
                      this.instance.render();
                      console.log('DotLottie: Called render() after resize');
                    }
                    // Force frame again to ensure it's visible
                    this.instance.setFrame(current);
                    console.log(`DotLottie: Re-forced frame ${current} after resize`);
                  } catch (e) {
                    console.log('DotLottie: Post-resize render failed:', e);
                  }
                }
              }, 50);
            } catch (err) {
              console.warn('DotLottie: failed to redraw after resize:', err);
            }
          }
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }

  private startFrameUpdates(): void {
    if (this.isDestroyed) return;

    this.stopFrameUpdates();

    this.frameUpdateInterval = window.setInterval(() => {
      if (this.instance && !this.isDestroyed) {
        this.emit('frame', {
          frame: this.getCurrentFrame(),
          time: this.getCurrentTime(),
        });
      }
    }, 50);
  }

  private stopFrameUpdates(): void {
    if (this.frameUpdateInterval) {
      clearInterval(this.frameUpdateInterval);
      this.frameUpdateInterval = null;
    }
  }

  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private _forceRender(frame?: number): void {
    if (!this.instance || this.isDestroyed) return;

    try {
      // Method 1: Try standard render method
      if (typeof this.instance.render === 'function') {
        this.instance.render();
        console.log(`DotLottie: Called render() for frame ${frame || this.getCurrentFrame()}`);
        return;
      }

      // Method 2: Try refresh method
      if (typeof this.instance.refresh === 'function') {
        this.instance.refresh();
        console.log(`DotLottie: Called refresh() for frame ${frame || this.getCurrentFrame()}`);
        return;
      }

      // Method 3: Try forcing a frame update
      if (frame !== undefined) {
        // Force frame twice to ensure it sticks
        this.instance.setFrame(frame);
        setTimeout(() => {
          if (!this.isDestroyed && this.instance) {
            this.instance.setFrame(frame);
            console.log(`DotLottie: Double-forced frame ${frame} for visibility`);
          }
        }, 16); // One frame at 60fps
      }

      // Method 4: Try manual canvas draw if nothing else works
      const ctx = this.canvas?.getContext('2d');
      if (ctx && frame === 0) {
        // For frame 0, we might need to trigger a redraw differently
        console.log('DotLottie: Attempting manual canvas redraw trigger');
        // This will force a repaint
        ctx.save();
        ctx.restore();
      }
    } catch (error) {
      console.log('DotLottie: Force render failed:', error);
    }
  }
}

export class PlayerFactory {
  static createAdapter(type: PlayerType): PlayerAdapter {
    // Only support DotLottie for .lottie files
    if (type === 'dotlottie') {
      return new DotLottieAdapter();
    }

    // For backward compatibility, default to DotLottie
    console.warn(`Player type '${type}' not supported for .lottie files. Using DotLottie instead.`);
    return new DotLottieAdapter();
  }

  static getSupportedTypes(): PlayerType[] {
    return ['dotlottie'];
  }

  static getRecommendedType(_file: LottieFile): PlayerType {
    // Always recommend DotLottie for .lottie files
    return 'dotlottie';
  }
}
