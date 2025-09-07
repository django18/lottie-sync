import type { LottieFile } from '../types';

interface FileListProps {
  files: LottieFile[];
  selectedFile: LottieFile | null;
  onSelectFile: (file: LottieFile) => void;
  onRemoveFile: (fileId: string) => void;
  className?: string;
}

export function FileList({
  files,
  selectedFile,
  onSelectFile,
  onRemoveFile,
  className = '',
}: FileListProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type === 'lottie') {
      return (
        <svg
          className="w-6 h-6 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V1a1 1 0 011-1h2a1 1 0 011 1v3m0 0h8m-8 0v1a1 1 0 001 1h6a1 1 0 001-1V4"
          />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  };

  if (files.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="text-center text-gray-500 py-8">
          <svg
            className="mx-auto w-12 h-12 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">No files uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload .lottie files to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Animation Files</h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {files.map((file) => {
            const isSelected = selectedFile?.id === file.id;

            return (
              <div
                key={file.id}
                className={`group relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onSelectFile(file)}
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          file.type === 'lottie'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        .{file.type}
                      </span>
                      <span>{formatFileSize(file.file.size)}</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-100 text-red-500 transition-all"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          {files.length} file{files.length !== 1 ? 's' : ''} uploaded
        </div>
      </div>
    </div>
  );
}
