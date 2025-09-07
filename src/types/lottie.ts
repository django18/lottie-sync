export type PlayerType = 'dotlottie' | 'lottie-web';

export type PlaybackState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'seeking'
  | 'error';

export type SynchronizationMode = 'global' | 'individual';

export interface LottieFile {
  id: string;
  name: string;
  url: string;
  file: File;
  type: 'lottie';
  metadata?: {
    version?: string;
    frameRate?: number;
    duration?: number;
    width?: number;
    height?: number;
    layers?: number;
    assets?: number;
  };
  validationResult?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// New types for the multi-player architecture
export interface ParsedLottieFile {
  id: string;
  name: string;
  file: File;
  animationData: any; // JSON animation data
  sourceFormat: 'json' | 'lottie';
  originalBlobUrl?: string; // For .lottie files
  assetsMap?: Record<string, string>; // Asset path mappings
  metadata: {
    frameRate: number;
    totalFrames: number;
    duration: number;
    width: number;
    height: number;
    version?: string;
    name?: string;
  };
}

export interface PlayerConfig {
  id: string;
  type: PlayerType;
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  renderer?: 'canvas';
}

export interface PlayerState {
  id: string;
  type: PlayerType;
  state: PlaybackState;
  currentFrame: number;
  totalFrames: number;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
  error?: string;
  lastSyncTime?: number;
}

export interface PlayerInstance {
  id: string;
  type: PlayerType;
  instance: any;
  container: HTMLElement;
  config: PlayerConfig;
}

export interface SyncEvent {
  type: 'play' | 'pause' | 'stop' | 'seek' | 'speed-change' | 'loop-toggle';
  timestamp: number;
  data?: {
    frame?: number;
    time?: number;
    speed?: number;
    loop?: boolean;
  };
}

export interface GlobalControls {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
  synchronizationMode: SynchronizationMode;
}

export interface PerformanceMetrics {
  frameRate: number;
  renderTime: number;
  syncLatency: number;
  memoryUsage?: number;
}
