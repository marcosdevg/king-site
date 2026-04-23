import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let dx = 0, dy = 0, rx = 0, ry = 0;
    let tx = 0, ty = 0;
    let raf = 0;

    const move = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const animate = () => {
      try {
        dx += (tx - dx) * 0.6;
        dy += (ty - dy) * 0.6;
        rx += (tx - rx) * 0.18;
        ry += (ty - ry) * 0.18;
        if (dot) {
          dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
        }
        if (ring) {
          ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
        }
      } catch {
        // swallow — never let the cursor crash the render loop
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    window.addEventListener('mousemove', move);

    const hoverables = 'a, button, [data-cursor="hover"], input, textarea, select, label';
    const over = (e: Event) => {
      const t = e.target as Element;
      if (t && t.closest && t.closest(hoverables)) {
        dot.classList.add('hovering');
        ring.classList.add('hovering');
      }
    };
    const out = (e: Event) => {
      const t = e.target as Element;
      if (t && t.closest && t.closest(hoverables)) {
        dot.classList.remove('hovering');
        ring.classList.remove('hovering');
      }
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('mouseout', out);

    const onFocus = () => {
      // Kick the RAF back if window focus stalled it.
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(animate);
    };
    const onUnfreeze = () => {
      dot.classList.remove('hovering');
      ring.classList.remove('hovering');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(animate);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('king:unfreeze', onUnfreeze);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('mouseout', out);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('king:unfreeze', onUnfreeze);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="king-cursor-ring" aria-hidden />
      <div ref={dotRef} className="king-cursor" aria-hidden />
    </>
  );
}
