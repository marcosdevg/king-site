import { useEffect } from 'react';
import { getLenisRoot } from '@/lib/lenisRoot';

/**
 * Detects "stuck" UI states and auto-recovers.
 * - Soft recovery on window focus / visibility / route change.
 * - Observes ghost overlays left by framer-motion exit animations
 *   and neutralizes their pointer-events so they stop blocking clicks.
 * - ESC pressed 3x fast forces a hard reset.
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
      sweepGhostOverlays();
    };

    const sweepGhostOverlays = () => {
      try {
        const all = document.querySelectorAll<HTMLElement>('body *');
        all.forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed') return;
          const opacity = parseFloat(cs.opacity);
          if (Number.isNaN(opacity) || opacity > 0.05) return;
          // Cover most of viewport?
          const r = el.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          if (r.width < vw * 0.5 || r.height < vh * 0.5) return;
          if (cs.pointerEvents === 'none') return;
          // Ghost — neutralize.
          el.style.pointerEvents = 'none';
        });
      } catch {
        // ignore
      }
    };

    // Continuously watch for style mutations that create ghost overlays.
    const observer = new MutationObserver(() => {
      // Debounced via rAF
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        sweepGhostOverlays();
      });
    });
    let rafId = 0;
    try {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true,
      });
    } catch {
      // ignore
    }

    const softCheck = () => {
      if (!hasActiveModal() && document.body.style.overflow === 'hidden') {
        forceUnfreeze();
      } else {
        sweepGhostOverlays();
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

    // Also run a sweep on every click that hits body directly (user might be
    // trying to click past a ghost).
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t === document.body || t === document.documentElement)) {
        sweepGhostOverlays();
      }
    };

    window.addEventListener('focus', softCheck);
    window.addEventListener('pageshow', softCheck);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick, true);

    // Initial sweep on mount.
    const initialTimer = setTimeout(sweepGhostOverlays, 500);

    return () => {
      window.removeEventListener('focus', softCheck);
      window.removeEventListener('pageshow', softCheck);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick, true);
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      if (escTimer) clearTimeout(escTimer);
      clearTimeout(initialTimer);
    };
  }, []);
}
