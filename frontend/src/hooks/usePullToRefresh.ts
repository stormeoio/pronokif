/**
 * usePullToRefresh — Pull-down gesture to trigger data refresh on mobile.
 *
 * Returns a ref to attach to the scrollable container and
 * an indicator element to render at the top.
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { haptic } from "@/lib/haptics";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 5) return;
    startY.current = e.touches[0]!.clientY;
    isPulling.current = true;
  }, []);

  const thresholdCrossed = useRef(false);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      const diff = e.touches[0]!.clientY - startY.current;
      if (diff > 0) {
        // Rubber band effect — diminishing returns
        const distance = Math.min(diff * 0.5, threshold * 1.5);
        setPullDistance(distance);
        setPulling(true);
        if (distance > 10) e.preventDefault();
        // Haptic feedback when crossing the refresh threshold
        if (distance >= threshold && !thresholdCrossed.current) {
          thresholdCrossed.current = true;
          haptic("medium");
        } else if (distance < threshold) {
          thresholdCrossed.current = false;
        }
      }
    },
    [refreshing, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold * 0.6);
      haptic("success");
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    thresholdCrossed.current = false;
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pulling,
    pullDistance,
    refreshing,
  };
}
