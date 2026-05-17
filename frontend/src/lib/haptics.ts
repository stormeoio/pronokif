/**
 * Haptic feedback utilities for mobile.
 * Falls back gracefully on unsupported browsers.
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error" | "selection";

const PATTERNS: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 20],
  error: [30, 50, 30, 50, 30],
  selection: [5],
};

/**
 * Trigger haptic feedback if the device supports it.
 */
export function haptic(pattern: HapticPattern = "light"): void {
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Silently fail — not all contexts allow vibration
  }
}
