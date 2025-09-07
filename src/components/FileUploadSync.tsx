import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { SyncActorRef } from '../machines/syncMachine';

interface FileUploadSyncProps {
  actorRef: SyncActorRef;
  disabled?: boolean;
  className?: string;
}

export function FileUploadSync({
  actorRef,
  disabled = false,
  className = '',
}: FileUploadSyncProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]; // Take the first file
        console.log('📁 [FILE-UPLOAD-SYNC] File dropped:', file.name, file.type);
        actorRef.send({ type: 'LOAD_FILE', file });
      }
    },
    [actorRef]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/octet-stream': ['.lottie'],
    },
    multiple: false,
    disabled,
  });

  const getDropzoneClasses = () => {
    let classes = `
      border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
      transition-all duration-200 ease-in-out
    `;

    if (disabled) {
      classes += ' border-gray-200 bg-gray-50 cursor-not-allowed';
    } else if (isDragReject) {
      classes += ' border-red-300 bg-red-50';
    } else if (isDragActive) {
      classes += ' border-blue-400 bg-blue-50';
    } else {
      classes += ' border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50';
    }

    return classes;
  };

  return (
    <div className={`file-upload-sync ${className}`}>
      <div {...getRootProps()} className={getDropzoneClasses()}>
        <input {...getInputProps()} />

        <div className="space-y-4">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 flex items-center justify-center">
            {isDragActive ? (
              <svg
                className="w-12 h-12 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                />
              </svg>
            ) : isDragReject ? (
              <svg
                className="w-12 h-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
          </div>

          {/* Text */}
          <div>
            {disabled ? (
              <p className="text-sm text-gray-500">File upload disabled</p>
            ) : isDragReject ? (
              <div>
                <p className="text-sm font-medium text-red-600">Invalid file type</p>
                <p className="text-xs text-red-500 mt-1">
                  Only .json and .lottie files are supported
                </p>
              </div>
            ) : isDragActive ? (
              <p className="text-sm font-medium text-blue-600">Drop your Lottie file here...</p>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Drop a Lottie file here, or click to select
                </p>
                <p className="text-xs text-gray-500 mt-1">Supports .json and .lottie files</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>.json files work with both players</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>.lottie files are optimized for DotLottie</span>
          </div>
        </div>
      </div>
    </div>
  );
}
