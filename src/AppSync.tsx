import { useState, useCallback } from 'react';
import { useMachine } from '@xstate/react';
import { syncMachine } from './machines/syncMachine';
import { FileUploadSync } from './components/FileUploadSync';
import { PlayerGrid } from './components/PlayerGrid';
import { SyncControlBar } from './components/SyncControlBar';
import { ErrorBoundary } from './components';

function AppSync() {
  const [state, , actorRef] = useMachine(syncMachine);
  const { context } = state;
  const [globalZoom, setGlobalZoom] = useState(1);

  const handleZoomChange = useCallback((zoom: number) => {
    console.log('🔍 [APP-SYNC] Zoom change:', zoom);
    setGlobalZoom(zoom);
  }, []);

  console.log('🎭 [APP-SYNC] Current state:', state.value);
  console.log('📊 [APP-SYNC] Context:', {
    hasAnimation: !!context.animationData,
    sourceFormat: context.sourceFormat,
    playersCount: context.players.length,
    playbackState: context.playbackState,
    syncMode: context.synchronizationMode,
    currentFrame: context.currentFrame,
    metadata: context.metadata,
  });

  const isLoading = state.matches('loadingFile') || state.matches('initializingPlayers');
  const isError = state.matches('error');
  const hasAnimation = !!context.animationData;
  const hasPlayers = context.players.length > 0;

  return (
    <ErrorBoundary>
      <div className="app-sync h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lottie Multi-Player Sync</h1>
              <p className="text-sm text-gray-600 mt-1">
                Unified architecture supporting both Lottie Web and DotLottie players
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isError
                      ? 'bg-red-400'
                      : isLoading
                        ? 'bg-yellow-400 animate-pulse'
                        : hasAnimation
                          ? 'bg-green-400'
                          : 'bg-gray-300'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {isError
                    ? 'Error'
                    : isLoading
                      ? 'Loading...'
                      : hasAnimation
                        ? 'Ready'
                        : 'No Animation'}
                </span>
              </div>

              {context.metadata && (
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {context.sourceFormat?.toUpperCase()} • {context.metadata.totalFrames} frames
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {isError && context.lastError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium text-red-800">Error:</span>
                <span className="text-sm text-red-700">{context.lastError}</span>
                <button
                  onClick={() => actorRef.send({ type: 'CLEAR_ERROR' })}
                  className="ml-auto px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* File Upload */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Load Animation</h3>
              <FileUploadSync actorRef={actorRef} disabled={isLoading} />
            </div>

            {/* Animation Info */}
            {context.metadata && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Animation Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Format:</span>
                    <span className="font-mono text-gray-900">
                      {context.sourceFormat?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dimensions:</span>
                    <span className="font-mono text-gray-900">
                      {context.metadata.width}×{context.metadata.height}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frame Rate:</span>
                    <span className="font-mono text-gray-900">
                      {context.metadata.frameRate} fps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-mono text-gray-900">
                      {context.metadata.duration.toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Frames:</span>
                    <span className="font-mono text-gray-900">{context.metadata.totalFrames}</span>
                  </div>
                  {context.metadata.version && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Version:</span>
                      <span className="font-mono text-gray-900">{context.metadata.version}</span>
                    </div>
                  )}
                  {context.assetsMap && Object.keys(context.assetsMap).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assets:</span>
                      <span className="font-mono text-gray-900">
                        {Object.keys(context.assetsMap).length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Player Status */}
            {hasPlayers && (
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Player Status ({context.players.length})
                </h3>
                <div className="space-y-2">
                  {context.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            player.status === 'ready'
                              ? 'bg-green-400'
                              : player.status === 'loading'
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                          }`}
                        />
                        <span className="text-gray-900">
                          {player.type === 'lottie-web' ? 'Lottie Web' : 'DotLottie'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-mono">{player.id.slice(-6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 h-full overflow-auto">
            {!hasAnimation ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg
                    className="mx-auto w-16 h-16 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <h3 className="text-lg font-medium mb-2">Upload Animation File</h3>
                  <p className="text-sm">
                    Drop a .json or .lottie file to get started with multi-player synchronization
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full p-6">
                <PlayerGrid actorRef={actorRef} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <SyncControlBar
          actorRef={actorRef}
          globalZoom={globalZoom}
          onGlobalZoomChange={handleZoomChange}
        />
      </div>
    </ErrorBoundary>
  );
}

export default AppSync;
