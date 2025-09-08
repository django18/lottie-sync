import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileValidator, type FileValidationResult } from '../../src/utils/fileValidation';

// Mock FileReader for tests
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  readAsText(file: File) {
    setTimeout(() => {
      if (file.name.includes('corrupt')) {
        this.onerror?.({ type: 'error' });
        return;
      }
      
      // Mock different file contents based on filename
      if (file.name.endsWith('.json')) {
        if (file.name.includes('invalid-json')) {
          this.result = '{"invalid": json}'; // Invalid JSON
        } else if (file.name.includes('missing-version')) {
          this.result = JSON.stringify({ layers: [], assets: [] });
        } else if (file.name.includes('missing-layers')) {
          this.result = JSON.stringify({ v: '5.0' });
        } else if (file.name.includes('complex')) {
          this.result = JSON.stringify({
            v: '5.0',
            fr: 60,
            ip: 0,
            op: 120,
            w: 1920,
            h: 1080,
            layers: new Array(150).fill({}), // Many layers
            assets: new Array(75).fill({}) // Many assets
          });
        } else {
          this.result = JSON.stringify({
            v: '5.0',
            fr: 30,
            ip: 0,
            op: 60,
            w: 400,
            h: 400,
            layers: [{ ty: 1 }, { ty: 2 }],
            assets: [{ id: 'asset1' }]
          });
        }
      } else {
        this.result = file.name.includes('text') ? 'plain text' : 'mock content';
      }
      
      this.onload?.({ type: 'load' });
    }, 0);
  }

  readAsArrayBuffer(file: File) {
    setTimeout(() => {
      if (file.name.includes('corrupt')) {
        this.onerror?.({ type: 'error' });
        return;
      }

      // Mock ZIP signature for .lottie files
      if (file.name.endsWith('.lottie')) {
        if (file.name.includes('invalid-zip')) {
          // Invalid ZIP signature
          this.result = new Uint8Array([0x48, 0x65]).buffer;
        } else {
          // Valid ZIP signature (PK)
          this.result = new Uint8Array([0x50, 0x4B, 0x03, 0x04]).buffer;
        }
      } else {
        this.result = new ArrayBuffer(100);
      }
      
      this.onload?.({ type: 'load' });
    }, 0);
  }
}

// Setup global FileReader mock
beforeEach(() => {
  global.FileReader = MockFileReader as any;
});

