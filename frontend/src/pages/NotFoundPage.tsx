import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Flag } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, easing, duration, getReducedMotionProps } from "@/lib/motion";

/**
 * 404 — Red Flag / Drapeau Rouge
 * Broadcast Premium theme — immersive racing metaphor.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  return (
    <div className="min-h-screen bg-pk-carbon flex flex-col">
      {/* Red Flag Banner */}
      <motion.div
        className="w-full py-2.5 bg-pk-red text-white font-display text-sm uppercase tracking-wider flex items-center justify-center gap-2"
        initial={{ y: -40 }}
        animate={{ y: 0 }}
        transition={{ duration: duration.medium, ease: easing.enter }}
        {...rmProps}
      >
        <Flag className="w-3.5 h-3.5" fill="currentColor" />
        Drapeau rouge — session interrompue
      </motion.div>

      {/* Content */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Flag illustration */}
        <motion.div variants={fadeUp} className="mb-6">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mx-auto">
            <rect x="20" y="10" width="4" height="100" rx="2" fill="#5F6673" />
            <motion.g
              animate={prefersReducedMotion ? {} : { skewX: [0, -3, 3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <rect x="24" y="10" width="76" height="50" rx="4" fill="#E10600" opacity="0.9" />
              <text
                x="62"
                y="42"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="18"
                fontWeight="700"
                fill="white"
              >
                404
              </text>
            </motion.g>
          </svg>
        </motion.div>

        <motion.h1 variants={fadeUp} className="font-display text-[1.75rem] text-pk-red mb-2">
          Drapeau rouge
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-sm text-pk-titane leading-relaxed mb-8 max-w-[280px]"
        >
          Page introuvable. La session a été interrompue — retourne en piste !
        </motion.p>

        {/* Radio Message */}
        <motion.div
          variants={fadeUp}
          className="w-full max-w-[300px] bg-pk-surface border border-white/[0.08] rounded-lg p-3.5 mb-6 text-left"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pk-red animate-live-pulse" />
            <span className="font-data text-[0.5rem] text-pk-red uppercase">Radio équipe</span>
          </div>
          <p className="text-[0.8125rem] italic text-pk-piste leading-snug">
            "Fred, on a perdu ta position. Rentre aux stands et on te remet en piste."
          </p>
          <p className="font-data text-[0.5rem] text-pk-titane mt-1">— Ingénieur de course</p>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} className="w-full max-w-[280px] flex flex-col gap-2">
          <button
            onClick={() => {
              haptic("medium");
              navigate("/");
            }}
            className="w-full h-12 rounded-lg bg-pk-red text-white font-display text-[0.9375rem] flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            Retour au paddock
          </button>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-pk-titane hover:text-pk-piste transition-colors"
          >
            Signaler un problème
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
