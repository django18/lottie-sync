import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { applicationMachine } from '../../src/machines/applicationMachine';

describe('Application Machine', () => {
  it('should start in idle state', () => {
    const actor = createActor(applicationMachine);
    actor.start();
    
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.files).toEqual([]);
    expect(actor.getSnapshot().context.players).toEqual([]);
  });

  it('should handle file upload', async () => {
    const actor = createActor(applicationMachine);
    actor.start();
    
    const mockFile = new File(['{"v": "1.0"}'], 'test.json', { type: 'application/json' });
    
    actor.send({ type: 'UPLOAD_FILE', file: mockFile });
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(actor.getSnapshot().context.files.length).toBeGreaterThan(0);
  });

  it('should add players', () => {
    const actor = createActor(applicationMachine);
    actor.start();
    
    actor.send({ type: 'ADD_PLAYER', playerType: 'lottie-web' });
    
    expect(actor.getSnapshot().context.players.length).toBe(1);
    expect(actor.getSnapshot().context.players[0].type).toBe('lottie-web');
  });

  it('should toggle sync mode', () => {
    const actor = createActor(applicationMachine);
    actor.start();
    
    const initialMode = actor.getSnapshot().context.globalControls.synchronizationMode;
    expect(initialMode).toBe('global');
    
    actor.send({ type: 'TOGGLE_SYNC_MODE' });
    
    // Wait for state update
    const newMode = actor.getSnapshot().context.globalControls.synchronizationMode;
    expect(newMode).toBe('individual');
  });

  it('should handle global play/pause/stop', () => {
    const actor = createActor(applicationMachine);
    actor.start();
    
    // Move to synchronized state first by adding players or files
    actor.send({ type: 'ADD_PLAYER', playerType: 'lottie-web' });
    
    actor.send({ type: 'GLOBAL_PLAY' });
    expect(actor.getSnapshot().context.globalControls.isPlaying).toBe(true);
    
    actor.send({ type: 'GLOBAL_PAUSE' });
    expect(actor.getSnapshot().context.globalControls.isPlaying).toBe(false);
    expect(actor.getSnapshot().context.globalControls.isPaused).toBe(true);
    
    actor.send({ type: 'GLOBAL_STOP' });
    expect(actor.getSnapshot().context.globalControls.isPlaying).toBe(false);
    expect(actor.getSnapshot().context.globalControls.isPaused).toBe(false);
    expect(actor.getSnapshot().context.globalControls.currentFrame).toBe(0);
  });
});