import React from 'react';
import type { LottieFile } from '../types';

interface FileValidationDialogProps {
  file: LottieFile | null;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}

export function FileValidationDialog({
  file,
  onClose,
  onAccept,
  onReject,
}: FileValidationDialogProps) {
  if (!file) return null;

  const { validationResult, metadata } = file;
  if (!validationResult) return null;

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">File Validation</h2>
            <p className="text-sm text-gray-600 mt-1">{file.name}</p>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <div
              className={`w-4 h-4 rounded-full ${
                validationResult.isValid ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span
              className={`font-medium ${
                validationResult.isValid ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {validationResult.isValid ? 'Valid Lottie File' : 'Invalid Lottie File'}
            </span>
          </div>

          {metadata && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">File Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 font-medium">{file.type.toUpperCase()}</span>
                </div>

                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-medium">{formatFileSize(file.file.size)}</span>
                </div>

                {metadata.version && (
                  <div>
                    <span className="text-gray-600">Version:</span>
                    <span className="ml-2 font-medium">{metadata.version}</span>
                  </div>
                )}

                {metadata.frameRate && (
                  <div>
                    <span className="text-gray-600">Frame Rate:</span>
                    <span className="ml-2 font-medium">{metadata.frameRate} fps</span>
                  </div>
                )}

                {metadata.duration && (
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium">{formatDuration(metadata.duration)}</span>
                  </div>
                )}

                {metadata.width && metadata.height && (
                  <div>
                    <span className="text-gray-600">Dimensions:</span>
                    <span className="ml-2 font-medium">
                      {metadata.width}×{metadata.height}
                    </span>
                  </div>
                )}

                {metadata.layers !== undefined && (
                  <div>
                    <span className="text-gray-600">Layers:</span>
                    <span className="ml-2 font-medium">{metadata.layers}</span>
                  </div>
                )}

                {metadata.assets !== undefined && (
                  <div>
                    <span className="text-gray-600">Assets:</span>
                    <span className="ml-2 font-medium">{metadata.assets}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {validationResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Errors ({validationResult.errors.length})
              </h3>
              <ul className="space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-start">
                    <span className="w-1 h-1 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Warnings ({validationResult.warnings.length})
              </h3>
              <ul className="space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start">
                    <span className="w-1 h-1 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.warnings.some((w) => w.includes('performance')) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Performance Impact
              </h3>
              <p className="text-sm text-blue-700">
                This file may impact rendering performance due to its complexity or size. Consider
                optimizing the animation or using it with fewer concurrent players.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onAccept}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:ring-2 focus:ring-offset-2 transition-colors ${
              validationResult.isValid
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {validationResult.isValid ? 'Use File' : 'Use Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
