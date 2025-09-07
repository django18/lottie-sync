import type { ActorRefFrom, MachineContext } from 'xstate';
import type {
  LottieFile,
  PlayerConfig,
  PlayerState,
  PlayerInstance,
  SyncEvent,
  GlobalControls,
  SynchronizationMode,
  PerformanceMetrics,
} from './lottie';

export interface ApplicationContext extends MachineContext {
  files: LottieFile[];
  selectedFile: LottieFile | null;
  players: PlayerInstance[];
  globalControls: GlobalControls;
  performanceMetrics: PerformanceMetrics[];
  error: string | null;
  dragActive: boolean;
}

export type ApplicationEvent =
  | { type: 'UPLOAD_FILE'; file: File }
  | { type: 'SELECT_FILE'; fileId: string }
  | { type: 'REMOVE_FILE'; fileId: string }
  | { type: 'ADD_PLAYER'; playerType: string; config?: Partial<PlayerConfig> }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'SET_PLAYER_COUNT'; count: number }
  | { type: 'TOGGLE_SYNC_MODE' }
  | { type: 'GLOBAL_PLAY' }
  | { type: 'GLOBAL_PAUSE' }
  | { type: 'GLOBAL_STOP' }
  | { type: 'GLOBAL_SEEK'; frame: number }
  | { type: 'GLOBAL_SPEED_CHANGE'; speed: number }
  | { type: 'GLOBAL_LOOP_TOGGLE' }
  | { type: 'DRAG_ENTER' }
  | { type: 'DRAG_LEAVE' }
  | { type: 'DROP_FILES'; files: File[] }
  | { type: 'CLEAR_ERROR' }
  | { type: 'PERFORMANCE_UPDATE'; metrics: PerformanceMetrics }
  | { type: 'UPDATE_GLOBAL_CONTROLS'; totalFrames: number; duration: number }
  | { type: 'UPDATE_FRAME_TIME'; frame: number; time: number }
  | { type: 'PLAYER_READY'; playerId: string }
  | { type: 'PLAYER_ERROR'; playerId: string; error: string }
  | { type: 'ALL_PLAYERS_READY' }
  | { type: 'RETRY' };

export interface PlayerContext extends MachineContext {
  config: PlayerConfig;
  state: PlayerState;
  instance: any;
  container: HTMLElement | null;
  file: LottieFile | null;
  syncMode: SynchronizationMode;
  error: string | null;
  retryCount: number;
}

export type PlayerEvent =
  | { type: 'INITIALIZE'; container: HTMLElement; file: LottieFile; config: PlayerConfig }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; frame: number; time?: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TOGGLE_LOOP' }
  | { type: 'SYNC_UPDATE'; event: SyncEvent }
  | { type: 'SET_SYNC_MODE'; mode: SynchronizationMode }
  | { type: 'PLAYER_READY' }
  | { type: 'PLAYER_ERROR'; error: string }
  | { type: 'FRAME_UPDATE'; frame: number; time: number }
  | { type: 'RETRY' }
  | { type: 'DISPOSE' };

export interface SyncCoordinatorContext extends MachineContext {
  masterPlayerId: string | null;
  syncMode: SynchronizationMode;
  syncEvents: SyncEvent[];
  playerRefs: Map<string, ActorRefFrom<any>>;
  syncThreshold: number;
  maxLatency: number;
  performanceMode: 'quality' | 'performance';
}

export type SyncCoordinatorEvent =
  | { type: 'REGISTER_PLAYER'; playerId: string; playerRef: ActorRefFrom<any> }
  | { type: 'UNREGISTER_PLAYER'; playerId: string }
  | { type: 'SET_MASTER'; playerId: string }
  | { type: 'SET_SYNC_MODE'; mode: SynchronizationMode }
  | { type: 'BROADCAST_EVENT'; event: SyncEvent }
  | { type: 'VALIDATE_SYNC' }
  | { type: 'FORCE_SYNC' }
  | { type: 'UPDATE_PERFORMANCE_MODE'; mode: 'quality' | 'performance' }
  | { type: 'SYNC_DRIFT_DETECTED'; playerId: string; drift: number };

export interface FileManagerContext extends MachineContext {
  files: LottieFile[];
  uploadProgress: Map<string, number>;
  validationErrors: Map<string, string>;
  supportedTypes: string[];
  maxFileSize: number;
}

export type FileManagerEvent =
  | { type: 'UPLOAD_FILES'; files: File[] }
  | { type: 'VALIDATE_FILE'; file: File }
  | { type: 'FILE_VALIDATED'; fileId: string }
  | { type: 'FILE_VALIDATION_FAILED'; fileId: string; error: string }
  | { type: 'UPLOAD_PROGRESS'; fileId: string; progress: number }
  | { type: 'UPLOAD_COMPLETE'; fileId: string }
  | { type: 'UPLOAD_FAILED'; fileId: string; error: string }
  | { type: 'REMOVE_FILE'; fileId: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'CLEAR_ERROR' };

export type MachineActorRefs = {
  applicationMachine: ActorRefFrom<any>;
  playerMachines: Map<string, ActorRefFrom<any>>;
  syncCoordinatorMachine: ActorRefFrom<any>;
  fileManagerMachine: ActorRefFrom<any>;
};
