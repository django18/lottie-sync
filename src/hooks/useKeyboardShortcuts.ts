import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onPlay,
  onPause,
  onStop,
  disabled = false,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Handle zoom shortcuts
      if (event.key === '=' || event.key === '+') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onZoomIn?.();
        }
      } else if (event.key === '-') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onZoomOut?.();
        }
      } else if (event.key === '0') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onZoomReset?.();
        }
      }

      // Handle playback shortcuts (only if not modifier keys are pressed)
      else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        switch (event.key) {
          case ' ':
          case 'k':
            event.preventDefault();
            // We'll need the current playing state to toggle properly
            onPlay?.();
            break;
          case 'j':
            event.preventDefault();
            onStop?.();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onZoomIn, onZoomOut, onZoomReset, onPlay, onPause, onStop, disabled]);
}
