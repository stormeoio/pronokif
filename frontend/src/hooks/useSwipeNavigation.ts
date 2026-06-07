/**
 * useSwipeNavigation — lightweight horizontal swipe detector for touch.
 *
 * Attaches passive touch listeners to a ref'd element and fires onSwipeLeft /
 * onSwipeRight only for a clearly horizontal gesture. Vertical scrolling is
 * never hijacked (the swipe must dominate the Y axis), and elements marked
 * `[data-swipe-ignore]` (e.g. an inner horizontal carousel) are skipped.
 *
 * Passive listeners → no scroll-jank, no preventDefault.
 */
import { useEffect, type RefObject } from "react";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
  /** Minimum horizontal travel (px) to count as a swipe. */
  threshold?: number;
}

export function useSwipeNavigation(
  ref: RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight, enabled = true, threshold = 60 }: SwipeOptions,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      // Don't steal swipes that belong to an inner horizontal scroller.
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-swipe-ignore]")) {
        tracking = false;
        return;
      }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      // Predominantly horizontal and past the threshold.
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, enabled, threshold]);
}
