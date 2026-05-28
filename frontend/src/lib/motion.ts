/**
 * PronoKif — Framer Motion Presets
 * Source of truth: DESIGN.md (Broadcast Premium — Expressive motion)
 *
 * Usage:
 *   import { fadeUp, staggerChildren, STAGGER_DELAY } from "@/lib/motion";
 *   <motion.div variants={fadeUp} initial="hidden" animate="visible">
 */
import type { Variants, Transition } from "framer-motion";

/* ------------------------------------------------
   EASING CURVES (DESIGN.md)
   ------------------------------------------------ */
export const easing = {
  /** Enter: ease-out overshoot */
  enter: [0.22, 1, 0.36, 1] as const,
  /** Exit: ease-in */
  exit: [0.4, 0, 1, 1] as const,
  /** Move: ease-in-out */
  move: [0.4, 0, 0.2, 1] as const,
};

/* ------------------------------------------------
   DURATION TOKENS (DESIGN.md)
   ------------------------------------------------ */
export const duration = {
  micro: 0.08,
  short: 0.2,
  medium: 0.35,
  long: 0.6,
} as const;

/* ------------------------------------------------
   STAGGER CONFIG
   ------------------------------------------------ */
/** Delay between stagger children (50-80ms per DESIGN.md) */
export const STAGGER_DELAY = 0.06;

/* ------------------------------------------------
   TRANSITION PRESETS
   ------------------------------------------------ */
export const springEnter: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 24,
};

export const smoothEnter: Transition = {
  duration: duration.medium,
  ease: easing.enter,
};

export const quickEnter: Transition = {
  duration: duration.short,
  ease: easing.enter,
};

/* ------------------------------------------------
   VARIANTS — Page transitions
   ------------------------------------------------ */
export const pageTransition: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: easing.enter },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2, ease: easing.exit },
  },
};

/* ------------------------------------------------
   VARIANTS — Fade up (general purpose)
   ------------------------------------------------ */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.medium, ease: easing.enter },
  },
};

/* ------------------------------------------------
   VARIANTS — Fade in (simple)
   ------------------------------------------------ */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.medium, ease: easing.enter },
  },
};

/* ------------------------------------------------
   VARIANTS — Slide in from left (classement rows)
   ------------------------------------------------ */
export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -12,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.medium, ease: easing.enter },
  },
};

/* ------------------------------------------------
   VARIANTS — Scale in (badges, avatars)
   ------------------------------------------------ */
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.short, ease: easing.enter },
  },
};

/* ------------------------------------------------
   VARIANTS — Driver selection glow
   ------------------------------------------------ */
export const selectionGlow: Variants = {
  idle: {
    scale: 1,
    boxShadow: "0 0 0px rgba(225, 6, 0, 0)",
  },
  selected: {
    scale: 1.02,
    boxShadow: "0 0 20px rgba(225, 6, 0, 0.4)",
    transition: { duration: duration.medium, ease: easing.enter },
  },
};

/* ------------------------------------------------
   VARIANTS — Score counter increment
   ------------------------------------------------ */
export const scoreUp: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.long,
      ease: easing.enter,
    },
  },
};

/* ------------------------------------------------
   VARIANTS — Stagger container
   Use on parent <motion.div> with staggerChildren
   ------------------------------------------------ */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_DELAY,
      delayChildren: 0.1,
    },
  },
};

/* ------------------------------------------------
   VARIANTS — Start lights sequence
   ------------------------------------------------ */
export const startLight = (index: number): Variants => ({
  off: {
    background: "rgba(255, 255, 255, 0.05)",
    boxShadow: "none",
  },
  on: {
    background: "#E10600",
    boxShadow: "0 0 30px rgba(225, 6, 0, 0.8), 0 0 60px rgba(225, 6, 0, 0.4)",
    transition: {
      delay: index * 0.6,
      duration: 0.4,
      ease: easing.enter,
    },
  },
});

/* ------------------------------------------------
   VARIANTS — CTA hover
   ------------------------------------------------ */
export const ctaHover = {
  scale: 1.05,
  boxShadow: "0 0 25px rgba(225, 6, 0, 0.6)",
  transition: { duration: duration.medium, ease: easing.enter },
};

export const ctaTap = {
  scale: 0.98,
  transition: { duration: duration.micro },
};

/* ------------------------------------------------
   LAYOUT ANIMATION
   For AnimatePresence + layout animations
   ------------------------------------------------ */
export const layoutTransition: Transition = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};

/* ------------------------------------------------
   REDUCED MOTION HELPER
   Wrap your animation props: prefersReducedMotion ? {} : variants
   ------------------------------------------------ */
export const getReducedMotionProps = (prefersReducedMotion: boolean) => {
  if (prefersReducedMotion) {
    return {
      initial: false,
      animate: false,
      transition: { duration: 0 },
    };
  }
  return {};
};
