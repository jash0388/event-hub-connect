import { useState, useEffect, useCallback, useRef } from 'react';

export interface Violation {
  type: 'tab_switch' | 'copy' | 'paste' | 'drag' | 'devtools' | 'right_click' | 'keyboard_shortcut' | 'resize' | 'fullscreen_exit';
  timestamp: Date;
  message: string;
}

interface ExamSecurityOptions {
  maxViolations?: number;
  onMaxViolationsReached?: () => void;
  onViolation?: (violation: Violation) => void;
  enabled?: boolean;
}

export function useExamSecurity(options: ExamSecurityOptions = {}) {
  const {
    maxViolations = 5,
    onMaxViolationsReached,
    onViolation,
    enabled = true,
  } = options;

  const [violations, setViolations] = useState<Violation[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const devtoolsCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const violationCountRef = useRef(0);
  const isGracePeriodRef = useRef(true);
  const lastViolationTimeRef = useRef<number>(0);

  const addViolation = useCallback((type: Violation['type'], message: string) => {
    if (isGracePeriodRef.current) return;
    
    // Cooldown: Prevent multiple violations within 1 second (e.g., blur + visibilitychange)
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 1000) return;
    lastViolationTimeRef.current = now;
    
    const violation: Violation = { type, timestamp: new Date(), message };
    
    setViolations(prev => {
      const updated = [...prev, violation];
      violationCountRef.current = updated.length;
      return updated;
    });

    setWarningMessage(message);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 4000);

    onViolation?.(violation);

    // FIX: Threshold should be exactly equal or greater than maxViolations
    if (violationCountRef.current >= maxViolations) {
      onMaxViolationsReached?.();
    }
  }, [maxViolations, onMaxViolationsReached, onViolation]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      isGracePeriodRef.current = true;
      return;
    }

    // End grace period after 1.5 seconds to allow UI/Fullscreen transitions
    const timer = setTimeout(() => {
      isGracePeriodRef.current = false;
    }, 1500);

    // === 1. Tab Switch / Visibility Detection ===
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        addViolation('tab_switch', '⚠️ Tab switch detected! Do not leave the exam window.');
      }
    };

    const handleBlur = () => {
      // Small safety check — some browsers fire blur on fullscreen transition
      if (!isGracePeriodRef.current) {
        addViolation('tab_switch', '⚠️ Window focus lost! Stay on the exam page.');
      }
    };

    // === 2. Copy/Paste/Cut/Drag Prevention ===
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy', '🚫 Copying is not allowed during the exam.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('paste', '🚫 Pasting is not allowed during the exam.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation('copy', '🚫 Cutting text is not allowed during the exam.');
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      addViolation('drag', '🚫 Dragging text is not allowed during the exam.');
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      addViolation('drag', '🚫 Drop is not allowed during the exam.');
    };

    // === 3. Right-Click Prevention ===
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      addViolation('right_click', '🚫 Right-click is disabled during the exam.');
    };

    // === 4. Keyboard Shortcut Blocking ===
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 - Dev tools
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        addViolation('keyboard_shortcut', '🚫 Developer tools shortcut blocked.');
        return;
      }

      // Ctrl/Cmd + Shift + I - Inspect Element
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        addViolation('keyboard_shortcut', '🚫 Inspect element shortcut blocked.');
        return;
      }

      // Ctrl/Cmd + Shift + J - Console
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        addViolation('keyboard_shortcut', '🚫 Console shortcut blocked.');
        return;
      }

      // Ctrl/Cmd + Shift + C - Element picker
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        e.stopPropagation();
        addViolation('keyboard_shortcut', '🚫 Element picker shortcut blocked.');
        return;
      }

      // Ctrl/Cmd + U - View source
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        addViolation('keyboard_shortcut', '🚫 View source shortcut blocked.');
        return;
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + C - Copy (also caught by copy event, but double-blocking)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl/Cmd + A - Select all (in exam context, not inside textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Ctrl/Cmd + P - Print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        addViolation('keyboard_shortcut', '🚫 Print shortcut blocked.');
        return;
      }

      // Escape key - prevent exiting fullscreen manually
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // === 5. DevTools Detection (size-based heuristic) ===
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        if (!isDevToolsOpen) {
          setIsDevToolsOpen(true);
          addViolation('devtools', '🚨 Developer tools detected! Close them immediately.');
        }
      } else {
        setIsDevToolsOpen(false);
      }
    };

    // === 6. Fullscreen change detection ===
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        addViolation('fullscreen_exit', '⚠️ Fullscreen exited! Please return to fullscreen mode.');
      }
    };

    // === 7. Prevent text selection via CSS ===
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    (document.body.style as any).msUserSelect = 'none';
    (document.body.style as any).mozUserSelect = 'none';

    // === 8. Disable console methods to prevent inspection trickery ===
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    // Override console in production exam mode
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};

    // Register all event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    devtoolsCheckInterval.current = setInterval(checkDevTools, 1000);

    return () => {
      // Clean up everything
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);

      if (devtoolsCheckInterval.current) {
        clearInterval(devtoolsCheckInterval.current);
      }

      // Restore user-select
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).msUserSelect = '';
      (document.body.style as any).mozUserSelect = '';

      // Restore console
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    };
  }, [enabled, addViolation, isDevToolsOpen]);

  return {
    violations,
    showWarning,
    warningMessage,
    isDevToolsOpen,
    isFullscreen,
    tabSwitchCount,
    enterFullscreen,
    exitFullscreen,
    dismissWarning: () => setShowWarning(false),
    violationCount: violations.length,
    remainingViolations: maxViolations - violations.length,
  };
}
