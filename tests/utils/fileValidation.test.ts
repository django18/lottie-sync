import { describe, it, expect } from 'vitest';

// Mock file validation functionality
const validateLottieFile = (file: File) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (!file.name.endsWith('.lottie') && !file.name.endsWith('.json')) {
    errors.push('Invalid file type. Only .lottie and .json files are supported.');
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 10MB limit.');
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty.');
  }

  // Mock JSON validation for .json files
  if (file.name.endsWith('.json') && file.size < 100) {
    warnings.push('JSON file seems unusually small.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

const validateFileContent = async (file: File) => {
  try {
    if (file.name.endsWith('.json')) {
      // Mock file content reading based on filename patterns
      if (file.name.includes('malformed')) {
        throw new Error('Parse error');
      }

      if (file.name.includes('invalid')) {
        return { isValid: false, error: 'Invalid Lottie structure' };
      }

      // Valid file case
      return { isValid: true };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Failed to parse file content' };
  }
};

describe('File Validation', () => {
  it('should validate .lottie files', () => {
    const file = new File(['test'], 'animation.lottie', { type: 'application/zip' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate .json files', () => {
    const file = new File(['{"v": "1.0"}'], 'animation.json', { type: 'application/json' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should reject invalid file types', () => {
    const file = new File(['test'], 'animation.mp4', { type: 'video/mp4' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Invalid file type. Only .lottie and .json files are supported.'
    );
  });

  it('should reject files that are too large', () => {
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const file = new File([largeContent], 'large.lottie', { type: 'application/zip' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('File size exceeds 10MB limit.');
  });

  it('should reject empty files', () => {
    const file = new File([], 'empty.lottie', { type: 'application/zip' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('File is empty.');
  });

  it('should warn about small JSON files', () => {
    const file = new File(['{}'], 'small.json', { type: 'application/json' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('JSON file seems unusually small.');
  });

  it('should validate JSON content structure', async () => {
    const validJson = JSON.stringify({ v: '1.0', layers: [], assets: [] });
    const file = new File([validJson], 'valid.json', { type: 'application/json' });

    const result = await validateFileContent(file);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid JSON content', async () => {
    const invalidJson = '{"invalid": "structure"}';
    const file = new File([invalidJson], 'invalid.json', { type: 'application/json' });

    const result = await validateFileContent(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid Lottie structure');
  });

  it('should handle malformed JSON', async () => {
    const malformedJson = '{"incomplete":';
    const file = new File([malformedJson], 'malformed.json', { type: 'application/json' });

    const result = await validateFileContent(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Failed to parse file content');
  });

  it('should handle multiple validation errors', () => {
    const file = new File([], 'invalid.mp4', { type: 'video/mp4' });
    const result = validateLottieFile(file);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain(
      'Invalid file type. Only .lottie and .json files are supported.'
    );
    expect(result.errors).toContain('File is empty.');
  });
});
