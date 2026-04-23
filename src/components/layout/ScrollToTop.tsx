import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLenisRoot } from '@/lib/lenisRoot';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Safety net: on every route change, unfreeze anything a stuck modal
    // may have left behind (body overflow, Lenis stopped state).
    try {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    } catch {
      // ignore
    }

    const lenis = getLenisRoot();
    if (lenis) {
      lenis.start();
      lenis.scrollTo(0, { immediate: true, force: true });
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
