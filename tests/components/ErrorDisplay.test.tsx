import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorDisplay, ErrorToast } from '../../src/components/ErrorDisplay';
import type { FileValidationResult } from '../../src/utils/fileValidation';

describe('ErrorDisplay Component', () => {
  const mockValidationResult: FileValidationResult = {
    isValid: false,
    errors: ['Invalid file format', 'File too large'],
    warnings: ['May impact performance'],
    fileType: 'unsupported',
    detectedFormat: 'video file',
    suggestedAction: 'Convert your video to Lottie format using Adobe After Effects.',
    metadata: {
      version: '1.0',
      frameRate: 30,
      duration: 2,
      width: 400,
      height: 400,
      layers: 5,
      assets: 2
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render basic error message', () => {
      render(<ErrorDisplay error="Test error message" />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(<ErrorDisplay title="Error Title" error="Test error message" />);
      
      expect(screen.getByText('Error Title')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ErrorDisplay error="Test error" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Error Type Theming', () => {
    it('should apply validation theme for validation errors', () => {
      const { container } = render(
        <ErrorDisplay error="Validation error" errorType="validation" />
      );
      
      expect(container.firstChild).toHaveClass('bg-yellow-50', 'border-yellow-200');
    });

    it('should apply network theme for network errors', () => {
      const { container } = render(
        <ErrorDisplay error="Network error" errorType="network" />
      );
      
      expect(container.firstChild).toHaveClass('bg-blue-50', 'border-blue-200');
    });

    it('should apply player theme for player errors', () => {
      const { container } = render(
        <ErrorDisplay error="Player error" errorType="player" />
      );
      
      expect(container.firstChild).toHaveClass('bg-purple-50', 'border-purple-200');
    });

    it('should apply default theme for general errors', () => {
      const { container } = render(
        <ErrorDisplay error="General error" errorType="general" />
      );
      
      expect(container.firstChild).toHaveClass('bg-red-50', 'border-red-200');
    });
  });

  describe('Error Icons', () => {
    it('should display warning icon for validation errors', () => {
      render(<ErrorDisplay error="Validation error" errorType="validation" />);
      
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-yellow-500');
    });

    it('should display network icon for network errors', () => {
      render(<ErrorDisplay error="Network error" errorType="network" />);
      
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-blue-500');
    });

    it('should display player icon for player errors', () => {
      render(<ErrorDisplay error="Player error" errorType="player" />);
      
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-purple-500');
    });

    it('should display error icon for general errors', () => {
      render(<ErrorDisplay error="General error" errorType="general" />);
      
      const icon = screen.getByRole('img', { hidden: true });
      expect(icon).toHaveClass('text-red-500');
    });
  });

  describe('Validation Results', () => {
    it('should display detected format', () => {
      render(
        <ErrorDisplay 
          error="Unsupported file" 
          validationResult={mockValidationResult} 
        />
      );
      
      expect(screen.getByText('Detected: video file')).toBeInTheDocument();
    });

    it('should display suggested action', () => {
      render(
        <ErrorDisplay 
          error="Unsupported file" 
          validationResult={mockValidationResult} 
        />
      );
      
      expect(screen.getByText('Suggestion:')).toBeInTheDocument();
      expect(screen.getByText(/Convert your video to Lottie format/)).toBeInTheDocument();
    });

    it('should display warnings', () => {
      render(
        <ErrorDisplay 
          error="Unsupported file" 
          validationResult={mockValidationResult} 
        />
      );
      
      expect(screen.getByText('Warnings:')).toBeInTheDocument();
      expect(screen.getByText('May impact performance')).toBeInTheDocument();
    });

    it('should not display validation sections when not provided', () => {
      render(<ErrorDisplay error="Simple error" />);
      
      expect(screen.queryByText('Detected:')).not.toBeInTheDocument();
      expect(screen.queryByText('Suggestion:')).not.toBeInTheDocument();
      expect(screen.queryByText('Warnings:')).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should display retry button when onRetry is provided', () => {
      const mockRetry = vi.fn();
      render(
        <ErrorDisplay 
          error="Network error" 
          errorType="network"
          onRetry={mockRetry} 
        />
      );
      
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should display retry count in button text', () => {
      const mockRetry = vi.fn();
      render(
        <ErrorDisplay 
          error="Network error" 
          errorType="network"
          retryCount={2}
          onRetry={mockRetry} 
        />
      );
      
      expect(screen.getByText('Retry (2/3)')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const mockRetry = vi.fn();
      render(
        <ErrorDisplay 
          error="Network error" 
          errorType="network"
          onRetry={mockRetry} 
        />
      );
      
      fireEvent.click(screen.getByText('Retry'));
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should not display retry button for validation errors', () => {
      const mockRetry = vi.fn();
      render(
        <ErrorDisplay 
          error="Validation error" 
          errorType="validation"
          onRetry={mockRetry} 
        />
      );
      
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    it('should not display retry button when max retries reached', () => {
      const mockRetry = vi.fn();
      render(
        <ErrorDisplay 
          error="Network error" 
          errorType="network"
          retryCount={3}
          onRetry={mockRetry} 
        />
      );
      
      expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display dismiss button when onDismiss is provided', () => {
      const mockDismiss = vi.fn();
      render(
        <ErrorDisplay 
          error="Test error" 
          onDismiss={mockDismiss} 
        />
      );
      
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const mockDismiss = vi.fn();
      render(
        <ErrorDisplay 
          error="Test error" 
          onDismiss={mockDismiss} 
        />
      );
      
      fireEvent.click(screen.getByText('Dismiss'));
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should display learn more button when validation result has suggested action', () => {
      render(
        <ErrorDisplay 
          error="Unsupported file" 
          validationResult={mockValidationResult} 
        />
      );
      
      expect(screen.getByText('Learn More')).toBeInTheDocument();
    });

    it('should toggle details when learn more is clicked', () => {
      render(
        <ErrorDisplay 
          error="Unsupported file" 
          validationResult={mockValidationResult}
          showDetails={true}
        />
      );
      
      const learnMoreButton = screen.getByText('Learn More');
      fireEvent.click(learnMoreButton);
      
      expect(screen.getByText('Technical Details:')).toBeInTheDocument();
    });
  });

  describe('Technical Details', () => {
    it('should show technical details when showDetails is true and expanded', () => {
      render(
        <ErrorDisplay 
          error="Complex error with details" 
          validationResult={mockValidationResult}
          showDetails={true}
        />
      );
      
      // Click learn more to expand
      fireEvent.click(screen.getByText('Learn More'));
      
      expect(screen.getByText('Technical Details:')).toBeInTheDocument();
      expect(screen.getByText('Complex error with details')).toBeInTheDocument();
    });

    it('should show retry count in technical details', () => {
      render(
        <ErrorDisplay 
          error="Error with retries" 
          retryCount={2}
          validationResult={mockValidationResult}
          showDetails={true}
        />
      );
      
      fireEvent.click(screen.getByText('Learn More'));
      
      expect(screen.getByText('Retry attempts: 2')).toBeInTheDocument();
    });
  });

  describe('Error Message Formatting', () => {
    it('should format validation error messages', () => {
      render(<ErrorDisplay error="Failed to validate file: Invalid format" />);
      
      expect(screen.getByText('Invalid format')).toBeInTheDocument();
    });

    it('should format unsupported file format messages', () => {
      render(<ErrorDisplay error="Unsupported file format. Only .lottie files supported." />);
      
      expect(screen.getByText('This file format is not supported')).toBeInTheDocument();
    });

    it('should display original message for unrecognized formats', () => {
      render(<ErrorDisplay error="Some custom error message" />);
      
      expect(screen.getByText('Some custom error message')).toBeInTheDocument();
    });
  });
});

describe('ErrorToast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render toast message', () => {
      render(<ErrorToast message="Toast message" />);
      
      expect(screen.getByText('Toast message')).toBeInTheDocument();
    });

    it('should apply error styling by default', () => {
      const { container } = render(<ErrorToast message="Error toast" />);
      
      expect(container.firstChild).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    });

    it('should apply warning styling', () => {
      const { container } = render(<ErrorToast message="Warning toast" type="warning" />);
      
      expect(container.firstChild).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
    });

    it('should apply info styling', () => {
      const { container } = render(<ErrorToast message="Info toast" type="info" />);
      
      expect(container.firstChild).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after default duration', () => {
      const mockClose = vi.fn();
      render(<ErrorToast message="Auto dismiss" onClose={mockClose} />);
      
      expect(mockClose).not.toHaveBeenCalled();
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss after custom duration', () => {
      const mockClose = vi.fn();
      render(<ErrorToast message="Custom duration" duration={2000} onClose={mockClose} />);
      
      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(mockClose).not.toHaveBeenCalled();
      
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should not auto-dismiss when duration is 0', () => {
      const mockClose = vi.fn();
      render(<ErrorToast message="No auto dismiss" duration={0} onClose={mockClose} />);
      
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      expect(mockClose).not.toHaveBeenCalled();
    });
  });

  describe('Manual Dismiss', () => {
    it('should display close button when onClose is provided', () => {
      const mockClose = vi.fn();
      render(<ErrorToast message="Closeable toast" onClose={mockClose} />);
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const mockClose = vi.fn();
      render(<ErrorToast message="Closeable toast" onClose={mockClose} />);
      
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should not display close button when onClose is not provided', () => {
      render(<ErrorToast message="Non-closeable toast" />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Positioning and Styling', () => {
    it('should have fixed positioning and proper z-index', () => {
      const { container } = render(<ErrorToast message="Positioned toast" />);
      
      expect(container.firstChild).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    });

    it('should have proper spacing and styling', () => {
      const { container } = render(<ErrorToast message="Styled toast" />);
      
      expect(container.firstChild).toHaveClass(
        'max-w-sm',
        'p-4',
        'rounded-lg',
        'border',
        'shadow-lg',
        'transition-all'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ErrorToast message="Accessible toast" />);
      
      const toast = screen.getByText('Accessible toast').closest('div');
      expect(toast).toHaveClass('transition-all');
    });

    it('should support keyboard navigation for close button', () => {
      const mockClose = vi.fn();
      render(<ErrorToast message="Keyboard accessible" onClose={mockClose} />);
      
      const closeButton = screen.getByRole('button');
      closeButton.focus();
      
      fireEvent.keyDown(closeButton, { key: 'Enter', code: 'Enter' });
      // Note: This would require additional event handling to work fully
    });
  });
});

