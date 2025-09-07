import { createMachine, assign, fromPromise } from 'xstate';
import type { FileManagerContext, FileManagerEvent } from '../types/machines';
import type { LottieFile } from '../types';

const SUPPORTED_TYPES = ['.lottie'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const fileManagerMachine = createMachine(
  {
    id: 'fileManager',
    types: {} as {
      context: FileManagerContext;
      events: FileManagerEvent;
    },
    context: {
      files: [],
      uploadProgress: new Map(),
      validationErrors: new Map(),
      supportedTypes: SUPPORTED_TYPES,
      maxFileSize: MAX_FILE_SIZE,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          UPLOAD_FILES: {
            target: 'validating',
            actions: 'prepareValidation',
          },
          REMOVE_FILE: {
            actions: 'removeFile',
          },
          CLEAR_ALL: {
            actions: 'clearAllFiles',
          },
        },
      },
      validating: {
        invoke: {
          id: 'validateFiles',
          src: fromPromise(
            async ({ input }: { input: { files: File[]; context: FileManagerContext } }) => {
              const { files, context } = input;
              const validationResults: Array<{ file: File; valid: boolean; error?: string }> = [];

              for (const file of files) {
                try {
                  // Check file size
                  if (file.size > context.maxFileSize) {
                    validationResults.push({
                      file,
                      valid: false,
                      error: `File size exceeds ${context.maxFileSize / (1024 * 1024)}MB limit`,
                    });
                    continue;
                  }

                  // Check file type
                  const hasValidExtension = context.supportedTypes.some((type) =>
                    file.name.toLowerCase().endsWith(type)
                  );

                  if (!hasValidExtension) {
                    validationResults.push({
                      file,
                      valid: false,
                      error: `Unsupported file type. Supported types: ${context.supportedTypes.join(', ')}`,
                    });
                    continue;
                  }

                  // Basic validation for .lottie files
                  // .lottie files are ZIP archives containing Lottie animations

                  // If we get here, file is valid
                  validationResults.push({
                    file,
                    valid: true,
                  });
                } catch (error) {
                  validationResults.push({
                    file,
                    valid: false,
                    error: `Validation error: ${error}`,
                  });
                }
              }

              return validationResults;
            }
          ),
          input: ({ context, event }) => ({
            files: (event as any).files,
            context,
          }),
          onDone: {
            target: 'processing',
            actions: 'handleValidationResults',
          },
          onError: {
            target: 'idle',
            actions: 'handleValidationError',
          },
        },
      },
      processing: {
        invoke: {
          id: 'processFiles',
          src: fromPromise(async ({ input }: { input: { validFiles: File[] } }) => {
            const { validFiles } = input;
            const processedFiles: LottieFile[] = [];

            for (const file of validFiles) {
              try {
                const result = await new Promise<LottieFile>((resolve, reject) => {
                  const reader = new FileReader();

                  reader.onload = () => {
                    const lottieFile: LottieFile = {
                      id: crypto.randomUUID(),
                      name: file.name,
                      url: reader.result as string,
                      file,
                      type: 'lottie',
                    };
                    resolve(lottieFile);
                  };

                  reader.onerror = () => {
                    reject(new Error('Failed to read file'));
                  };

                  reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                      // Progress tracking would be implemented here
                      // const progress = (event.loaded / event.total) * 100;
                    }
                  };

                  reader.readAsDataURL(file);
                });

                processedFiles.push(result);
              } catch (error) {
                console.error(`Failed to process file ${file.name}:`, error);
              }
            }

            return processedFiles;
          }),
          input: ({ event }) => {
            const validationResults = (event as any).output || [];
            const validFiles = validationResults
              .filter((result: any) => result.valid)
              .map((result: any) => result.file);

            return { validFiles };
          },
          onDone: {
            target: 'idle',
            actions: 'addProcessedFiles',
          },
          onError: {
            target: 'idle',
            actions: 'handleProcessingError',
          },
        },
      },
      error: {
        after: {
          3000: 'idle',
        },
        on: {
          CLEAR_ERROR: 'idle',
        },
      },
    },
  },
  {
    actions: {
      prepareValidation: assign({
        validationErrors: () => new Map(),
        uploadProgress: () => new Map(),
      }),

      handleValidationResults: assign({
        validationErrors: ({ event }) => {
          const results = (event as any).output || [];
          const errors = new Map();

          results.forEach((result: any) => {
            if (!result.valid && result.error) {
              errors.set(result.file.name, result.error);
            }
          });

          return errors;
        },
      }),

      addProcessedFiles: assign({
        files: ({ context, event }) => {
          const processedFiles = (event as any).output || [];
          return [...context.files, ...processedFiles];
        },
        uploadProgress: () => new Map(),
      }),

      removeFile: assign({
        files: ({ context, event }) => {
          const fileId = (event as any).fileId;
          return context.files.filter((f) => f.id !== fileId);
        },
      }),

      clearAllFiles: assign({
        files: [],
        uploadProgress: () => new Map(),
        validationErrors: () => new Map(),
      }),

      handleValidationError: assign({
        validationErrors: ({ event }) => {
          const error = (event as any).error;
          const errors = new Map();
          errors.set('validation', error.message || 'Validation failed');
          return errors;
        },
      }),

      handleProcessingError: assign({
        validationErrors: ({ event }) => {
          const error = (event as any).error;
          const errors = new Map();
          errors.set('processing', error.message || 'File processing failed');
          return errors;
        },
      }),
    },
  }
);
