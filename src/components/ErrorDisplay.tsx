import React from 'react';
import type { FileValidationResult } from '../utils/fileValidation';

interface ErrorDisplayProps {
  title?: string;
  error: string;
  errorType?: 'validation' | 'player' | 'network' | 'general';
  validationResult?: FileValidationResult;
  retryCount?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

interface ErrorAction {
  label: string;
  action: () => void;
  variant: 'primary' | 'secondary' | 'danger';
}

export function ErrorDisplay({
  title,
  error,
  errorType = 'general',
  validationResult,
  retryCount = 0,
  onRetry,
  onDismiss,
  showDetails = false,
  className = '',
}: ErrorDisplayProps) {
  const [showFullDetails, setShowFullDetails] = React.useState(false);

  const getErrorIcon = () => {
    switch (errorType) {
      case 'validation':
        return (
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'network':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'player':
        return (
          <svg className="w-6 h-6 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getErrorTheme = () => {
    switch (errorType) {
      case 'validation':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
        };
      case 'network':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
        };
      case 'player':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-800',
          button: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-100 hover:bg-red-200 text-red-800',
        };
    }
  };

  const theme = getErrorTheme();
  const canRetry = onRetry && errorType !== 'validation' && retryCount < 3;

  const getActions = (): ErrorAction[] => {
    const actions: ErrorAction[] = [];

    if (validationResult?.suggestedAction) {
      actions.push({
        label: 'Learn More',
        action: () => setShowFullDetails(!showFullDetails),
        variant: 'secondary',
      });
    }

    if (canRetry) {
      actions.push({
        label: retryCount > 0 ? `Retry (${retryCount}/3)` : 'Retry',
        action: onRetry,
        variant: 'primary',
      });
    }

    if (onDismiss) {
      actions.push({
        label: 'Dismiss',
        action: onDismiss,
        variant: 'secondary',
      });
    }

    return actions;
  };

  const formatError = (error: string): string => {
    if (error.includes('Failed to validate file:')) {
      return error.replace('Failed to validate file:', '').trim();
    }
    if (error.includes('Unsupported file format.')) {
      return 'This file format is not supported';
    }
    return error;
  };

  const actions = getActions();

  return (
    <div className={`p-4 rounded-lg ${theme.bg} ${theme.border} border ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{getErrorIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {title && <h3 className={`text-sm font-semibold ${theme.text} mb-1`}>{title}</h3>}

              <p className={`text-sm ${theme.text}`}>{formatError(error)}</p>

              {validationResult && (
                <div className="mt-2">
                  {validationResult.detectedFormat && (
                    <p className={`text-xs ${theme.text} opacity-75`}>
                      Detected: {validationResult.detectedFormat}
                    </p>
                  )}

                  {validationResult.suggestedAction && (
                    <div className="mt-2">
                      <p className={`text-xs ${theme.text} font-medium`}>Suggestion:</p>
                      <p className={`text-xs ${theme.text} mt-1`}>
                        {validationResult.suggestedAction}
                      </p>
                    </div>
                  )}

                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <div className="mt-2">
                      <p className={`text-xs ${theme.text} font-medium`}>Warnings:</p>
                      <ul className={`text-xs ${theme.text} mt-1 space-y-1`}>
                        {validationResult.warnings.map((warning, index) => (
                          <li key={index} className="flex items-start space-x-1">
                            <span>•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {showDetails && showFullDetails && (
                <div className="mt-3 p-3 bg-white bg-opacity-50 rounded text-xs">
                  <p className={`font-medium ${theme.text} mb-2`}>Technical Details:</p>
                  <pre className={`${theme.text} opacity-75 whitespace-pre-wrap`}>{error}</pre>
                  {retryCount > 0 && (
                    <p className={`${theme.text} mt-2`}>Retry attempts: {retryCount}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    action.variant === 'primary'
                      ? `${theme.button} border border-current`
                      : action.variant === 'danger'
                        ? 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300'
                        : `${theme.text} hover:${theme.button} opacity-75 hover:opacity-100`
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ErrorToastProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export function ErrorToast({ message, type = 'error', duration = 5000, onClose }: ErrorToastProps) {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-sm p-4 rounded-lg border shadow-lg transition-all z-50 ${getToastStyles()}`}
    >
      <div className="flex items-start justify-between space-x-2">
        <p className="text-sm font-medium flex-1">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-current opacity-50 hover:opacity-75"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
