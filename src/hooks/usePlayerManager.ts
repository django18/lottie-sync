import { useCallback, useRef, useEffect } from 'react';
import { createActor } from 'xstate';
import { playerMachine } from '../machines/playerMachine';
import { PlayerFactory, type PlayerAdapter } from '../services/playerService';
import { simplePlayerPool } from '../services/simplePlayerPool';
import type { PlayerConfig, LottieFile, PlayerType } from '../types';

interface UsePlayerManagerOptions {
  onReady?: (playerId: string) => void;
  onError?: (playerId: string, error: string) => void;
  onFrameUpdate?: (playerId: string, frame: number, time: number) => void;
  onComplete?: (playerId: string) => void;
}

export function usePlayerManager(options: UsePlayerManagerOptions = {}) {
  const players = useRef<
    Map<
      string,
      {
        adapter: PlayerAdapter;
        actorRef: any;
        container: HTMLElement;
      }
    >
  >(new Map());

  const createPlayer = useCallback(
    async (
      playerId: string,
      type: PlayerType,
      container: HTMLElement,
      file: LottieFile,
      config: Partial<PlayerConfig> = {}
    ) => {
      const startTime = performance.now();
      const totalPlayerCount = players.current.size;

      try {
        console.log(
          `🚀 [PLAYER-${playerId}] Starting player creation [${totalPlayerCount + 1}/X] at ${startTime.toFixed(2)}ms`
        );
        console.log(
          `📊 [PLAYER-${playerId}] Type: ${type}, File: ${file.name}, Container valid: ${!!container}`
        );
        console.log(
          `🗂️ [PLAYER-${playerId}] Current players in map: ${totalPlayerCount}`,
          Array.from(players.current.keys())
        );
        console.log(`📦 [PLAYER-${playerId}] Container details:`, {
          tagName: container.tagName,
          id: container.id,
          className: container.className,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight,
          offsetParent: !!container.offsetParent,
          isConnected: container.isConnected,
        });

        // Clean up existing player if it exists
        if (players.current.has(playerId)) {
          console.log(`🧹 [PLAYER-${playerId}] Player already exists, removing first`);
          await removePlayer(playerId);

          // Add small delay to ensure cleanup completes
          console.log(`⏳ [PLAYER-${playerId}] Waiting 50ms for cleanup to complete...`);
          await new Promise((resolve) => setTimeout(resolve, 50));
          console.log(`✅ [PLAYER-${playerId}] Cleanup wait completed`);
        }

        console.log(`🏭 [PLAYER-${playerId}] Getting adapter from pool for type: ${type}`);
        const adapterCreateTime = performance.now();

        // Use player pool to get or create adapter
        const adapter = await simplePlayerPool.getPlayer(type, () =>
          Promise.resolve(PlayerFactory.createAdapter(type))
        );

        console.log(
          `✅ [PLAYER-${playerId}] Adapter obtained in ${(performance.now() - adapterCreateTime).toFixed(2)}ms`
        );

        const playerConfig: PlayerConfig = {
          id: playerId,
          type,
          autoplay: false,
          loop: false,
          speed: 1,
          renderer: 'canvas',
          ...config,
        };
        console.log(`⚙️ [PLAYER-${playerId}] Player config:`, playerConfig);

        // Create actor for this player
        console.log(`🎭 [PLAYER-${playerId}] Creating XState actor...`);
        const actorCreateTime = performance.now();
        const actorRef = createActor(playerMachine, {
          input: {
            config: playerConfig,
          },
        });
        console.log(
          `✅ [PLAYER-${playerId}] Actor created in ${(performance.now() - actorCreateTime).toFixed(2)}ms`
        );

        // Set up event listeners with proper error handling
        console.log(`🎧 [PLAYER-${playerId}] Setting up event listeners...`);
        adapter.addEventListener('ready', () => {
          const readyTime = performance.now();
          console.log(
            `🎉 [PLAYER-${playerId}] ADAPTER READY EVENT fired at ${readyTime.toFixed(2)}ms (${(readyTime - startTime).toFixed(2)}ms since start)`
          );
          options.onReady?.(playerId);
        });

        adapter.addEventListener('error', (error: any) => {
          console.error(`❌ [PLAYER-${playerId}] ADAPTER ERROR EVENT:`, error);
          console.error(`❌ [PLAYER-${playerId}] Error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name,
            type: typeof error,
          });
          options.onError?.(playerId, error.message || 'Player error');
        });

        adapter.addEventListener('frame', (data: any) => {
          // Only log first few frame events to avoid spam
          if (data.frame <= 3) {
            console.log(`🎬 [PLAYER-${playerId}] Frame event: ${data.frame}, time: ${data.time}`);
          }
          options.onFrameUpdate?.(playerId, data.frame, data.time);
        });

        adapter.addEventListener('complete', () => {
          console.log(`🏁 [PLAYER-${playerId}] ANIMATION COMPLETED`);
          options.onComplete?.(playerId);
        });

        // Initialize the player
        console.log(`🔄 [PLAYER-${playerId}] Starting adapter initialization...`);
        const initStartTime = performance.now();
        await adapter.initialize(container, file, playerConfig);
        const initEndTime = performance.now();
        console.log(
          `✅ [PLAYER-${playerId}] Adapter initialization completed in ${(initEndTime - initStartTime).toFixed(2)}ms`
        );

        // Send initialization event to the machine
        console.log(`📤 [PLAYER-${playerId}] Sending INITIALIZE event to state machine...`);
        actorRef.send({
          type: 'INITIALIZE',
          container,
          file,
          config: playerConfig,
        });
        console.log(`✅ [PLAYER-${playerId}] State machine event sent`);

        // Store player reference
        console.log(`💾 [PLAYER-${playerId}] Storing player reference in map...`);
        players.current.set(playerId, {
          adapter,
          actorRef,
          container,
        });

        const totalTime = performance.now() - startTime;
        console.log(`🎊 [PLAYER-${playerId}] Successfully created in ${totalTime.toFixed(2)}ms`);
        console.log(
          `📈 [PLAYER-${playerId}] Players in map now: ${players.current.size}`,
          Array.from(players.current.keys())
        );

        return { adapter, actorRef };
      } catch (error) {
        const errorTime = performance.now();
        console.error(
          `💥 [PLAYER-${playerId}] CREATION FAILED at ${errorTime.toFixed(2)}ms (${(errorTime - startTime).toFixed(2)}ms since start):`,
          error
        );
        console.error(
          `💥 [PLAYER-${playerId}] Error stack:`,
          error instanceof Error ? error.stack : 'No stack'
        );
        console.error(`💥 [PLAYER-${playerId}] Error details:`, {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          type: typeof error,
          containerValid: !!container,
          fileValid: !!file,
        });
        options.onError?.(playerId, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    },
    [options]
  );

  const removePlayer = useCallback(async (playerId: string) => {
    const player = players.current.get(playerId);
    console.log(`🗑️ [PLAYER-${playerId}] Remove request - Player exists: ${!!player}`);

    if (player) {
      const removeStartTime = performance.now();
      try {
        console.log(`🧹 [PLAYER-${playerId}] Starting removal process...`);
        console.log(
          `🧹 [PLAYER-${playerId}] Players in map before removal: ${players.current.size}`,
          Array.from(players.current.keys())
        );

        // First, stop any ongoing operations
        try {
          console.log(`⏹️ [PLAYER-${playerId}] Stopping player adapter...`);
          player.adapter.stop();
          console.log(`✅ [PLAYER-${playerId}] Adapter stopped successfully`);
        } catch (error) {
          console.warn(`⚠️ [PLAYER-${playerId}] Error stopping player:`, error);
        }

        // Return adapter to pool instead of destroying
        try {
          console.log(`🔄 [PLAYER-${playerId}] Returning adapter to pool...`);
          const playerType = player.adapter.type || 'lottie-web';
          simplePlayerPool.releasePlayer(playerType as 'lottie-web' | 'dotlottie', player.adapter);
          console.log(`✅ [PLAYER-${playerId}] Adapter returned to pool successfully`);
        } catch (error) {
          console.error(`❌ [PLAYER-${playerId}] Error returning adapter to pool:`, error);
        }

        // Send dispose to actor
        try {
          console.log(`📤 [PLAYER-${playerId}] Sending DISPOSE event to state machine...`);
          player.actorRef.send({ type: 'DISPOSE' });
          console.log(`✅ [PLAYER-${playerId}] State machine DISPOSE event sent`);
        } catch (error) {
          console.error(`❌ [PLAYER-${playerId}] Error disposing actor:`, error);
        }

        // Remove from players map
        console.log(`🗺️ [PLAYER-${playerId}] Removing from players map...`);
        players.current.delete(playerId);

        const removeEndTime = performance.now();
        console.log(
          `🎊 [PLAYER-${playerId}] Successfully removed in ${(removeEndTime - removeStartTime).toFixed(2)}ms`
        );
        console.log(
          `📉 [PLAYER-${playerId}] Players in map now: ${players.current.size}`,
          Array.from(players.current.keys())
        );
      } catch (error) {
        const errorTime = performance.now();
        console.error(
          `💥 [PLAYER-${playerId}] REMOVAL FAILED at ${errorTime.toFixed(2)}ms:`,
          error
        );
        // Always remove from map even if cleanup failed
        console.log(`🚨 [PLAYER-${playerId}] Force removing from map due to error`);
        players.current.delete(playerId);
      }
    } else {
      console.log(`⚠️ [PLAYER-${playerId}] Player not found in map for removal`);
    }
  }, []);

  const getPlayer = useCallback((playerId: string) => {
    return players.current.get(playerId);
  }, []);

  const getAllPlayers = useCallback(() => {
    const playersList = Array.from(players.current.entries()).map(([id, player]) => ({
      id,
      ...player,
    }));
    console.log(
      `📋 [MANAGER] getAllPlayers called - returning ${playersList.length} players:`,
      playersList.map((p) => p.id)
    );
    return playersList;
  }, []);

  const playAll = useCallback(() => {
    const playerCount = players.current.size;
    console.log(`▶️ [MANAGER] playAll called - operating on ${playerCount} players`);
    players.current.forEach((player, playerId) => {
      try {
        console.log(`▶️ [PLAYER-${playerId}] Calling play() on adapter`);
        player.adapter.play();
        console.log(`✅ [PLAYER-${playerId}] Play command sent successfully`);
      } catch (error) {
        console.error(`❌ [PLAYER-${playerId}] Error playing player:`, error);
      }
    });
  }, []);

  const pauseAll = useCallback(() => {
    const playerCount = players.current.size;
    console.log(`⏸️ [MANAGER] pauseAll called - operating on ${playerCount} players`);
    players.current.forEach((player, playerId) => {
      try {
        console.log(`⏸️ [PLAYER-${playerId}] Calling pause() on adapter`);
        player.adapter.pause();
        console.log(`✅ [PLAYER-${playerId}] Pause command sent successfully`);
      } catch (error) {
        console.error(`❌ [PLAYER-${playerId}] Error pausing player:`, error);
      }
    });
  }, []);

  const stopAll = useCallback(() => {
    const playerCount = players.current.size;
    console.log(`⏹️ [MANAGER] stopAll called - operating on ${playerCount} players`);
    players.current.forEach((player, playerId) => {
      try {
        console.log(`⏹️ [PLAYER-${playerId}] Calling stop() on adapter`);
        player.adapter.stop();
        console.log(`✅ [PLAYER-${playerId}] Stop command sent successfully`);
      } catch (error) {
        console.error(`❌ [PLAYER-${playerId}] Error stopping player:`, error);
      }
    });
  }, []);

  const seekAll = useCallback((frame: number) => {
    const playerCount = players.current.size;
    console.log(
      `🎯 [MANAGER] seekAll called to frame ${frame} - operating on ${playerCount} players`
    );
    players.current.forEach((player, playerId) => {
      try {
        console.log(`🎯 [PLAYER-${playerId}] Calling seek(${frame}) on adapter`);
        player.adapter.seek(frame);
        console.log(`✅ [PLAYER-${playerId}] Seek command sent successfully`);
      } catch (error) {
        console.error(`❌ [PLAYER-${playerId}] Error seeking player:`, error);
      }
    });
  }, []);

  const setSpeedAll = useCallback((speed: number) => {
    const playerCount = players.current.size;
    console.log(
      `⚡ [MANAGER] setSpeedAll called to ${speed}x - operating on ${playerCount} players`
    );
    players.current.forEach((player, playerId) => {
      try {
        console.log(`⚡ [PLAYER-${playerId}] Calling setSpeed(${speed}) on adapter`);
        player.adapter.setSpeed(speed);
        console.log(`✅ [PLAYER-${playerId}] SetSpeed command sent successfully`);
      } catch (error) {
        console.error(`❌ [PLAYER-${playerId}] Error setting speed for player:`, error);
      }
    });
  }, []);

  const setLoopAll = useCallback((loop: boolean) => {
    const playerCount = players.current.size;
    console.log(`🔄 [MANAGER] setLoopAll called to ${loop} - operating on ${playerCount} players`);
    players.current.forEach((player, playerId) => {
      try {
        console.log(`🔄 [PLAYER-${playerId}] Calling setLoop(${loop}) on adapter`);
        player.adapter.setLoop(loop);
        console.log(`✅ [PLAYER-${playerId}] SetLoop command sent successfully`);
      } catch (error) {
        console.error(`❌ [PLAYER-${playerId}] Error setting loop for player:`, error);
      }
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      players.current.forEach((_player, playerId) => {
        removePlayer(playerId);
      });
    };
  }, [removePlayer]);

  return {
    createPlayer,
    removePlayer,
    getPlayer,
    getAllPlayers,
    playAll,
    pauseAll,
    stopAll,
    seekAll,
    setSpeedAll,
    setLoopAll,
    playerCount: players.current.size,
  };
}
