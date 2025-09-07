import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { playerMachine } from '../../src/machines/playerMachine';

describe('Player Machine', () => {
  it('should start in uninitialized state', () => {
    const actor = createActor(playerMachine);
    actor.start();
    
    expect(actor.getSnapshot().value).toBe('uninitialized');
  });

  it('should handle dispose event and transition to disposed state', () => {
    const actor = createActor(playerMachine);
    actor.start();
    
    actor.send({ type: 'DISPOSE' });
    
    expect(actor.getSnapshot().value).toBe('disposed');
    expect(actor.getSnapshot().status).toBe('done'); // final state
  });

  it('should handle initialization event', () => {
    const actor = createActor(playerMachine);
    actor.start();
    
    const mockContainer = document.createElement('div');
    const mockFile = {
      id: '1',
      name: 'test.json',
      url: 'data:application/json,{"v":"1.0"}',
      file: new File(['{}'], 'test.json'),
      type: 'json' as const,
    };
    const mockConfig = {
      id: '1',
      type: 'lottie-web' as const,
      autoplay: false,
      loop: false,
      speed: 1,
    };
    
    actor.send({
      type: 'INITIALIZE',
      container: mockContainer,
      file: mockFile,
      config: mockConfig,
    });
    
    expect(actor.getSnapshot().value).toBe('initializing');
  });

  it('should handle errors during initialization', () => {
    const actor = createActor(playerMachine);
    actor.start();
    
    // Send invalid initialization data to trigger error
    actor.send({
      type: 'INITIALIZE',
      container: null,
      file: null,
      config: null,
    });
    
    // Should transition to error state
    setTimeout(() => {
      expect(actor.getSnapshot().value).toBe('error');
    }, 100);
  });
});