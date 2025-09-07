import { PlayerWrapper } from './players/PlayerWrapper';
import { LottieWebPlayer } from './players/LottieWebPlayer';
import { DotLottiePlayer } from './players/DotLottiePlayer';
import type { SyncActorRef } from '../machines/syncMachine';
import { useSelector } from '@xstate/react';

interface PlayerGridProps {
  actorRef: SyncActorRef;
  className?: string;
}

export function PlayerGrid({ actorRef, className = '' }: PlayerGridProps) {
  const context = useSelector(actorRef, (state: any) => state.context);
  const { players, animationData, dotLottieSrcUrl } = context;

  const getGridColumns = (count: number): string => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  const handleAddPlayer = (type: 'lottie-web' | 'dotlottie') => {
    const playerId = crypto.randomUUID();
    actorRef.send({ type: 'INIT_PLAYER', playerId, playerType: type });
  };

  const handleRemovePlayer = (playerId: string) => {
    actorRef.send({ type: 'REMOVE_PLAYER', playerId });
  };

  const playerConfigs = [
    {
      id: 'lottie-web',
      name: 'Lottie Web',
      Component: LottieWebPlayer,
      playerProps: {}, // Always gets JSON data
    },
    {
      id: 'dotlottie',
      name: 'DotLottie',
      Component: DotLottiePlayer,
      playerProps: {
        srcUrl: dotLottieSrcUrl, // Gets .lottie blob URL when available
      },
    },
  ];

  return (
    <div className={`h-full flex flex-col space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Players ({players.length})</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAddPlayer('lottie-web')}
            className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
            disabled={!animationData}
          >
            + Lottie Web
          </button>
          <button
            onClick={() => handleAddPlayer('dotlottie')}
            className="px-3 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
            disabled={!animationData}
          >
            + DotLottie
          </button>
        </div>
      </div>

      {/* Players Grid */}
      {players.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg
              className="mx-auto w-12 h-12 mb-4"
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
            <p className="text-lg font-medium">No Players Added</p>
            <p className="text-sm mt-1">
              {animationData
                ? 'Add players using the buttons above'
                : 'Load an animation file first'}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`flex-1 grid gap-4 ${getGridColumns(players.length)} overflow-hidden`}
          style={{ gridTemplateRows: 'repeat(auto-fit, minmax(0, 1fr))' }}
        >
          {players.map((player: any) => {
            const config = playerConfigs.find((c) => c.id === player.type);
            if (!config) {
              console.warn(`Unknown player type: ${player.type}`);
              return null;
            }

            return (
              <div
                key={player.id}
                className="relative group border-2 border-gray-300 rounded-lg overflow-hidden bg-white min-h-0"
              >
                <PlayerWrapper
                  actorRef={actorRef}
                  playerId={player.id}
                  PlayerComponent={config.Component}
                  playerProps={config.playerProps}
                  className="w-full h-full"
                />

                {/* Remove Button */}
                <button
                  onClick={() => handleRemovePlayer(player.id)}
                  className="absolute top-2 left-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                  title="Remove Player"
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Add Player Placeholder for empty grid slots */}
          {players.length === 3 && (
            <div className="relative group border-2 border-dashed border-gray-300 rounded-lg bg-white flex items-center justify-center min-h-0">
              <div className="text-center">
                <button
                  onClick={() => handleAddPlayer('dotlottie')}
                  className="px-4 py-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium"
                  disabled={!animationData}
                >
                  + Add Player
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
