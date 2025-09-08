import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../../src/components/FileUpload';

describe('FileUpload', () => {
  it('should render upload area', () => {
    const mockOnFilesSelected = vi.fn();

    render(<FileUpload onFilesSelected={mockOnFilesSelected} />);

    expect(screen.getByText('Drop Lottie files here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse (.lottie files)')).toBeInTheDocument();
    expect(screen.getByText('Select Files')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnFilesSelected = vi.fn();

    render(<FileUpload onFilesSelected={mockOnFilesSelected} disabled />);

    // Just verify that the disabled render works correctly
    expect(screen.getByText('Drop Lottie files here')).toBeInTheDocument();
    expect(screen.queryByText('Select Files')).not.toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const mockOnFilesSelected = vi.fn();

    render(<FileUpload onFilesSelected={mockOnFilesSelected} className="custom-class" />);

    // The custom class is applied to the root div element
    const uploadArea = screen.getByText('Drop Lottie files here').closest('.custom-class');
    expect(uploadArea).toBeInTheDocument();
  });

  it('should render custom children when provided', () => {
    const mockOnFilesSelected = vi.fn();

    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <div>Custom upload content</div>
      </FileUpload>
    );

    expect(screen.getByText('Custom upload content')).toBeInTheDocument();
    expect(screen.queryByText('Drop Lottie files here')).not.toBeInTheDocument();
  });
});
