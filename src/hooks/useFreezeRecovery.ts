import { useEffect } from 'react';
import { getLenisRoot } from '@/lib/lenisRoot';

/**
 * Detects "stuck" UI states and auto-recovers.
 * Triggered on window focus, visibility change, and by pressing ESC 3x fast.
 */
export function useFreezeRecovery() {
  useEffect(() => {
    const hasActiveModal = () => {
      return !!document.querySelector('[role="dialog"][aria-modal="true"], [data-king-modal]');
    };

    const forceUnfreeze = () => {
      try {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      } catch {
        // ignore
      }
      const lenis = getLenisRoot();
      if (lenis) {
        try {
          lenis.start();
        } catch {
          // ignore
        }
      }
    };

    const softCheck = () => {
      if (hasActiveModal()) return;
      if (document.body.style.overflow === 'hidden') {
        forceUnfreeze();
      }
    };

    const onVisibility = () => {
      if (!document.hidden) softCheck();
    };

    let escCount = 0;
    let escTimer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      escCount += 1;
      if (escTimer) clearTimeout(escTimer);
      escTimer = setTimeout(() => {
        escCount = 0;
      }, 1200);
      if (escCount >= 3) {
        escCount = 0;
        if (escTimer) {
          clearTimeout(escTimer);
          escTimer = null;
        }
        forceUnfreeze();
        try {
          window.dispatchEvent(new CustomEvent('king:unfreeze'));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('focus', softCheck);
    window.addEventListener('pageshow', softCheck);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('focus', softCheck);
      window.removeEventListener('pageshow', softCheck);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
      if (escTimer) clearTimeout(escTimer);
    };
  }, []);
}
