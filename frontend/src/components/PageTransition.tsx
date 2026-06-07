/**
 * PageTransition — Smooth animated page transitions with Framer Motion.
 *
 * Wraps each route with enter/exit animations for a premium feel.
 * Different animation variants per page type.
 */
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useLocation } from "react-router-dom";

// ─── Animation variants ──────────────────────────────────────────────────────

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    filter: "blur(2px)",
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// Slide for drill-down pages, direction-aware.
// Keep the horizontal travel small: a large translateX overflows the viewport
// during the transition (the global `overflow-x: clip` clips it, but a big
// offset still produces a visible clipped "wipe"). A short slide reads as a
// directional drill-down without spilling content off-screen.
//
// `dir` is read from navigation state (`navigate(path, { state: { dir } })`):
//   - "prev" → enter from the left (swiping back to the previous item)
//   - "next" / undefined → enter from the right (default drill-down)
const makeSlideVariants = (dir?: "next" | "prev") => {
  const fromRight = dir !== "prev";
  const enterX = fromRight ? 24 : -24;
  const exitX = fromRight ? -16 : 16;
  return {
    initial: { opacity: 0, x: enterX, scale: 0.98 },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
    exit: {
      opacity: 0,
      x: exitX,
      scale: 0.99,
      transition: {
        duration: 0.2,
      },
    },
  };
};

// Pop-in for modals and overlays
const popVariants = {
  initial: {
    opacity: 0,
    scale: 0.85,
    rotateX: 15,
  },
  animate: {
    opacity: 1,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1], // spring-like
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Determine which animation to use based on route
function getVariants(pathname: string, dir?: "next" | "prev") {
  // Drill-down pages (detail views)
  if (
    pathname.includes("/predictions/") ||
    pathname.includes("/results/") ||
    pathname.includes("/race/") ||
    pathname.includes("/driver/") ||
    (pathname.includes("/league/") && pathname.includes("/"))
  ) {
    return makeSlideVariants(dir);
  }
  // Profile and settings (pop)
  if (pathname === "/profile" || pathname.includes("/notifications")) {
    return popVariants;
  }
  // Default page transition
  return pageVariants;
}

// ─── Stagger children helpers ────────────────────────────────────────────────

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const staggerItemFromLeft = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ─── Main PageTransition wrapper ─────────────────────────────────────────────

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const dir = (location.state as { dir?: "next" | "prev" } | null)?.dir;
  const variants = getVariants(location.pathname, dir);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={variants as Variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ willChange: "opacity, transform" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Card hover 3D tilt effect ───────────────────────────────────────────────

export function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: 1.02,
        rotateX: -2,
        rotateY: 3,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Magnetic button effect ──────────────────────────────────────────────────

export function MagneticButton({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      whileHover={{
        scale: 1.05,
        boxShadow: "0 0 25px rgba(255, 102, 0, 0.4), 0 8px 30px rgba(0, 0, 0, 0.3)",
      }}
      whileTap={{
        scale: 0.95,
        boxShadow: "0 0 10px rgba(255, 102, 0, 0.3)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

// ─── Glow pulse on scroll ────────────────────────────────────────────────────

export function GlowCard({
  children,
  className = "",
  color = "rgba(0, 204, 255, 0.3)",
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Glow border effect */}
      <motion.div
        className="absolute -inset-[1px] rounded-xl opacity-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${color}, transparent 60%)` }}
        whileInView={{ opacity: 0.6 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.8 }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
