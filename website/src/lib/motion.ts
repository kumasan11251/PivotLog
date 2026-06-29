export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
