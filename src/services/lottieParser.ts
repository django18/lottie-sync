import { unzipSync } from 'fflate';
import { AnimationPreprocessor, type PreprocessedAnimation } from './animationPreprocessor';
import { assetBlobCache } from './assetBlobCache';

export interface LottieAnimation {
  v: string; // version
  fr: number; // frame rate
  ip: number; // in point
  op: number; // out point
  w: number; // width
  h: number; // height
  nm?: string; // name
  ddd?: number; // 3d layer
  layers: any[];
  assets?: any[];
  fonts?: any[];
  chars?: any[];
  markers?: any[];
  meta?: any;
}

export interface ParsedLottie {
  animationData: LottieAnimation;
  sourceFormat: 'json' | 'lottie';
  originalBlobUrl?: string;
  assetsMap?: Record<string, string>;
  metadata: {
    frameRate: number;
    totalFrames: number;
    duration: number;
    width: number;
    height: number;
    version?: string;
    name?: string;
  };
  // New preprocessing info
  preprocessed?: PreprocessedAnimation;
}

export interface LoadAnimationOutput {
  animationData: LottieAnimation;
  sourceFormat: 'json' | 'lottie';
  dotLottieSrcUrl?: string;
  assetsMap?: Record<string, string>;
  metadata: ParsedLottie['metadata'];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function findAnimationInArchive(files: Record<string, Uint8Array>): LottieAnimation {
  const decoder = new TextDecoder();

  // 1. Try common animation file paths
  const commonPaths = ['animation.json', 'animations/animation.json', 'data.json'];

  for (const path of commonPaths) {
    if (files[path]) {
      try {
        const content = decoder.decode(files[path]);
        return JSON.parse(content);
      } catch (error) {
        console.warn(`Failed to parse ${path}:`, error);
      }
    }
  }

  // 2. Read manifest.json for animation references
  if (files['manifest.json']) {
    try {
      const manifest = JSON.parse(decoder.decode(files['manifest.json']));
      if (manifest.animations && manifest.animations.length > 0) {
        const animationId = manifest.animations[0].id;
        const animationPath = `animations/${animationId}.json`;

        if (files[animationPath]) {
          const content = decoder.decode(files[animationPath]);
          return JSON.parse(content);
        }
      }
    } catch (error) {
      console.warn('Failed to parse manifest.json:', error);
    }
  }

  // 3. Find any JSON file that looks like a Lottie animation
  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith('.json')) {
      try {
        const jsonContent = JSON.parse(decoder.decode(content));
        // Check if it has required Lottie properties
        if (jsonContent.v && jsonContent.layers && Array.isArray(jsonContent.layers)) {
          return jsonContent;
        }
      } catch (error) {
        console.warn(`Failed to parse ${path}:`, error);
      }
    }
  }

  throw new Error('No valid animation data found in .lottie file');
}

function processAssets(files: Record<string, Uint8Array>): Record<string, string> {
  const assetsMap: Record<string, string> = {};

  // Create blob URLs for image and other assets using cache
  for (const [path, content] of Object.entries(files)) {
    // Skip JSON files
    if (path.endsWith('.json')) continue;

    // Use asset blob cache for efficient reuse
    const cachedUrl = assetBlobCache.getCachedAssetUrl(path, content);
    assetsMap[path] = cachedUrl;
  }

  return assetsMap;
}

function rewriteAssetPaths(
  animationData: LottieAnimation,
  assetsMap: Record<string, string>
): LottieAnimation {
  // Clone the animation data to avoid modifying the original
  const cloned = JSON.parse(JSON.stringify(animationData));

  // Rewrite asset paths in the assets array
  if (cloned.assets && Array.isArray(cloned.assets)) {
    cloned.assets.forEach((asset: any) => {
      if (asset.u && asset.p) {
        // Asset has path (u) and filename (p)
        const fullPath = `${asset.u}${asset.p}`.replace(/^\/+/, '');
        if (assetsMap[fullPath]) {
          asset.u = '';
          asset.p = assetsMap[fullPath];
        }
      } else if (asset.p) {
        // Asset has only filename
        const path = asset.p.replace(/^\/+/, '');
        if (assetsMap[path]) {
          asset.p = assetsMap[path];
        }
      }
    });
  }

  return cloned;
}

export function validateAnimationData(animationData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required properties
  if (!animationData.v) errors.push('Missing version (v)');
  if (!animationData.layers || !Array.isArray(animationData.layers)) {
    errors.push('Missing or invalid layers array');
  }
  if (typeof animationData.fr !== 'number' || animationData.fr <= 0) {
    errors.push('Missing or invalid frame rate (fr)');
  }
  if (typeof animationData.w !== 'number' || animationData.w <= 0) {
    errors.push('Missing or invalid width (w)');
  }
  if (typeof animationData.h !== 'number' || animationData.h <= 0) {
    errors.push('Missing or invalid height (h)');
  }

  // Warnings for optional but common properties
  if (typeof animationData.ip !== 'number') warnings.push('Missing in point (ip)');
  if (typeof animationData.op !== 'number') warnings.push('Missing out point (op)');
  if (!animationData.nm) warnings.push('Missing animation name (nm)');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export async function parseLottieFile(file: File): Promise<ParsedLottie> {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    // Handle .json files
    if (file.name.endsWith('.json') || file.type === 'application/json') {
      const text = await file.text();
      const rawAnimationData = JSON.parse(text);

      // Preprocess animation data for optimization
      const preprocessed = AnimationPreprocessor.preprocess(rawAnimationData, 'json');

      console.log(
        '📊 [PARSER] JSON preprocessing summary:\n' +
          AnimationPreprocessor.createSummary(preprocessed)
      );

      return {
        animationData: preprocessed.animationData,
        sourceFormat: 'json',
        originalBlobUrl: undefined,
        assetsMap: undefined,
        metadata: preprocessed.metadata,
        preprocessed,
      };
    }

    // Handle .lottie files
    if (file.name.endsWith('.lottie')) {
      const buffer = await file.arrayBuffer();
      let files: Record<string, Uint8Array>;

      try {
        files = unzipSync(new Uint8Array(buffer));
      } catch (error) {
        throw new Error(`Failed to extract .lottie file: ${error}`);
      }

      // Find animation JSON in archive
      const rawAnimationData = findAnimationInArchive(files);

      // Preprocess animation data for optimization
      const preprocessed = AnimationPreprocessor.preprocess(rawAnimationData, 'lottie');

      console.log(
        '📊 [PARSER] .lottie preprocessing summary:\n' +
          AnimationPreprocessor.createSummary(preprocessed)
      );

      // Create blob URL for DotLottie player (original .lottie file)
      const originalBlobUrl = URL.createObjectURL(file);

      // Extract and process assets for Lottie Web (now with caching)
      const assetsMap = processAssets(files);

      // Rewrite asset paths in animation data for Lottie Web
      const animationData = rewriteAssetPaths(preprocessed.animationData, assetsMap);

      return {
        animationData,
        sourceFormat: 'lottie',
        originalBlobUrl,
        assetsMap,
        metadata: preprocessed.metadata,
        preprocessed,
      };
    }

    throw new Error(
      `Unsupported file format: ${file.name}. Only .json and .lottie files are supported.`
    );
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to parse file: ${error}`);
  }
}

// Cleanup function to revoke blob URLs
export function cleanupParsedLottie(parsed: ParsedLottie): void {
  if (parsed.originalBlobUrl) {
    URL.revokeObjectURL(parsed.originalBlobUrl);
  }

  if (parsed.assetsMap) {
    Object.values(parsed.assetsMap).forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
  }
}
