import type Lenis from 'lenis';

let root: Lenis | null = null;

/** Registrado por `SmoothScroll` ao criar o Lenis global. */
export function setLenisRoot(instance: Lenis | null) {
  root = instance;
}

export function getLenisRoot(): Lenis | null {
  return root;
}
