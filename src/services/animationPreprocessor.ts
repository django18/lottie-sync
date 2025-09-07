import type { LottieAnimation, ValidationResult } from './lottieParser';
import { validateAnimationData } from './lottieParser';

export interface PreprocessedAnimation {
  animationData: LottieAnimation;
  metadata: {
    frameRate: number;
    totalFrames: number;
    duration: number;
    width: number;
    height: number;
    version?: string;
    name?: string;
    // Preprocessing metadata
    isPreprocessed: true;
    preprocessedAt: number;
    validationResult: ValidationResult;
    optimizations: string[];
    originalSize: number;
    processedSize: number;
  };
}

export class AnimationPreprocessor {
  /**
   * Preprocess animation data with validation and normalization
   */
  static preprocess(
    animationData: LottieAnimation,
    sourceFormat: 'json' | 'lottie'
  ): PreprocessedAnimation {
    const startTime = performance.now();
    const originalSize = this.estimateSize(animationData);

    console.log('🔄 [PREPROCESSOR] Starting animation preprocessing...');

    // 1. Validate animation data
    const validationResult = validateAnimationData(animationData);
    if (!validationResult.valid) {
      throw new Error(`Animation validation failed: ${validationResult.errors.join(', ')}`);
    }

    // 2. Normalize and optimize
    const optimizations: string[] = [];
    let processedData = this.deepClone(animationData);

    processedData = this.normalizeFrameRate(processedData, optimizations);
    processedData = this.normalizeProperties(processedData, optimizations);
    processedData = this.optimizeLayers(processedData, optimizations);

    if (sourceFormat === 'lottie') {
      processedData = this.optimizeAssets(processedData, optimizations);
    }

    // 3. Extract metadata
    const frameRate = processedData.fr || 30;
    const inPoint = processedData.ip || 0;
    const outPoint = processedData.op || 0;
    const totalFrames = Math.max(0, outPoint - inPoint);
    const duration = totalFrames / frameRate;

    const processedSize = this.estimateSize(processedData);
    const processingTime = performance.now() - startTime;

    const result: PreprocessedAnimation = {
      animationData: processedData,
      metadata: {
        frameRate,
        totalFrames,
        duration,
        width: processedData.w || 512,
        height: processedData.h || 512,
        version: processedData.v,
        name: processedData.nm,
        isPreprocessed: true,
        preprocessedAt: Date.now(),
        validationResult,
        optimizations,
        originalSize,
        processedSize,
      },
    };

    console.log(`✅ [PREPROCESSOR] Animation preprocessed in ${processingTime.toFixed(2)}ms`, {
      optimizations: optimizations.length,
      sizeReduction: `${originalSize} → ${processedSize} bytes`,
      frameRate,
      totalFrames,
      duration: `${duration.toFixed(2)}s`,
    });

    return result;
  }

  /**
   * Normalize frame rate to common values
   */
  private static normalizeFrameRate(
    animationData: LottieAnimation,
    optimizations: string[]
  ): LottieAnimation {
    const frameRate = animationData.fr;

    // Common frame rates: 24, 25, 30, 60
    const commonFrameRates = [24, 25, 30, 60];
    const closest = commonFrameRates.reduce((prev, curr) =>
      Math.abs(curr - frameRate) < Math.abs(prev - frameRate) ? curr : prev
    );

    if (Math.abs(frameRate - closest) < 1 && frameRate !== closest) {
      animationData.fr = closest;
      optimizations.push(`Normalized frame rate ${frameRate} → ${closest}`);
    }

    return animationData;
  }

