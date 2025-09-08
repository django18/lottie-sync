import type { PlayerType } from '../types/lottie';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RetryAttempt {
  attempt: number;
  timestamp: number;
  error: string;
  errorType: string;
  delay: number;
}

export interface RetryState {
  playerId: string;
  attempts: RetryAttempt[];
  isRetrying: boolean;
  lastAttemptTime: number;
  totalRetries: number;
  errorPattern?: string;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
  retryableErrors: [
    'network',
    'timeout',
    'loading',
    'initialization',
    'canvas',
    'memory',
    'resource',
  ],
};

const PLAYER_SPECIFIC_CONFIGS: Record<PlayerType, Partial<RetryConfig>> = {
  dotlottie: {
    maxAttempts: 4,
    baseDelay: 1500,
    retryableErrors: [...DEFAULT_RETRY_CONFIG.retryableErrors, 'dotlottie', 'wasm'],
  },
  'lottie-web': {
    maxAttempts: 3,
    baseDelay: 1000,
    retryableErrors: [...DEFAULT_RETRY_CONFIG.retryableErrors, 'svg', 'canvas'],
  },
};

export class RetryService {
  private retryStates = new Map<string, RetryState>();
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  shouldRetry(playerId: string, error: string, playerType: PlayerType): boolean {
    const state = this.getOrCreateRetryState(playerId);
    const playerConfig = { ...this.config, ...PLAYER_SPECIFIC_CONFIGS[playerType] };

    if (state.totalRetries >= playerConfig.maxAttempts) {
      return false;
    }

    const errorType = this.categorizeError(error);

    if (!this.isRetryableError(errorType, playerConfig.retryableErrors)) {
      return false;
    }

    const timeSinceLastAttempt = Date.now() - state.lastAttemptTime;
    const minDelay = this.calculateDelay(state.totalRetries, playerConfig);

    return timeSinceLastAttempt >= minDelay;
  }

  async executeRetry<T>(
    playerId: string,
    playerType: PlayerType,
    operation: () => Promise<T>,
    error: string
  ): Promise<T> {
    const state = this.getOrCreateRetryState(playerId);
    const playerConfig = { ...this.config, ...PLAYER_SPECIFIC_CONFIGS[playerType] };

    if (!this.shouldRetry(playerId, error, playerType)) {
      throw new Error(`Retry limit exceeded for player ${playerId}: ${error}`);
    }

    state.isRetrying = true;
    const attemptNumber = state.totalRetries + 1;
    const delay = this.calculateDelay(state.totalRetries, playerConfig);

    const attempt: RetryAttempt = {
      attempt: attemptNumber,
      timestamp: Date.now(),
      error,
      errorType: this.categorizeError(error),
      delay,
    };

    state.attempts.push(attempt);
    state.totalRetries++;
    state.lastAttemptTime = Date.now();

    console.log(
      `🔄 [RETRY-${playerId.slice(-6)}] Attempt ${attemptNumber}/${playerConfig.maxAttempts} after ${delay}ms delay`
    );
    console.log(`🔄 [RETRY-${playerId.slice(-6)}] Error pattern: ${attempt.errorType}`);

    await this.wait(delay);

    try {
      const result = await operation();
      state.isRetrying = false;
      console.log(`✅ [RETRY-${playerId.slice(-6)}] Succeeded on attempt ${attemptNumber}`);
      return result;
    } catch (retryError) {
      state.isRetrying = false;
      console.error(
        `❌ [RETRY-${playerId.slice(-6)}] Failed attempt ${attemptNumber}:`,
        retryError
      );

      if (state.totalRetries >= playerConfig.maxAttempts) {
        const errorSummary = this.generateErrorSummary(state);
        throw new Error(`All retry attempts failed for player ${playerId}: ${errorSummary}`);
      }

      throw retryError;
    }
  }

  getRetryState(playerId: string): RetryState | undefined {
    return this.retryStates.get(playerId);
  }

