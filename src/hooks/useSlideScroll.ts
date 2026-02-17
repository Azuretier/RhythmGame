'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSlideScrollOptions {
  totalSlides: number;
  enabled: boolean;
  debounceMs?: number;
  deltaThreshold?: number;
  touchThreshold?: number;
}

interface UseSlideScrollReturn {
  currentSlide: number;
  goToSlide: (index: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  slideStyle: React.CSSProperties;
}

export function useSlideScroll({
  totalSlides,
  enabled,
  debounceMs = 800,
  deltaThreshold = 50,
  touchThreshold = 50,
}: UseSlideScrollOptions): UseSlideScrollReturn {
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null!);
  const isTransitioning = useRef(false);
  const accumulatedDelta = useRef(0);
  const deltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef(0);

  const goToSlide = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(totalSlides - 1, index));
      if (clamped === currentSlide) return;
      if (isTransitioning.current) return;

      isTransitioning.current = true;
      setCurrentSlide(clamped);

      setTimeout(() => {
        isTransitioning.current = false;
      }, debounceMs);
    },
    [currentSlide, totalSlides, debounceMs],
  );

  // Check if the wheel event target is inside an inner-scrollable area
  // and whether that area is at its scroll boundary
  const shouldChangeSlide = useCallback(
    (target: HTMLElement, deltaY: number): boolean => {
      const scrollable = target.closest('[data-slide-scrollable]') as HTMLElement | null;
      if (!scrollable) return true;

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if (deltaY > 0 && !isAtBottom) return false;
      if (deltaY < 0 && !isAtTop) return false;
      return true;
    },
    [],
  );

  // Wheel handler
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!shouldChangeSlide(target, e.deltaY)) return;

      e.preventDefault();

      if (isTransitioning.current) return;

      accumulatedDelta.current += e.deltaY;
      if (deltaTimer.current) clearTimeout(deltaTimer.current);
      deltaTimer.current = setTimeout(() => {
        accumulatedDelta.current = 0;
      }, 100);

      if (Math.abs(accumulatedDelta.current) < deltaThreshold) return;

      const direction = accumulatedDelta.current > 0 ? 1 : -1;
      accumulatedDelta.current = 0;

      const next = currentSlide + direction;
      if (next < 0 || next >= totalSlides) return;

      isTransitioning.current = true;
      setCurrentSlide(next);

      setTimeout(() => {
        isTransitioning.current = false;
      }, debounceMs);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [enabled, currentSlide, totalSlides, debounceMs, deltaThreshold, shouldChangeSlide]);

  // Touch handlers
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isTransitioning.current) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < touchThreshold) return;

      // Check inner scroll boundaries for the touch target
      const target = e.target as HTMLElement;
      if (!shouldChangeSlide(target, deltaY)) return;

      const direction = deltaY > 0 ? 1 : -1;
      const next = currentSlide + direction;
      if (next < 0 || next >= totalSlides) return;

      isTransitioning.current = true;
      setCurrentSlide(next);

      setTimeout(() => {
        isTransitioning.current = false;
      }, debounceMs);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, currentSlide, totalSlides, debounceMs, touchThreshold, shouldChangeSlide]);

  // Keyboard handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning.current) return;

      let direction = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        direction = 1;
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        direction = -1;
      } else {
        return;
      }

      e.preventDefault();
      const next = currentSlide + direction;
      if (next < 0 || next >= totalSlides) return;

      isTransitioning.current = true;
      setCurrentSlide(next);

      setTimeout(() => {
        isTransitioning.current = false;
      }, debounceMs);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, currentSlide, totalSlides, debounceMs]);

  // Reset accumulated delta when disabled
  useEffect(() => {
    if (!enabled) {
      accumulatedDelta.current = 0;
      if (deltaTimer.current) {
        clearTimeout(deltaTimer.current);
        deltaTimer.current = null;
      }
    }
  }, [enabled]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (deltaTimer.current) clearTimeout(deltaTimer.current);
    };
  }, []);

  const slideStyle: React.CSSProperties = {
    transform: `translateY(-${currentSlide * 100}vh)`,
  };

  return { currentSlide, goToSlide, containerRef, slideStyle };
}