describe('Enhanced File Validation', () => {
  describe('FileValidator.validateLottieFile', () => {
    it('should validate valid .lottie files', async () => {
      const file = new File(['mock zip content'], 'animation.lottie', { type: 'application/zip' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('lottie');
      expect(result.detectedFormat).toBe('Lottie Animation');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toContain('Full .lottie validation requires extraction - basic ZIP validation passed');
    });

    it('should validate valid JSON Lottie files', async () => {
      const file = new File(['{"v": "5.0"}'], 'animation.json', { type: 'application/json' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(true);
      expect(result.fileType).toBe('json');
      expect(result.detectedFormat).toBe('JSON Animation');
      expect(result.metadata).toEqual({
        version: '5.0',
        frameRate: 30,
        duration: 2,
        width: 400,
        height: 400,
        layers: 2,
        assets: 1
      });
    });

    it('should detect and provide advice for unsupported video files', async () => {
      const file = new File(['video content'], 'animation.mp4', { type: 'video/mp4' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.fileType).toBe('unsupported');
      expect(result.detectedFormat).toBe('video file');
      expect(result.errors).toContain('Unsupported video file: animation.mp4');
      expect(result.suggestedAction).toContain('Consider converting your video to Lottie format using Adobe After Effects');
    });

    it('should detect and provide advice for GIF files', async () => {
      const file = new File(['gif content'], 'animation.gif', { type: 'image/gif' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.fileType).toBe('unsupported');
      expect(result.detectedFormat).toBe('animated image');
      expect(result.suggestedAction).toBe('Convert your GIF to Lottie format for better performance and quality.');
    });

    it('should detect and provide advice for SVG files', async () => {
      const file = new File(['svg content'], 'icon.svg', { type: 'image/svg+xml' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.fileType).toBe('unsupported');
      expect(result.detectedFormat).toBe('vector graphic');
      expect(result.suggestedAction).toContain('If this contains animations, convert to Lottie format');
    });

    it('should handle unknown file types', async () => {
      const file = new File(['unknown content'], 'file.xyz', { type: 'application/octet-stream' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.fileType).toBe('unsupported');
      expect(result.detectedFormat).toBe('unknown format');
      expect(result.suggestedAction).toContain('Only .lottie and .json animation files are supported');
    });

    it('should reject empty files', async () => {
      const file = new File([], 'empty.lottie', { type: 'application/zip' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject files exceeding size limit', async () => {
      const largeContent = new Array(51 * 1024 * 1024).fill('x').join(''); // 51MB
      const file = new File([largeContent], 'large.lottie', { type: 'application/zip' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size (51.0 MB) exceeds maximum allowed size (50.0 MB)');
    });

    it('should warn about large files', async () => {
      const largeContent = new Array(15 * 1024 * 1024).fill('x').join(''); // 15MB
      const file = new File([largeContent], 'large.lottie', { type: 'application/zip' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.warnings).toContain('Large file size (15.0 MB) may impact performance');
    });

    it('should reject invalid .lottie files (missing ZIP signature)', async () => {
      const file = new File(['not a zip'], 'invalid-zip.lottie', { type: 'application/zip' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is not a valid .lottie archive (missing ZIP signature)');
      expect(result.suggestedAction).toContain('Ensure the file is a valid .lottie file exported from Adobe After Effects');
    });

    it('should reject invalid JSON files', async () => {
      const file = new File(['invalid json'], 'invalid-json.json', { type: 'application/json' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format or malformed Lottie animation data');
      expect(result.suggestedAction).toContain('Ensure the file is a valid Lottie JSON exported from Adobe After Effects');
    });

    it('should reject JSON files missing version', async () => {
      const file = new File(['content'], 'missing-version.json', { type: 'application/json' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Lottie JSON: missing version field');
    });

    it('should reject JSON files missing layers', async () => {
      const file = new File(['content'], 'missing-layers.json', { type: 'application/json' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Lottie JSON: missing or invalid layers');
    });

    it('should warn about complex animations', async () => {
      const file = new File(['content'], 'complex.json', { type: 'application/json' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.warnings).toContain('Animation has many layers - this may impact performance');
      expect(result.warnings).toContain('Animation has many assets - this may impact loading time');
    });

    it('should handle file reading errors', async () => {
      const file = new File(['content'], 'corrupt.lottie', { type: 'application/zip' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to validate file: Error: Failed to read file');
    });

    it('should provide specific advice for audio files', async () => {
      const file = new File(['audio content'], 'sound.mp3', { type: 'audio/mpeg' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Audio files are not supported: sound.mp3');
      expect(result.suggestedAction).toContain('Lottie animations are visual only. Audio should be handled separately');
    });

    it('should provide specific advice for static images', async () => {
      const file = new File(['image content'], 'image.png', { type: 'image/png' });
      const result = await FileValidator.validateLottieFile(file);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Static images are not supported: image.png');
      expect(result.suggestedAction).toContain('Use Lottie for animations. Static images should be converted to animated Lottie files');
    });
  });

  describe('FileValidator.createLottieFile', () => {
    it('should create LottieFile from valid .lottie file', async () => {
      const file = new File(['zip content'], 'animation.lottie', { type: 'application/zip' });
      const validationResult: FileValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fileType: 'lottie',
        detectedFormat: 'Lottie Animation',
        metadata: { version: '5.0', frameRate: 30, duration: 2, width: 400, height: 400, layers: 1, assets: 0 }
      };

      // Mock FileReader for createLottieFile
      const mockReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:application/zip;base64,mock-data'
      };
      global.FileReader = vi.fn(() => mockReader) as any;

      const promise = FileValidator.createLottieFile(file, validationResult);
      mockReader.onload();
      const lottieFile = await promise;

      expect(lottieFile.type).toBe('lottie');
      expect(lottieFile.name).toBe('animation.lottie');
      expect(lottieFile.url).toBe('data:application/zip;base64,mock-data');
      expect(lottieFile.validationResult?.isValid).toBe(true);
    });

    it('should create LottieFile from valid JSON file', async () => {
      const file = new File(['json content'], 'animation.json', { type: 'application/json' });
      const validationResult: FileValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fileType: 'json',
        detectedFormat: 'JSON Animation',
        metadata: { version: '5.0', frameRate: 30, duration: 2, width: 400, height: 400, layers: 2, assets: 1 }
      };

      const mockReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:application/json;base64,mock-data'
      };
      global.FileReader = vi.fn(() => mockReader) as any;

      const promise = FileValidator.createLottieFile(file, validationResult);
      mockReader.onload();
      const lottieFile = await promise;

      expect(lottieFile.type).toBe('json');
      expect(lottieFile.name).toBe('animation.json');
      expect(lottieFile.metadata).toEqual(validationResult.metadata);
    });

    it('should handle file reading errors during creation', async () => {
      const file = new File(['content'], 'animation.lottie', { type: 'application/zip' });
      const validationResult: FileValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fileType: 'lottie',
        detectedFormat: 'Lottie Animation'
      };

      const mockReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: null
      };
      global.FileReader = vi.fn(() => mockReader) as any;

      const promise = FileValidator.createLottieFile(file, validationResult);
      mockReader.onerror();

      await expect(promise).rejects.toThrow('Failed to read file');
    });
  });
});