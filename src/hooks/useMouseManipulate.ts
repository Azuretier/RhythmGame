import { useEffect, useRef, useCallback } from 'react';

export interface MouseManipulateOptions {
  /** Lerp factor for smooth interpolation (0-1, lower = smoother). Default: 0.08 */
  smoothing?: number;
  /** Whether to track mouse position. Default: true */
  enabled?: boolean;
}

export interface MouseManipulateState {
  /** Normalized X position (-1 to 1, left to right) */
  x: number;
  /** Normalized Y position (-1 to 1, bottom to top) */
  y: number;
}

/**
 * Hook for smooth mouse position tracking with lerp interpolation.
 * Returns a ref containing the current smoothed mouse position in normalized coordinates.
 * Designed for use in animation loops (requestAnimationFrame) where reading a ref
 * is more efficient than triggering re-renders.
 */
export function useMouseManipulate(options: MouseManipulateOptions = {}) {
  const { smoothing = 0.08, enabled = true } = options;

  // Raw (target) mouse position
  const targetRef = useRef<MouseManipulateState>({ x: 0, y: 0 });
  // Smoothed (interpolated) mouse position — read this in animation loops
  const smoothedRef = useRef<MouseManipulateState>({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    targetRef.current.x = nx;
    targetRef.current.y = ny;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      const t = targetRef.current;
      const s = smoothedRef.current;
      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, smoothing, onMouseMove]);

  return smoothedRef;
}
