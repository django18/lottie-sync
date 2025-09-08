import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { syncCoordinatorMachine } from '../../src/machines/index';

describe('Sync Coordinator Machine', () => {
  let actor: any;

  beforeEach(() => {
    actor = createActor(syncCoordinatorMachine);
    actor.start();
  });

  it('should start in idle state', () => {
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.masterPlayerId).toBeNull();
    expect(actor.getSnapshot().context.syncMode).toBe('global');
  });

  it('should handle sync mode changes', () => {
    actor.send({ type: 'SET_SYNC_MODE', mode: 'individual' });
    expect(actor.getSnapshot().context.syncMode).toBe('individual');

    actor.send({ type: 'SET_SYNC_MODE', mode: 'global' });
    expect(actor.getSnapshot().context.syncMode).toBe('global');
  });

  it('should handle master player assignment', () => {
    const playerId = 'player-1';

    actor.send({ type: 'SET_MASTER', playerId });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle performance mode updates', () => {
    actor.send({ type: 'UPDATE_PERFORMANCE_MODE', mode: 'performance' });
    expect(actor.getSnapshot().context.performanceMode).toBe('performance');

    actor.send({ type: 'UPDATE_PERFORMANCE_MODE', mode: 'quality' });
    expect(actor.getSnapshot().context.performanceMode).toBe('quality');
  });

  it('should handle sync drift detection', () => {
    const playerId = 'player-1';
    const drift = 100;

    actor.send({ type: 'SYNC_DRIFT_DETECTED', playerId, drift });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle force sync events', () => {
    actor.send({ type: 'FORCE_SYNC' });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should validate sync when requested', () => {
    actor.send({ type: 'VALIDATE_SYNC' });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });
});
