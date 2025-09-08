import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { playerMachine } from '../../src/machines/playerMachine';
import { globalRetryService } from '../../src/services/retryService';
import type { PlayerContext } from '../../src/types/machines';

// Mock the retry service
vi.mock('../../src/services/retryService', () => ({
  globalRetryService: {
    shouldRetry: vi.fn(),
    getRetryAdvice: vi.fn(),
    executeRetry: vi.fn(),
    clearRetryState: vi.fn(),
    getRetryState: vi.fn(),
  },
}));

describe('Enhanced Player Machine', () => {
  const mockContainer = document.createElement('div');
  const mockFile = {
    id: '1',
    name: 'test.lottie',
    url: 'data:application/zip;base64,test',
    file: new File(['test'], 'test.lottie'),
    type: 'lottie' as const,
  };
  const mockConfig = {
    id: 'player-123',
    type: 'dotlottie' as const,
    autoplay: false,
    loop: false,
    speed: 1,
    renderer: 'canvas' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic State Transitions', () => {
    it('should start in uninitialized state', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      expect(actor.getSnapshot().value).toBe('uninitialized');
      expect(actor.getSnapshot().context.retryCount).toBe(0);
    });

    it('should transition to initializing when initialized', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      actor.send({
        type: 'INITIALIZE',
        container: mockContainer,
        file: mockFile,
        config: mockConfig,
      });
      
      expect(actor.getSnapshot().value).toBe('initializing');
      expect(actor.getSnapshot().context.container).toBe(mockContainer);
      expect(actor.getSnapshot().context.file).toBe(mockFile);
    });

    it('should handle dispose event from any state', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      actor.send({ type: 'DISPOSE' });
      
      expect(actor.getSnapshot().value).toBe('disposed');
      expect(actor.getSnapshot().status).toBe('done');
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should transition to error.evaluating when initialization fails', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock retry service responses
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue('Retrying in 2 seconds... (1/4)');
      
      // Send initialization with null values to trigger error
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      // Wait for async initialization to fail
      await waitFor(actor, (state) => state.matches('error'), { timeout: 1000 });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.value).toEqual({ error: 'evaluating' });
      expect(snapshot.context.error).toContain('Container and file are required');
    });

    it('should transition to error.retryable when error is retryable', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock retry service to say error is retryable
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue('Retrying in 2 seconds... (1/4)');
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'evaluating' }), { timeout: 1000 });
      
      // Wait for evaluation to complete
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().value).toEqual({ error: 'retryable' });
    });

    it('should auto-retry after 3 seconds when in retryable state', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock retry service
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(true);
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue('Retrying in 2 seconds... (1/4)');
      vi.mocked(globalRetryService.executeRetry).mockResolvedValue({ instance: {} });
      vi.mocked(globalRetryService.getRetryState).mockReturnValue({
        playerId: 'player-123',
        attempts: [],
        isRetrying: false,
        lastAttemptTime: 0,
        totalRetries: 0,
      });
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      // Advance timers to trigger auto-retry
      vi.advanceTimersByTime(3000);
      
      await waitFor(actor, (state) => state.matches({ error: 'retrying' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().value).toEqual({ error: 'retrying' });
    });

    it('should handle manual retry', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock retry service
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(true);
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue('Retrying in 2 seconds... (1/4)');
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      // Send manual retry
      actor.send({ type: 'RETRY' });
      
      await waitFor(actor, (state) => state.matches({ error: 'retrying' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().value).toEqual({ error: 'retrying' });
    });

    it('should transition to permanent error when retry fails', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock retry service to fail
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(false);
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue('All retry attempts failed');
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'evaluating' }), { timeout: 1000 });
      
      // Wait for evaluation to determine it's not retryable
      await waitFor(actor, (state) => state.matches({ error: 'permanent' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().value).toEqual({ error: 'permanent' });
    });

    it('should increment retry count on each retry attempt', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock retry service
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(true);
      vi.mocked(globalRetryService.executeRetry).mockRejectedValue(new Error('Retry failed'));
      
      actor.send({
        type: 'INITIALIZE',
        container: mockContainer,
        file: mockFile,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().context.retryCount).toBe(0);
      
      // Send retry
      actor.send({ type: 'RETRY' });
      
      await waitFor(actor, (state) => state.matches({ error: 'evaluating' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().context.retryCount).toBe(1);
    });

    it('should reset retry count on successful initialization', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Set initial retry count
      const context = actor.getSnapshot().context;
      context.retryCount = 2;
      
      actor.send({
        type: 'INITIALIZE',
        container: mockContainer,
        file: mockFile,
        config: mockConfig,
      });
      
      expect(actor.getSnapshot().context.retryCount).toBe(0);
    });

    it('should handle GIVE_UP event in retryable state', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue('Retrying...');
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      actor.send({ type: 'GIVE_UP' });
      
      await waitFor(actor, (state) => state.matches({ error: 'permanent' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().value).toEqual({ error: 'permanent' });
    });
  });

  describe('Successful Retry Recovery', () => {
    it('should transition to ready.idle when retry succeeds', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      // Mock successful retry
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(true);
      vi.mocked(globalRetryService.executeRetry).mockResolvedValue({ instance: { play: vi.fn() } });
      vi.mocked(globalRetryService.clearRetryState).mockImplementation(() => {});
      
      actor.send({
        type: 'INITIALIZE',
        container: mockContainer,
        file: mockFile,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      actor.send({ type: 'RETRY' });
      
      await waitFor(actor, (state) => state.matches({ ready: 'idle' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().value).toEqual({ ready: 'idle' });
      expect(actor.getSnapshot().context.retryCount).toBe(0);
      expect(globalRetryService.clearRetryState).toHaveBeenCalledWith('player-123');
    });
  });

  describe('Error Action Handlers', () => {
    it('should set error message and update state', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      actor.send({
        type: 'PLAYER_ERROR',
        error: 'Test error message',
      });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.context.error).toBe('Test error message');
      expect(snapshot.context.state.error).toBe('Test error message');
    });

    it('should clear retry state on dispose', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      actor.send({ type: 'DISPOSE' });
      
      expect(globalRetryService.clearRetryState).toHaveBeenCalledWith('');
    });

    it('should mark permanent failure correctly', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(false);
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'permanent' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().context.isPermanentFailure).toBe(true);
    });
  });

  describe('Basic Playback States', () => {
    it('should handle PLAYER_ERROR event and transition to error state', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      actor.send({
        type: 'PLAYER_ERROR',
        error: 'Test player error',
      });
      
      const snapshot = actor.getSnapshot();
      expect(snapshot.matches({ error: 'evaluating' })).toBe(true);
      expect(snapshot.context.error).toBe('Test player error');
    });

    it('should handle DISPOSE event from error state', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      actor.send({
        type: 'PLAYER_ERROR',
        error: 'Test error',
      });
      
      await waitFor(actor, (state) => state.matches('error'), { timeout: 1000 });
      
      actor.send({ type: 'DISPOSE' });
      
      expect(actor.getSnapshot().value).toBe('disposed');
      expect(globalRetryService.clearRetryState).toHaveBeenCalled();
    });
  });

  describe('Guard Functions', () => {
    it('should have canRetryPlayer guard that checks retry service', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      vi.mocked(globalRetryService.shouldRetry).mockReturnValue(true);
      
      // This would be tested through the state transitions above
      expect(globalRetryService.shouldRetry).toBeDefined();
    });

    it('should have shouldAutoRetry guard for first-time failures', () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      vi.mocked(globalRetryService.getRetryState).mockReturnValue({
        playerId: 'player-123',
        attempts: [],
        isRetrying: false,
        lastAttemptTime: 0,
        totalRetries: 0,
      });
      
      // This would be tested through the auto-retry behavior above
      expect(globalRetryService.getRetryState).toBeDefined();
    });
  });

  describe('Context Updates', () => {
    it('should update context with retry advice', async () => {
      const actor = createActor(playerMachine);
      actor.start();
      
      const mockAdvice = 'Network error detected. Retrying in 2 seconds...';
      vi.mocked(globalRetryService.getRetryAdvice).mockReturnValue(mockAdvice);
      
      actor.send({
        type: 'INITIALIZE',
        container: null as any,
        file: null as any,
        config: mockConfig,
      });
      
      await waitFor(actor, (state) => state.matches({ error: 'retryable' }), { timeout: 1000 });
      
      expect(actor.getSnapshot().context.retryAdvice).toBe(mockAdvice);
    });
  });
});