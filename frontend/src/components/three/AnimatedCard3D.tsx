/**
 * AnimatedCard3D — Interactive card with 3D perspective tilt on pointer move.
 *
 * Uses CSS transforms (no Three.js canvas) for performance.
 * Responds to pointer position for a holographic parallax effect.
 */
import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface AnimatedCard3DProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: number; // Tilt intensity multiplier (default 1)
}

export default function AnimatedCard3D({
  children,
  className = "",
  glowColor = "rgba(0, 204, 255, 0.15)",
  intensity = 1,
}: AnimatedCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setTransform({
        rotateX: (0.5 - y) * 12 * intensity,
        rotateY: (x - 0.5) * 12 * intensity,
      });
      setGlowPos({ x: x * 100, y: y * 100 });
    },
    [intensity],
  );

  const handlePointerLeave = useCallback(() => {
    setTransform({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden ${className}`}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={handlePointerLeave}
      animate={{
        rotateX: transform.rotateX,
        rotateY: transform.rotateY,
        scale: isHovered ? 1.02 : 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
    >
      {/* Holographic light reflection */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-xl"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${glowColor} 0%, transparent 60%)`,
        }}
      />

      {/* Shimmer edge highlight */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 0.5 : 0,
          background: `linear-gradient(${135 + transform.rotateY * 5}deg, rgba(255,255,255,0.1) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
