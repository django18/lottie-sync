export * from './lottie';
export * from './machines';

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface PlayerWrapperProps extends ComponentProps {
  playerId: string;
  type: string;
  config?: Record<string, any>;
  onReady?: (playerId: string) => void;
  onError?: (playerId: string, error: string) => void;
}

export interface ControlsProps extends ComponentProps {
  disabled?: boolean;
  compact?: boolean;
}

export interface FileUploadProps extends ComponentProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export interface ProgressIndicatorProps extends ComponentProps {
  value: number;
  max: number;
  label?: string;
  variant?: 'linear' | 'circular';
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}
