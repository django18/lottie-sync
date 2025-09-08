import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RetryService, globalRetryService, type RetryConfig } from '../../src/services/retryService';
import type { PlayerType } from '../../src/types/lottie';

describe('RetryService', () => {
  let retryService: RetryService;
  const mockPlayerId = 'test-player-123';

  beforeEach(() => {
    retryService = new RetryService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    retryService.clearRetryState(mockPlayerId);
  });

  describe('shouldRetry', () => {
    it('should allow retry for retryable errors under max attempts', () => {
      const canRetry = retryService.shouldRetry(mockPlayerId, 'network error', 'dotlottie');
      expect(canRetry).toBe(true);
    });

    it('should reject retry for non-retryable errors', () => {
      const canRetry = retryService.shouldRetry(mockPlayerId, 'validation error', 'dotlottie');
      expect(canRetry).toBe(false);
    });

    it('should reject retry after max attempts reached', () => {
      const state = retryService['getOrCreateRetryState'](mockPlayerId);
      state.totalRetries = 5; // Exceed max attempts

      const canRetry = retryService.shouldRetry(mockPlayerId, 'network error', 'dotlottie');
      expect(canRetry).toBe(false);
    });

    it('should respect minimum delay between retries', () => {
      const state = retryService['getOrCreateRetryState'](mockPlayerId);
      state.lastAttemptTime = Date.now();
      state.totalRetries = 1;

      const canRetry = retryService.shouldRetry(mockPlayerId, 'network error', 'dotlottie');
      expect(canRetry).toBe(false);

      // Advance time beyond delay
      vi.advanceTimersByTime(3000);
      const canRetryAfterDelay = retryService.shouldRetry(mockPlayerId, 'network error', 'dotlottie');
      expect(canRetryAfterDelay).toBe(true);
    });

    it('should use player-specific configurations', () => {
      // Test dotlottie player (max 4 attempts)
      const state = retryService['getOrCreateRetryState'](mockPlayerId);
      state.totalRetries = 3;

      let canRetry = retryService.shouldRetry(mockPlayerId, 'dotlottie error', 'dotlottie');
      expect(canRetry).toBe(true);

      state.totalRetries = 4;
      canRetry = retryService.shouldRetry(mockPlayerId, 'dotlottie error', 'dotlottie');
      expect(canRetry).toBe(false);
    });
  });

  describe('executeRetry', () => {
    it('should successfully execute retry operation', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await retryService.executeRetry(
        mockPlayerId,
        'dotlottie',
        mockOperation,
        'network error'
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      
      const state = retryService.getRetryState(mockPlayerId);
      expect(state?.totalRetries).toBe(1);
      expect(state?.isRetrying).toBe(false);
    });

    it('should throw error when retry limit exceeded', async () => {
      const state = retryService['getOrCreateRetryState'](mockPlayerId);
      state.totalRetries = 5;

      const mockOperation = vi.fn();

      await expect(
        retryService.executeRetry(mockPlayerId, 'dotlottie', mockOperation, 'network error')
      ).rejects.toThrow(`Retry limit exceeded for player ${mockPlayerId}`);

      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should handle operation failures and continue retrying', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValue('success');

      // First call should fail
      await expect(
        retryService.executeRetry(mockPlayerId, 'dotlottie', mockOperation, 'network error')
      ).rejects.toThrow('first failure');

      // Advance time to allow next retry
      vi.advanceTimersByTime(2000);

      // Second call should succeed
      const result = await retryService.executeRetry(
        mockPlayerId,
        'dotlottie',
        mockOperation,
        'network error'
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff delays', async () => {
      const delays: number[] = [];
      const originalWait = retryService['wait'];
      retryService['wait'] = vi.fn().mockImplementation((ms) => {
        delays.push(ms);
        return Promise.resolve();
      });

      const mockOperation = vi.fn().mockResolvedValue('success');

      // Execute multiple retries
      await retryService.executeRetry(mockPlayerId, 'dotlottie', mockOperation, 'network error');
      
      vi.advanceTimersByTime(2000);
      await retryService.executeRetry(mockPlayerId, 'dotlottie', mockOperation, 'network error');

      expect(delays[0]).toBe(1500); // Base delay for dotlottie
      expect(delays[1]).toBe(3000); // Doubled delay

      retryService['wait'] = originalWait;
    });

    it('should track retry attempts with metadata', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      await retryService.executeRetry(
        mockPlayerId,
        'dotlottie',
        mockOperation,
        'network timeout'
      );

      const state = retryService.getRetryState(mockPlayerId);
      expect(state?.attempts).toHaveLength(1);
      expect(state?.attempts[0]).toEqual({
        attempt: 1,
        timestamp: expect.any(Number),
        error: 'network timeout',
        errorType: 'network',
        delay: 1500
      });
    });

    it('should provide detailed error summary after all retries fail', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('persistent failure'));
      
      // Exhaust all retry attempts
      for (let i = 0; i < 4; i++) {
        try {
          await retryService.executeRetry(mockPlayerId, 'dotlottie', mockOperation, 'network error');
        } catch (error) {
          // Expected to fail
        }
        vi.advanceTimersByTime(5000); // Advance past delay
      }

      // Final attempt should include summary
      await expect(
        retryService.executeRetry(mockPlayerId, 'dotlottie', mockOperation, 'network error')
      ).rejects.toThrow(/All retry attempts failed for player.*network \(4 attempts\)/);
    });
  });

  describe('error categorization', () => {
    it('should categorize network errors', () => {
      const errorType = retryService['categorizeError']('Network connection failed');
      expect(errorType).toBe('network');
    });

    it('should categorize timeout errors', () => {
      const errorType = retryService['categorizeError']('Request timeout');
      expect(errorType).toBe('timeout');
    });

    it('should categorize canvas errors', () => {
      const errorType = retryService['categorizeError']('Canvas rendering failed');
      expect(errorType).toBe('canvas');
    });

    it('should categorize memory errors', () => {
      const errorType = retryService['categorizeError']('Out of memory');
      expect(errorType).toBe('memory');
    });

    it('should categorize dotlottie specific errors', () => {
      const errorType = retryService['categorizeError']('DotLottie WASM initialization failed');
      expect(errorType).toBe('dotlottie');
    });

    it('should categorize loading errors', () => {
      const errorType = retryService['categorizeError']('Failed to load animation');
      expect(errorType).toBe('loading');
    });

    it('should return unknown for unrecognized errors', () => {
      const errorType = retryService['categorizeError']('Some random error');
      expect(errorType).toBe('unknown');
    });
  });

  describe('getRetryAdvice', () => {
    it('should provide advice for retryable errors', () => {
      const advice = retryService.getRetryAdvice(mockPlayerId, 'network error', 'dotlottie');
      expect(advice).toContain('Retrying in');
      expect(advice).toContain('(1/4)');
    });

    it('should provide final advice after max retries', () => {
      const state = retryService['getOrCreateRetryState'](mockPlayerId);
      state.totalRetries = 4;
      state.attempts = [
        { attempt: 1, timestamp: Date.now(), error: 'network error', errorType: 'network', delay: 1000 },
        { attempt: 2, timestamp: Date.now(), error: 'network error', errorType: 'network', delay: 2000 },
        { attempt: 3, timestamp: Date.now(), error: 'network error', errorType: 'network', delay: 4000 },
        { attempt: 4, timestamp: Date.now(), error: 'network error', errorType: 'network', delay: 8000 }
      ];

      const advice = retryService.getRetryAdvice(mockPlayerId, 'network error', 'dotlottie');
      expect(advice).toContain('Network issues detected (4 attempts)');
      expect(advice).toContain('Check your internet connection');
    });

    it('should provide specific advice for non-retryable errors', () => {
      const advice = retryService.getRetryAdvice(mockPlayerId, 'validation error', 'dotlottie');
      expect(advice).toContain('Invalid animation file');
    });
  });

  describe('player-specific configurations', () => {
    it('should use different configurations for different player types', () => {
      // Test dotlottie player
      const dotlottieCanRetry = retryService.shouldRetry(mockPlayerId, 'wasm error', 'dotlottie');
      expect(dotlottieCanRetry).toBe(true);

      // Test lottie-web player
      const lottieWebCanRetry = retryService.shouldRetry(mockPlayerId, 'svg error', 'lottie-web');
      expect(lottieWebCanRetry).toBe(true);

      // Test error specific to dotlottie on lottie-web (should not retry)
      const crossPlayerError = retryService.shouldRetry(mockPlayerId, 'wasm error', 'lottie-web');
      expect(crossPlayerError).toBe(false);
    });
  });

  describe('state management', () => {
    it('should create and track retry state', () => {
      const state = retryService['getOrCreateRetryState'](mockPlayerId);
      expect(state.playerId).toBe(mockPlayerId);
      expect(state.totalRetries).toBe(0);
      expect(state.attempts).toEqual([]);
      expect(state.isRetrying).toBe(false);
    });

    it('should clear retry state', () => {
      retryService['getOrCreateRetryState'](mockPlayerId);
      expect(retryService.getRetryState(mockPlayerId)).toBeDefined();

      retryService.clearRetryState(mockPlayerId);
      expect(retryService.getRetryState(mockPlayerId)).toBeUndefined();
    });

    it('should return undefined for non-existent player state', () => {
      const state = retryService.getRetryState('non-existent-player');
      expect(state).toBeUndefined();
    });
  });

  describe('globalRetryService', () => {
    it('should provide a global singleton instance', () => {
      expect(globalRetryService).toBeInstanceOf(RetryService);
      
      // Should be the same instance on multiple imports
      const state1 = globalRetryService['getOrCreateRetryState']('test-global');
      const state2 = globalRetryService['getOrCreateRetryState']('test-global');
      expect(state1).toBe(state2);
    });
  });

  describe('custom configuration', () => {
    it('should accept custom retry configuration', () => {
      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 16000,
        backoffMultiplier: 3
      };

      const customRetryService = new RetryService(customConfig);
      
      // Test that custom config is applied
      const delay1 = customRetryService['calculateDelay'](0, { ...customRetryService['config'] });
      const delay2 = customRetryService['calculateDelay'](1, { ...customRetryService['config'] });
      
      expect(delay1).toBe(2000);
      expect(delay2).toBe(6000); // 2000 * 3
    });

    it('should respect max delay limit', () => {
      const customConfig: Partial<RetryConfig> = {
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 10
      };

      const customRetryService = new RetryService(customConfig);
      
      const delay = customRetryService['calculateDelay'](5, { ...customRetryService['config'] });
      expect(delay).toBe(5000); // Should be capped at maxDelay
    });
  });
});