  /**
   * Normalize common properties
   */
  private static normalizeProperties(
    animationData: LottieAnimation,
    optimizations: string[]
  ): LottieAnimation {
    // Ensure required properties exist
    if (typeof animationData.ip !== 'number') {
      animationData.ip = 0;
      optimizations.push('Added missing in-point (ip)');
    }

    if (typeof animationData.op !== 'number') {
      animationData.op = animationData.layers?.length ? 100 : 0;
      optimizations.push('Added missing out-point (op)');
    }

    // Validate dimensions but don't normalize them to avoid visual issues
    if (animationData.w && animationData.h) {
      const { w, h } = animationData;

      // Only fix clearly invalid dimensions (too small or too large)
      if (w < 1 || h < 1) {
        animationData.w = 512;
        animationData.h = 512;
        optimizations.push(`Fixed invalid dimensions ${w}x${h} → 512x512`);
      } else if (w > 4096 || h > 4096) {
        // Scale down extremely large dimensions while preserving aspect ratio
        const aspectRatio = w / h;
        const maxDimension = 2048;

        if (w > h) {
          animationData.w = maxDimension;
          animationData.h = Math.round(maxDimension / aspectRatio);
        } else {
          animationData.h = maxDimension;
          animationData.w = Math.round(maxDimension * aspectRatio);
        }
        optimizations.push(
          `Scaled down large dimensions ${w}x${h} → ${animationData.w}x${animationData.h}`
        );
      }
      // Note: Removed aggressive dimension normalization to preserve original animation sizing
    }

    return animationData;
  }

  /**
   * Optimize layer structure
   */
  private static optimizeLayers(
    animationData: LottieAnimation,
    optimizations: string[]
  ): LottieAnimation {
    if (!animationData.layers || !Array.isArray(animationData.layers)) {
      return animationData;
    }

    const originalLayerCount = animationData.layers.length;

    // Remove empty or invalid layers
    animationData.layers = animationData.layers.filter((layer) => {
      if (!layer || typeof layer !== 'object') return false;

      // Keep layers with valid type
      if (!layer.ty || typeof layer.ty !== 'number') return false;

      return true;
    });

    const removedLayers = originalLayerCount - animationData.layers.length;
    if (removedLayers > 0) {
      optimizations.push(`Removed ${removedLayers} invalid layers`);
    }

    // Sort layers by index for consistent rendering
    animationData.layers.sort((a, b) => (a.ind || 0) - (b.ind || 0));

    return animationData;
  }

  /**
   * Optimize asset references
   */
  private static optimizeAssets(
    animationData: LottieAnimation,
    optimizations: string[]
  ): LottieAnimation {
    if (!animationData.assets || !Array.isArray(animationData.assets)) {
      return animationData;
    }

    const originalAssetCount = animationData.assets.length;

    // Remove duplicate assets (same id)
    const uniqueAssets = new Map();
    for (const asset of animationData.assets) {
      if (asset && asset.id && !uniqueAssets.has(asset.id)) {
        uniqueAssets.set(asset.id, asset);
      }
    }

    animationData.assets = Array.from(uniqueAssets.values());

    const removedAssets = originalAssetCount - animationData.assets.length;
    if (removedAssets > 0) {
      optimizations.push(`Removed ${removedAssets} duplicate assets`);
    }

    return animationData;
  }

  /**
   * Deep clone object to avoid mutations
   */
  private static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Estimate object size in bytes
   */
  private static estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  /**
   * Check if animation data is already preprocessed
   */
  static isPreprocessed(data: any): data is PreprocessedAnimation {
    return (
      data && typeof data === 'object' && data.metadata && data.metadata.isPreprocessed === true
    );
  }

  /**
   * Create preprocessing summary for debugging
   */
  static createSummary(preprocessed: PreprocessedAnimation): string {
    const { metadata } = preprocessed;
    const sizeReduction = metadata.originalSize - metadata.processedSize;
    const sizeReductionPercent = (sizeReduction / metadata.originalSize) * 100;

    return [
      `Animation: ${metadata.name || 'Untitled'}`,
      `Dimensions: ${metadata.width}x${metadata.height}`,
      `Duration: ${metadata.totalFrames} frames @ ${metadata.frameRate}fps (${metadata.duration.toFixed(2)}s)`,
      `Size: ${metadata.originalSize} → ${metadata.processedSize} bytes (${sizeReductionPercent.toFixed(1)}% reduction)`,
      `Optimizations: ${metadata.optimizations.join(', ') || 'None'}`,
      `Validation: ${metadata.validationResult.valid ? '✅ Valid' : '❌ Invalid'}`,
      ...(metadata.validationResult.warnings.length > 0
        ? [`Warnings: ${metadata.validationResult.warnings.join(', ')}`]
        : []),
    ].join('\n');
  }
}
