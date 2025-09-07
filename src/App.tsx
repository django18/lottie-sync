import { useState, useCallback, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { enhancedApplicationMachine } from './machines/enhancedApplicationMachine';
import {
  ErrorBoundary,
  FileUpload,
  FileList,
  PlayerGrid,
  BottomControlBar,
  OptimizationMonitor,
} from './components';
import { simplePlayerPool } from './services/simplePlayerPool';
import { assetBlobCache } from './services/assetBlobCache';
import type { LottieFile, PlayerType } from './types';

function App() {
  const [state, send] = useMachine(enhancedApplicationMachine);
  const { context } = state;
  const [globalZoom, setGlobalZoom] = useState(1);

  // Cleanup optimization services on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [APP] Cleaning up optimization services...');
      simplePlayerPool.destroy();
      assetBlobCache.destroy();
    };
  }, []);

  console.log('🎭 [APP] Current state:', state.value);
  console.log('📊 [APP] Context:', {
    filesCount: context.files.length,
    playersCount: context.players.length,
    selectedFile: context.selectedFile?.name,
    globalControls: context.globalControls,
  });

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      console.log(
        '📁 [APP] Files selected:',
        files.map((f) => f.name)
      );
      if (files.length === 1) {
        send({ type: 'UPLOAD_FILE', file: files[0] });
      } else {
        send({ type: 'DROP_FILES', files });
      }
    },
    [send]
  );

  const handleFileSelect = useCallback(
    (file: LottieFile) => {
      console.log('📁 [APP] File select:', file.name);
      send({ type: 'SELECT_FILE', fileId: file.id });

      // Update global controls when a file is selected
      // Note: With React components, we'll get the animation info from the first player that loads
    },
    [send]
  );

  const handleFileRemove = useCallback(
    (fileId: string) => {
      console.log('🗑️ [APP] File remove:', fileId);
      send({ type: 'REMOVE_FILE', fileId });
    },
    [send]
  );

  const handleAddPlayer = useCallback(
    (type: PlayerType) => {
      console.log('➕ [APP] Add player:', type);
      send({
        type: 'ADD_PLAYER',
        playerType: type,
        config: {
          autoplay: false,
          loop: context.globalControls.loop,
          speed: context.globalControls.speed,
        },
      });
    },
    [send, context.globalControls]
  );

  const handleRemovePlayer = useCallback(
    (playerId: string) => {
      console.log('➖ [APP] Remove player:', playerId);
      send({ type: 'REMOVE_PLAYER', playerId });
    },
    [send]
  );

  const handleGlobalPlay = useCallback(() => {
    console.log('▶️ [APP] Global play');
    send({ type: 'GLOBAL_PLAY' });
  }, [send]);

  const handleGlobalPause = useCallback(() => {
    console.log('⏸️ [APP] Global pause');
    send({ type: 'GLOBAL_PAUSE' });
  }, [send]);

  const handleGlobalStop = useCallback(() => {
    console.log('⏹️ [APP] Global stop');
    send({ type: 'GLOBAL_STOP' });
  }, [send]);

  const handleGlobalSeek = useCallback(
    (frame: number) => {
      console.log('🎯 [APP] Global seek to frame:', frame);
      send({ type: 'GLOBAL_SEEK', frame });
    },
    [send]
  );

  const handleGlobalSpeedChange = useCallback(
    (speed: number) => {
      console.log('⚡ [APP] Global speed change:', speed);
      send({ type: 'GLOBAL_SPEED_CHANGE', speed });
    },
    [send]
  );

  const handleGlobalLoopToggle = useCallback(() => {
    console.log('🔄 [APP] Global loop toggle');
    send({ type: 'GLOBAL_LOOP_TOGGLE' });
  }, [send]);

  const handlePlayerReady = useCallback((playerId: string) => {
    console.log('🎉 [APP] Player ready:', playerId);
    // With React components, the first player to load can provide the animation info
    // This will be handled by the individual ReactPlayerContainer components
  }, []);

  const handlePlayerError = useCallback(
    (playerId: string, error: string) => {
      console.error('❌ [APP] Player error:', playerId, error);
      send({ type: 'CLEAR_ERROR' });
    },
    [send]
  );

  const handleIndividualControl = useCallback((playerId: string, action: string, data?: any) => {
    console.log('🎮 [APP] Individual control:', { playerId, action, data });
    // Individual controls are handled directly by ReactPlayerContainer
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    console.log('🔍 [APP] Zoom change:', zoom);
    setGlobalZoom(zoom);
  }, []);

  // Drag and drop and global controls are handled by the state machine and React components

  const isError = state.matches('error');
  const isLoading = state.matches('fileManagement.uploading');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lottie Sync Player</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Synchronize and compare Lottie animations across multiple players
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-xs text-gray-500">
                  {context.files.length} files • {context.players.length} players
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              {/* File Upload */}
              <div className="p-6 border-b border-gray-200">
                <FileUpload onFilesSelected={handleFilesSelected} disabled={isLoading} />
              </div>

              {/* File List */}
              <div className="flex-1 overflow-hidden">
                <FileList
                  files={context.files}
                  selectedFile={context.selectedFile}
                  onSelectFile={handleFileSelect}
                  onRemoveFile={handleFileRemove}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 h-full overflow-auto">
              <PlayerGrid
                players={context.players}
                selectedFile={context.selectedFile}
                globalSyncEnabled={context.globalControls.synchronizationMode === 'global'}
                currentFrame={context.globalControls.currentFrame}
                totalFrames={context.globalControls.totalFrames}
                isPlaying={context.globalControls.isPlaying}
                speed={context.globalControls.speed}
                loop={context.globalControls.loop}
                globalZoom={globalZoom}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
                onPlayerReady={handlePlayerReady}
                onPlayerError={handlePlayerError}
                onIndividualControl={handleIndividualControl}
              />
            </div>
          </div>

          {/* Bottom Control Bar */}
          <BottomControlBar
            playerCount={context.players.length}
            onPlayerCountChange={() => {}} // Not needed with React approach
            globalControls={context.globalControls}
            onGlobalPlay={handleGlobalPlay}
            onGlobalPause={handleGlobalPause}
            onGlobalStop={handleGlobalStop}
            onGlobalSeek={handleGlobalSeek}
            onGlobalSpeedChange={handleGlobalSpeedChange}
            onGlobalLoopToggle={handleGlobalLoopToggle}
            onToggleSyncMode={() => send({ type: 'TOGGLE_SYNC_MODE' })}
            onGlobalZoomChange={handleZoomChange}
            currentFrame={context.globalControls.currentFrame}
            totalFrames={context.globalControls.totalFrames}
            globalZoom={globalZoom}
            className="border-t border-gray-200"
          />
        </div>

        {/* Error Display */}
        {isError && context.error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">{context.error}</span>
              <button
                onClick={() => send({ type: 'CLEAR_ERROR' })}
                className="ml-4 text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Optimization Monitor */}
      <OptimizationMonitor />
    </ErrorBoundary>
  );
}

export default App;
