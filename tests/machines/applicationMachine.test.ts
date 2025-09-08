import { describe, it, expect, beforeEach } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { applicationMachine } from '../../src/machines/index';

describe('Application Machine', () => {
  let actor: any;

  beforeEach(() => {
    actor = createActor(applicationMachine);
    actor.start();
  });

  it('should start with correct initial state', () => {
    const state = actor.getSnapshot();

    // The machine may start in idle state after initialization completes quickly
    expect(state.value).toEqual({ idle: 'empty' });
    expect(state.context.files).toEqual([]);
    expect(state.context.players).toEqual([]);
  });

  it('should have correct initial context', () => {
    const context = actor.getSnapshot().context;

    expect(context.files).toEqual([]);
    expect(context.players).toEqual([]);
    expect(context.globalControls).toBeDefined();
    expect(context.globalControls.synchronizationMode).toBe('global');
    expect(context.globalControls.isPlaying).toBe(false);
    expect(context.globalControls.isPaused).toBe(false);
    expect(context.dragActive).toBe(false);
    expect(context.error).toBeNull();
  });

  it('should handle drag and drop events', () => {
    actor.send({ type: 'DRAG_ENTER' });
    expect(actor.getSnapshot().context.dragActive).toBe(true);

    actor.send({ type: 'DRAG_LEAVE' });
    expect(actor.getSnapshot().context.dragActive).toBe(false);
  });

  it('should handle error clearing', () => {
    // Send clear error event
    actor.send({ type: 'CLEAR_ERROR' });
    expect(actor.getSnapshot().context.error).toBeNull();
  });

  it('should handle drop files event', () => {
    const mockFiles = [new File(['test'], 'test.lottie', { type: 'application/zip' })];

    actor.send({ type: 'DROP_FILES', files: mockFiles });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context.dragActive).toBe(false);
  });
});
