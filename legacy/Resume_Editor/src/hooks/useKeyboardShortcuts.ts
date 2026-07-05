import { useEffect } from 'react';
import { useResumeStore } from '../store/useResumeStore';

export function useKeyboardShortcuts(handlers: {
  onToggleTheme?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onShowShortcuts?: () => void;
}) {
  const { undo, redo } = useResumeStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;

      // Global shortcuts (work even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (!isInput) { e.preventDefault(); undo(); }
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (!isInput) { e.preventDefault(); redo(); }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handlers.onPrint?.();
      }

      // Standalone key shortcuts (not in text inputs)
      if (!isInput) {
        if (e.key === '?') {
          e.preventDefault();
          handlers.onShowShortcuts?.();
        }
        if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
          handlers.onToggleTheme?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handlers]);
}
