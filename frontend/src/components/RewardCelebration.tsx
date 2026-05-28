/**
 * RewardCelebration — Full-screen celebration overlay with confetti + XP animation.
 * Broadcast Premium: pk-amber/gold XP display, pk-red level-up badge.
 *
 * Triggers on prediction save, mission claim, or level-up.
 * Auto-dismisses after 3s or on tap.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface RewardCelebrationProps {
  /** Whether the celebration is visible */
  show: boolean;
  /** Dismiss callback */
  onDone: () => void;
  /** XP earned (shown animated) */
  xpEarned?: number;
  /** Optional message (e.g. "Pickstics saved!") */
  message?: string;
  /** Level up notification */
  levelUp?: { from: number; to: number } | null;
}

const CONFETTI_COLORS = [
  "#E10600", // pk-red
  "#00D4FF", // pk-info
  "#FFB800", // pk-amber
  "#22C55E", // pk-emerald
  "#FFD700", // gold
  "#F4F4F4", // pk-piste
  "#3B82F6", // blue
  "#FBBF24", // amber
];

export default function RewardCelebration({
  show,
  onDone,
  xpEarned = 0,
  message,
  levelUp,
}: RewardCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [displayXp, setDisplayXp] = useState(0);
  const [, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  // Auto-dismiss after 3s
  useEffect(() => {
    if (!show) return;
    setPhase("enter");
    setDisplayXp(0);

    const holdTimer = setTimeout(() => setPhase("hold"), 300);
    const exitTimer = setTimeout(() => setPhase("exit"), 2700);
    const doneTimer = setTimeout(onDone, 3200);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [show, onDone]);

  // Animate XP counter
  useEffect(() => {
    if (!show || !xpEarned) return;
    const duration = 1200;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(eased * xpEarned));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const delay = setTimeout(() => requestAnimationFrame(tick), 400);
    return () => clearTimeout(delay);
  }, [show, xpEarned]);

  // Confetti canvas
  const initParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const particles: Particle[] = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.3,
        y: -20,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 4 + 2,
        size: Math.random() * 8 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? "#FFD700",
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;

    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.vy += 0.15;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - 0.003);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [show, initParticles]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDone}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Confetti canvas (decorative) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          />

          {/* Content */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0.3, opacity: 0, rotateX: 30 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            {/* Level up badge */}
            {levelUp && (
              <motion.div
                className="mb-4"
                initial={{ y: -40, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
              >
                <motion.div
                  className="inline-flex items-center gap-2 bg-pk-red text-white px-4 py-2 rounded-full font-display text-sm shadow-glow-red"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-lg">&#x2B50;</span>
                  Niveau {levelUp.to} !
                </motion.div>
              </motion.div>
            )}

            {/* XP earned */}
            {xpEarned > 0 && (
              <motion.div
                className="mb-3"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.2 }}
              >
                <span className="font-data text-5xl font-bold text-pk-amber drop-shadow-lg">
                  +{displayXp}
                </span>
                <p className="font-display text-sm text-pk-amber/80 mt-1">XP</p>
              </motion.div>
            )}

            {/* Message */}
            {message && (
              <motion.p
                className="font-display text-lg text-white mt-3 drop-shadow-md"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                {message}
              </motion.p>
            )}

            {/* Tap to dismiss hint */}
            <motion.p
              className="font-data text-[0.5625rem] text-pk-titane mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1] }}
              transition={{ delay: 1, duration: 2, repeat: Infinity }}
            >
              Touche pour continuer
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
