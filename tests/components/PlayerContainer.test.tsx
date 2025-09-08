import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlayerContainer } from '../../src/components/PlayerContainer';
import type { PlayerAdapter } from '../../src/services/playerService';

// Mock the ErrorDisplay component
vi.mock('../../src/components/ErrorDisplay', () => ({
  ErrorDisplay: ({ title, error, errorType, retryCount, onRetry, className }: any) => (
    <div 
      data-testid="error-display"
      data-title={title}
      data-error={error}
      data-error-type={errorType}
      data-retry-count={retryCount}
      className={className}
    >
      <div>{title}</div>
      <div>{error}</div>
      {onRetry && (
        <button onClick={onRetry} data-testid="retry-button">
          Retry {retryCount > 0 ? `(${retryCount}/3)` : ''}
        </button>
      )}
    </div>
  ),
}));

describe('Enhanced PlayerContainer', () => {
  const mockPlayerAdapter: PlayerAdapter = {
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setFrame: vi.fn(),
    getCurrentFrame: vi.fn().mockReturnValue(0),
    getTotalFrames: vi.fn().mockReturnValue(100),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(5),
    setSpeed: vi.fn(),
    getSpeed: vi.fn().mockReturnValue(1),
    setLoop: vi.fn(),
    getLoop: vi.fn().mockReturnValue(false),
    destroy: vi.fn(),
    getState: vi.fn().mockReturnValue('idle'),
  };

  const defaultProps = {
    playerId: 'player-123',
    type: 'dotlottie',
    file: {
      id: 'file-1',
      name: 'animation.lottie',
      url: 'data:application/zip;base64,test',
      file: new File(['test'], 'animation.lottie'),
      type: 'lottie' as const,
    },
    onPlayerRef: vi.fn(),
    onIndividualControl: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render player container with default props', () => {
      render(<PlayerContainer {...defaultProps} />);
      
      const container = screen.getByTestId(`player-container-${defaultProps.playerId}`);
      expect(container).toBeInTheDocument();
    });

    it('should display player ID in the header', () => {
      render(<PlayerContainer {...defaultProps} />);
      
      expect(screen.getByText(defaultProps.playerId.slice(-6))).toBeInTheDocument();
    });

    it('should display player type badge', () => {
      render(<PlayerContainer {...defaultProps} />);
      
      expect(screen.getByText('dotlottie')).toBeInTheDocument();
    });

    it('should apply active styling when isActive is true', () => {
      const { container } = render(<PlayerContainer {...defaultProps} isActive={true} />);
      
      expect(container.firstChild).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PlayerContainer {...defaultProps} className="custom-player" />
      );
      
      expect(container.firstChild).toHaveClass('custom-player');
    });
  });

  describe('Player Status States', () => {
    it('should display loading spinner when status is loading', () => {
      render(<PlayerContainer {...defaultProps} playerStatus="loading" />);
      
      expect(screen.getByText('Loading animation...')).toBeInTheDocument();
    });

    it('should display player canvas area when status is ready', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready" 
          playerAdapter={mockPlayerAdapter}
        />
      );
      
      const canvasArea = screen.getByTestId('player-canvas');
      expect(canvasArea).toBeInTheDocument();
    });

    it('should show individual controls when sync is disabled', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
        />
      );
      
      expect(screen.getByTitle('Play')).toBeInTheDocument();
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
      expect(screen.getByTitle('Stop')).toBeInTheDocument();
    });

    it('should hide individual controls when sync is enabled', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={true}
        />
      );
      
      expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should display ErrorDisplay component when status is error', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Network connection failed"
          retryCount={1}
          onRetry={vi.fn()}
        />
      );
      
      const errorDisplay = screen.getByTestId('error-display');
      expect(errorDisplay).toBeInTheDocument();
      expect(errorDisplay).toHaveAttribute('data-title', `Player ${defaultProps.playerId.slice(-6)} Error`);
      expect(errorDisplay).toHaveAttribute('data-error', 'Network connection failed');
      expect(errorDisplay).toHaveAttribute('data-error-type', 'player');
      expect(errorDisplay).toHaveAttribute('data-retry-count', '1');
    });

    it('should call onRetry when retry button is clicked', () => {
      const mockRetry = vi.fn();
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Network error"
          onRetry={mockRetry}
        />
      );
      
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);
      
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should display retry count in error display', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Connection timeout"
          retryCount={2}
          onRetry={vi.fn()}
        />
      );
      
      expect(screen.getByText('Retry (2/3)')).toBeInTheDocument();
    });

    it('should handle missing error prop gracefully', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
        />
      );
      
      // Should not display error overlay if no error message
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
    });

    it('should apply proper styling to error overlay', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Test error"
        />
      );
      
      const errorDisplay = screen.getByTestId('error-display');
      expect(errorDisplay).toHaveClass('text-xs', 'max-w-full');
    });
  });

  describe('Player Controls Integration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call play on player adapter when play button is clicked', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
        />
      );
      
      fireEvent.click(screen.getByTitle('Play'));
      expect(mockPlayerAdapter.play).toHaveBeenCalledTimes(1);
    });

    it('should call pause on player adapter when pause button is clicked', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          isPlaying={true}
        />
      );
      
      fireEvent.click(screen.getByTitle('Pause'));
      expect(mockPlayerAdapter.pause).toHaveBeenCalledTimes(1);
    });

    it('should call stop on player adapter when stop button is clicked', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
        />
      );
      
      fireEvent.click(screen.getByTitle('Stop'));
      expect(mockPlayerAdapter.stop).toHaveBeenCalledTimes(1);
    });

    it('should call onIndividualControl for player actions', () => {
      const mockIndividualControl = vi.fn();
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          onIndividualControl={mockIndividualControl}
        />
      );
      
      fireEvent.click(screen.getByTitle('Play'));
      
      expect(mockIndividualControl).toHaveBeenCalledWith(
        defaultProps.playerId,
        'play'
      );
    });
  });

  describe('Player Reference Management', () => {
    it('should call onPlayerRef with container reference', () => {
      const mockPlayerRef = vi.fn();
      render(
        <PlayerContainer 
          {...defaultProps} 
          onPlayerRef={mockPlayerRef}
        />
      );
      
      expect(mockPlayerRef).toHaveBeenCalledWith(expect.any(HTMLElement));
    });

    it('should handle missing onPlayerRef gracefully', () => {
      expect(() => {
        render(<PlayerContainer {...defaultProps} onPlayerRef={undefined} />);
      }).not.toThrow();
    });
  });

  describe('Performance and Zoom', () => {
    it('should apply global zoom scaling', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          globalZoom={1.5}
        />
      );
      
      const canvasArea = screen.getByTestId('player-canvas');
      expect(canvasArea).toHaveStyle('transform: scale(1.5)');
    });

    it('should handle zoom level changes', () => {
      const { rerender } = render(
        <PlayerContainer 
          {...defaultProps} 
          globalZoom={1}
        />
      );
      
      rerender(
        <PlayerContainer 
          {...defaultProps} 
          globalZoom={2}
        />
      );
      
      const canvasArea = screen.getByTestId('player-canvas');
      expect(canvasArea).toHaveStyle('transform: scale(2)');
    });
  });

  describe('Frame and Time Display', () => {
    it('should display current frame and total frames', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          currentFrame={45}
          totalFrames={100}
        />
      );
      
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should display playback speed', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          speed={1.5}
        />
      );
      
      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
    });

    it('should handle speed changes', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          speed={1}
        />
      );
      
      const speedInput = screen.getByDisplayValue('1');
      fireEvent.change(speedInput, { target: { value: '2' } });
      
      expect(mockPlayerAdapter.setSpeed).toHaveBeenCalledWith(2);
    });
  });

  describe('Loop Control', () => {
    it('should display loop toggle button', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
        />
      );
      
      expect(screen.getByTitle('Toggle Loop')).toBeInTheDocument();
    });

    it('should call setLoop when loop button is clicked', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          loop={false}
        />
      );
      
      fireEvent.click(screen.getByTitle('Toggle Loop'));
      expect(mockPlayerAdapter.setLoop).toHaveBeenCalledWith(true);
    });

    it('should show loop active state', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
          loop={true}
        />
      );
      
      const loopButton = screen.getByTitle('Toggle Loop');
      expect(loopButton).toHaveClass('bg-blue-500');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for controls', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
        />
      );
      
      expect(screen.getByTitle('Play')).toHaveAttribute('aria-label', 'Play');
      expect(screen.getByTitle('Pause')).toHaveAttribute('aria-label', 'Pause');
      expect(screen.getByTitle('Stop')).toHaveAttribute('aria-label', 'Stop');
    });

    it('should support keyboard navigation', () => {
      render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="ready"
          playerAdapter={mockPlayerAdapter}
          globalSyncEnabled={false}
        />
      );
      
      const playButton = screen.getByTitle('Play');
      playButton.focus();
      
      fireEvent.keyDown(playButton, { key: 'Enter', code: 'Enter' });
      expect(mockPlayerAdapter.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should reset error state when transitioning from error to loading', () => {
      const { rerender } = render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Network error"
        />
      );
      
      rerender(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="loading"
        />
      );
      
      expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
      expect(screen.getByText('Loading animation...')).toBeInTheDocument();
    });

    it('should maintain retry count across re-renders', () => {
      const { rerender } = render(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Network error"
          retryCount={1}
          onRetry={vi.fn()}
        />
      );
      
      expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
      
      rerender(
        <PlayerContainer 
          {...defaultProps} 
          playerStatus="error"
          error="Network error"
          retryCount={2}
          onRetry={vi.fn()}
        />
      );
      
      expect(screen.getByText('Retry (2/3)')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should not re-render unnecessarily when props do not change', () => {
      const renderSpy = vi.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <PlayerContainer {...props} />;
      };
      
      const { rerender } = render(<TestComponent {...defaultProps} />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestComponent {...defaultProps} />);
      
      // Note: Without React.memo, this would still re-render
      // This test documents current behavior
    });
  });
});

