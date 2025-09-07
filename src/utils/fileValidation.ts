import type { LottieFile } from '../types';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
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

export class FileValidator {
  static async validateLottieFile(file: File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {},
    };

    try {
      // Basic file validation
      this.validateFileBasics(file, result);

      if (!result.isValid) {
        return result;
      }

      // Read and parse file content
      const content = await this.readFileContent(file);

      if (file.name.endsWith('.lottie')) {
        await this.validateDotLottieFile(content, result);
      } else {
        result.errors.push('Unsupported file format. Only .lottie files are supported.');
        result.isValid = false;
      }
    } catch (error) {
      result.errors.push(`Failed to validate file: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  private static validateFileBasics(file: File, result: FileValidationResult): void {
    // Check file size
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

    // Check file extension
    if (!file.name.toLowerCase().endsWith('.lottie')) {
      result.errors.push('Invalid file extension. Only .lottie files are supported.');
      result.isValid = false;
    }

    // Warning for large files
    if (file.size > 10 * 1024 * 1024) {
      // 10MB
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

  private static async validateDotLottieFile(
    content: string,
    result: FileValidationResult
  ): Promise<void> {
    try {
      // .lottie files are ZIP archives, do basic validation

      // Check if it looks like a ZIP file (starts with PK)
      if (!content.startsWith('PK')) {
        result.errors.push('File is not a valid .lottie archive (missing ZIP signature)');
        result.isValid = false;
        return;
      }

      // Add default metadata for .lottie files
      result.metadata = {
        version: 'Unknown',
        frameRate: 30, // Default
        duration: 0,
        width: 400, // Default
        height: 400, // Default
        layers: 0,
        assets: 0,
      };
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
            type: 'lottie',
            metadata: validationResult.metadata,
            validationResult,
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
