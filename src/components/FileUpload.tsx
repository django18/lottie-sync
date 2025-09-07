import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileUploadProps } from '../types';

export function FileUpload({
  onFilesSelected,
  accept: _accept = '.lottie',
  multiple = true,
  disabled = false,
  className = '',
  children,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, open } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.lottie'],
    },
    multiple,
    disabled,
  });

  const dropzoneClassName = `
    ${className}
    relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
    ${
      isDragActive
        ? isDragAccept
          ? 'border-primary-400 bg-primary-50'
          : 'border-red-400 bg-red-50'
        : 'border-gray-300 hover:border-gray-400'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
  `.trim();

  return (
    <div {...getRootProps()} className={dropzoneClassName}>
      <input {...getInputProps()} />

      {children || (
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive
                ? isDragAccept
                  ? 'Drop your files here'
                  : 'Some files are not supported'
                : 'Drop Lottie files here'}
            </p>
            <p className="text-sm text-gray-500 mt-2">or click to browse (.lottie files)</p>
          </div>

          <div className="space-y-2">
            {!disabled && (
              <button
                type="button"
                className="btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  open(); // Open file dialog
                }}
              >
                Select Files
              </button>
            )}
            <p className="text-xs text-gray-400">or click anywhere in this area</p>
          </div>
        </div>
      )}
    </div>
  );
}
