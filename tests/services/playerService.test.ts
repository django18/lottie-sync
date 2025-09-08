import { describe, it, expect, vi } from 'vitest';
import {
  PlayerFactory,
  DotLottieAdapter,
  LottieWebAdapter,
} from '../../src/services/playerService';
import type { LottieFile, PlayerConfig } from '../../src/types';

describe('PlayerFactory', () => {
  it('should create correct adapter for dotlottie', () => {
    const adapter = PlayerFactory.createAdapter('dotlottie');
    expect(adapter).toBeInstanceOf(DotLottieAdapter);
  });

  it('should create correct adapter for lottie-web', () => {
    const adapter = PlayerFactory.createAdapter('lottie-web');
    expect(adapter).toBeInstanceOf(LottieWebAdapter);
  });

  it('should throw error for unknown player type', () => {
    expect(() => {
      PlayerFactory.createAdapter('unknown' as any);
    }).toThrow('Unknown player type: unknown');
  });

  it('should return supported types', () => {
    const types = PlayerFactory.getSupportedTypes();
    expect(types).toEqual(['dotlottie', 'lottie-web']);
  });

  it('should recommend correct player type', () => {
    const lottieFile: LottieFile = {
      id: '1',
      name: 'test.lottie',
      url: 'blob:test',
      file: new File(['test'], 'test.lottie'),
      type: 'lottie',
    };

    const recommended = PlayerFactory.getRecommendedType(lottieFile);
    expect(recommended).toBe('dotlottie');

    const jsonFile: LottieFile = {
      id: '2',
      name: 'test.json',
      url: 'blob:test',
      file: new File(['{}'], 'test.json'),
      type: 'json',
    };

    const recommendedJson = PlayerFactory.getRecommendedType(jsonFile);
    expect(recommendedJson).toBe('lottie-web');
  });
});

describe('PlayerAdapter', () => {
  const mockFile: LottieFile = {
    id: '1',
    name: 'test.json',
    url: 'data:application/json,{"v":"1.0"}',
    file: new File(['{"v":"1.0"}'], 'test.json'),
    type: 'json',
  };

  const mockConfig: PlayerConfig = {
    id: '1',
    type: 'lottie-web',
    autoplay: false,
    loop: false,
    speed: 1,
  };

  describe('DotLottieAdapter', () => {
    it('should implement all required methods', () => {
      const adapter = new DotLottieAdapter();

      expect(typeof adapter.play).toBe('function');
      expect(typeof adapter.pause).toBe('function');
      expect(typeof adapter.stop).toBe('function');
      expect(typeof adapter.seek).toBe('function');
      expect(typeof adapter.setSpeed).toBe('function');
      expect(typeof adapter.setLoop).toBe('function');
      expect(typeof adapter.destroy).toBe('function');
      expect(typeof adapter.addEventListener).toBe('function');
      expect(typeof adapter.removeEventListener).toBe('function');
    });

    it('should handle event listeners', () => {
      const adapter = new DotLottieAdapter();
      const mockCallback = vi.fn();

      adapter.addEventListener('play', mockCallback);
      adapter.play(); // Should emit play event

      adapter.removeEventListener('play', mockCallback);
    });
  });

  describe('LottieWebAdapter', () => {
    it('should implement all required methods', () => {
      const adapter = new LottieWebAdapter();

      expect(typeof adapter.play).toBe('function');
      expect(typeof adapter.pause).toBe('function');
      expect(typeof adapter.stop).toBe('function');
      expect(typeof adapter.seek).toBe('function');
      expect(typeof adapter.setSpeed).toBe('function');
      expect(typeof adapter.setLoop).toBe('function');
      expect(typeof adapter.destroy).toBe('function');
      expect(typeof adapter.addEventListener).toBe('function');
      expect(typeof adapter.removeEventListener).toBe('function');
    });

    it('should return correct default values before initialization', () => {
      const adapter = new LottieWebAdapter();

      expect(adapter.getCurrentFrame()).toBe(0);
      expect(adapter.getTotalFrames()).toBe(0);
      expect(adapter.getCurrentTime()).toBe(0);
      expect(adapter.getDuration()).toBe(0);
    });
  });
});