  clearRetryState(playerId: string): void {
    this.retryStates.delete(playerId);
  }

  getRetryAdvice(playerId: string, error: string, playerType: PlayerType): string {
    const state = this.getOrCreateRetryState(playerId);
    const errorType = this.categorizeError(error);
    const playerConfig = { ...this.config, ...PLAYER_SPECIFIC_CONFIGS[playerType] };

    if (state.totalRetries >= playerConfig.maxAttempts) {
      return this.getFinalAdvice(state, errorType);
    }

    if (!this.isRetryableError(errorType, playerConfig.retryableErrors)) {
      return this.getNonRetryableAdvice(errorType);
    }

    const nextDelay = this.calculateDelay(state.totalRetries, playerConfig);
    return `Retrying in ${Math.ceil(nextDelay / 1000)} seconds... (${state.totalRetries + 1}/${playerConfig.maxAttempts})`;
  }

  private getOrCreateRetryState(playerId: string): RetryState {
    if (!this.retryStates.has(playerId)) {
      this.retryStates.set(playerId, {
        playerId,
        attempts: [],
        isRetrying: false,
        lastAttemptTime: 0,
        totalRetries: 0,
      });
    }
    return this.retryStates.get(playerId)!;
  }

  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase();

    if (
      lowerError.includes('network') ||
      lowerError.includes('fetch') ||
      lowerError.includes('connection')
    ) {
      return 'network';
    }
    if (lowerError.includes('timeout')) {
      return 'timeout';
    }
    if (lowerError.includes('canvas')) {
      return 'canvas';
    }
    if (lowerError.includes('memory') || lowerError.includes('out of memory')) {
      return 'memory';
    }
    if (lowerError.includes('dotlottie') || lowerError.includes('wasm')) {
      return 'dotlottie';
    }
    if (lowerError.includes('loading') || lowerError.includes('load')) {
      return 'loading';
    }
    if (lowerError.includes('initialization') || lowerError.includes('init')) {
      return 'initialization';
    }
    if (lowerError.includes('resource') || lowerError.includes('asset')) {
      return 'resource';
    }

    return 'unknown';
  }

  private isRetryableError(errorType: string, retryableErrors: string[]): boolean {
    return retryableErrors.includes(errorType);
  }

  private calculateDelay(attemptNumber: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber);
    return Math.min(delay, config.maxDelay);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateErrorSummary(state: RetryState): string {
    const errorTypes = state.attempts.map((a) => a.errorType);
    const uniqueErrorTypes = Array.from(new Set(errorTypes));
    return `${uniqueErrorTypes.join(', ')} (${state.attempts.length} attempts)`;
  }

  private getFinalAdvice(state: RetryState, errorType: string): string {
    const errorCount = state.attempts.length;

    switch (errorType) {
      case 'network':
        return `Network issues detected (${errorCount} attempts). Check your internet connection and try reloading the page.`;
      case 'memory':
        return `Memory issues detected (${errorCount} attempts). Try closing other browser tabs or refreshing the page.`;
      case 'canvas':
        return `Canvas rendering issues (${errorCount} attempts). Try switching to a different browser or updating your graphics drivers.`;
      case 'dotlottie':
        return `DotLottie player issues (${errorCount} attempts). Try switching to the Lottie Web player for this animation.`;
      case 'loading':
        return `File loading issues (${errorCount} attempts). The animation file may be corrupted or too large.`;
      default:
        return `Player failed after ${errorCount} attempts. Try refreshing the page or using a different browser.`;
    }
  }

  private getNonRetryableAdvice(errorType: string): string {
    switch (errorType) {
      case 'validation':
        return 'Invalid animation file. Please check that your file is a valid Lottie animation.';
      case 'unsupported':
        return 'This animation format is not supported. Try converting to a standard Lottie format.';
      case 'permission':
        return 'Permission denied. Check your browser security settings.';
      default:
        return 'This error cannot be automatically retried. Please check your file and try again manually.';
    }
  }
}

export const globalRetryService = new RetryService();
