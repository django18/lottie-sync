import type { LottieFile } from '../types';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileType?: 'lottie' | 'json' | 'unsupported';
  detectedFormat?: string;
  suggestedAction?: string;
  metadata?: {
    version?: string;
    frameRate?: number;
    duration?: number;
    width?: number;
    height?: number;
    layers?: number;
    assets?: number;
  };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const SUPPORTED_EXTENSIONS = ['.lottie', '.json'] as const;
const COMMON_UNSUPPORTED_EXTENSIONS = {
  '.mp4': 'video file',
  '.avi': 'video file',
  '.mov': 'video file',
  '.gif': 'animated image',
  '.png': 'static image',
  '.jpg': 'static image',
  '.jpeg': 'static image',
  '.svg': 'vector graphic',
  '.pdf': 'document',
  '.zip': 'archive file',
  '.rar': 'archive file',
  '.7z': 'archive file',
} as const;

const ANIMATION_FORMATS = {
  '.mp4':
    'Consider converting your video to Lottie format using Adobe After Effects with the Bodymovin plugin.',
  '.gif': 'Convert your GIF to Lottie format for better performance and quality.',
  '.svg':
    'If this contains animations, convert to Lottie format. Static SVGs cannot be animated with Lottie.',
  '.avi': 'Convert your video to Lottie format using Adobe After Effects.',
  '.mov': 'Convert your video to Lottie format using Adobe After Effects.',
} as const;

export class FileValidator {
  static async validateLottieFile(file: File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {},
      fileType: 'unsupported',
      detectedFormat: 'unknown',
    };

    try {
      // Basic file validation
      this.validateFileBasics(file, result);

      if (!result.isValid) {
        return result;
      }

      // Detect file type and provide specific guidance
      const fileExtension = this.getFileExtension(file.name);
      const mimeType = file.type;

      if (fileExtension === '.lottie') {
        result.fileType = 'lottie';
        result.detectedFormat = 'Lottie Animation';
        const content = await this.readFileAsArrayBuffer(file);
        await this.validateDotLottieFile(content, result);
      } else if (fileExtension === '.json') {
        result.fileType = 'json';
        result.detectedFormat = 'JSON Animation';
        const content = await this.readFileContent(file);
        await this.validateJsonLottieFile(content, result);
      } else {
        result.fileType = 'unsupported';
        this.handleUnsupportedFileType(file, fileExtension, mimeType, result);
      }
    } catch (error) {
      result.errors.push(`Failed to validate file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  private static validateFileBasics(file: File, result: FileValidationResult): void {
    // Check file size
    if (file.size === 0) {
      result.errors.push('File is empty');
      result.isValid = false;
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      result.errors.push(
        `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(MAX_FILE_SIZE)})`
      );
      result.isValid = false;
    }

    // Check file name
    if (!file.name || file.name.length === 0) {
      result.errors.push('File name is empty');
      result.isValid = false;
    }

    // Warning for large files
    if (file.size > 10 * 1024 * 1024) {
      result.warnings.push(
        `Large file size (${this.formatFileSize(file.size)}) may impact performance`
      );
    }
  }

  private static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static async validateJsonLottieFile(
    content: string,
    result: FileValidationResult
  ): Promise<void> {
    try {
      const animationData = JSON.parse(content);

      // Basic Lottie JSON validation
      if (!animationData.v) {
        result.errors.push('Invalid Lottie JSON: missing version field');
        result.isValid = false;
        return;
      }

      if (!animationData.layers || !Array.isArray(animationData.layers)) {
        result.errors.push('Invalid Lottie JSON: missing or invalid layers');
        result.isValid = false;
        return;
      }

      // Extract metadata
      result.metadata = {
        version: animationData.v,
        frameRate: animationData.fr || 30,
        duration: animationData.op
          ? (animationData.op - (animationData.ip || 0)) / (animationData.fr || 30)
          : 0,
        width: animationData.w || 400,
        height: animationData.h || 400,
        layers: animationData.layers.length,
        assets: animationData.assets ? animationData.assets.length : 0,
      };

      // Warnings for potential issues
      if (animationData.layers.length > 100) {
        result.warnings.push('Animation has many layers - this may impact performance');
      }

      if (animationData.assets && animationData.assets.length > 50) {
        result.warnings.push('Animation has many assets - this may impact loading time');
      }
    } catch (error) {
      result.errors.push('Invalid JSON format or malformed Lottie animation data');
      result.suggestedAction =
        'Ensure the file is a valid Lottie JSON exported from Adobe After Effects.';
      result.isValid = false;
    }
  }

  private static getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  private static handleUnsupportedFileType(
    file: File,
    extension: string,
    mimeType: string,
    result: FileValidationResult
  ): void {
    result.isValid = false;
    result.detectedFormat =
      COMMON_UNSUPPORTED_EXTENSIONS[extension as keyof typeof COMMON_UNSUPPORTED_EXTENSIONS] ||
      'unknown format';

    if (ANIMATION_FORMATS[extension as keyof typeof ANIMATION_FORMATS]) {
      result.errors.push(`Unsupported ${result.detectedFormat}: ${file.name}`);
      result.suggestedAction = ANIMATION_FORMATS[extension as keyof typeof ANIMATION_FORMATS];
    } else if (mimeType.startsWith('video/')) {
      result.errors.push(`Video files are not supported: ${file.name}`);
      result.suggestedAction =
        'Convert your video to Lottie format using Adobe After Effects with the Bodymovin plugin.';
    } else if (mimeType.startsWith('image/')) {
      result.errors.push(`Static images are not supported: ${file.name}`);
      result.suggestedAction =
        'Use Lottie for animations. Static images should be converted to animated Lottie files.';
    } else if (mimeType.startsWith('audio/')) {
      result.errors.push(`Audio files are not supported: ${file.name}`);
      result.suggestedAction =
        'Lottie animations are visual only. Audio should be handled separately in your application.';
    } else {
      result.errors.push(`Unsupported file type: ${file.name}`);
      result.suggestedAction = `Only .lottie and .json animation files are supported. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`;
    }
  }

  private static async validateDotLottieFile(
    content: ArrayBuffer,
    result: FileValidationResult
  ): Promise<void> {
    try {
      // .lottie files are ZIP archives, check ZIP signature
      const uint8Array = new Uint8Array(content);
      const isZipFile = uint8Array[0] === 0x50 && uint8Array[1] === 0x4b; // 'PK' signature

      if (!isZipFile) {
        result.errors.push('File is not a valid .lottie archive (missing ZIP signature)');
        result.suggestedAction =
          'Ensure the file is a valid .lottie file exported from Adobe After Effects or similar tools.';
        result.isValid = false;
        return;
      }

      // Add default metadata for .lottie files
      result.metadata = {
        version: 'Unknown',
        frameRate: 30,
        duration: 0,
        width: 400,
        height: 400,
        layers: 0,
        assets: 0,
      };

      result.warnings.push(
        'Full .lottie validation requires extraction - basic ZIP validation passed'
      );
    } catch (error) {
      result.errors.push(`Failed to validate .lottie file: ${error}`);
      result.isValid = false;
    }
  }

  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  static createLottieFile(file: File, validationResult: FileValidationResult): Promise<LottieFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const lottieFile: LottieFile = {
            id: crypto.randomUUID(),
            name: file.name,
            url: reader.result as string,
            file,
            type: validationResult.fileType === 'json' ? 'json' : 'lottie',
            metadata: validationResult.metadata,
            validationResult: {
              isValid: validationResult.isValid,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
            },
          };

          resolve(lottieFile);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
