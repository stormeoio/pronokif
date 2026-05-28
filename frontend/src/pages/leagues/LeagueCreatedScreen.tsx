/**
 * League Created — Success screen with code share.
 * Broadcast Premium theme.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Share2, Flag } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, easing, duration, getReducedMotionProps } from "@/lib/motion";

/* ── Types ─────────────────────────────────────────────── */

export interface League {
  id: string | number;
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface LeagueCreatedScreenProps {
  league: League;
  copied: string | null;
  onCopyCode: () => void;
  onShareCode: () => void;
  onDone: () => void;
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueCreatedScreen({
  league,
  copied,
  onCopyCode,
  onShareCode,
  onDone,
}: LeagueCreatedScreenProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  return (
    <div className="min-h-screen bg-pk-carbon flex flex-col items-center justify-center px-4 pb-24 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pk-emerald/[0.04] blur-[120px] pointer-events-none" />

      <motion.div
        className="w-full max-w-sm text-center relative z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Success icon */}
        <motion.div variants={fadeUp} className="mb-5">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-pk-emerald/[0.12] border border-pk-emerald/20 flex items-center justify-center mx-auto"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Check className="w-7 h-7 text-pk-emerald" strokeWidth={2.5} />
          </motion.div>
        </motion.div>

        <motion.h1 variants={fadeUp} className="font-display text-xl mb-1">
          Ligue créée !
        </motion.h1>
        <motion.p variants={fadeUp} className="text-xs text-pk-titane mb-6">
          Partage ce code avec tes amis
        </motion.p>

        {/* Code card */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-5 mb-5"
        >
          <p className="text-xs text-pk-titane mb-3">{league.name}</p>

          {/* OTP-style code */}
          <div className="flex justify-center gap-1.5 mb-3">
            {league.code.split("").map((char, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.3 }}
                className="w-10 h-12 rounded-lg bg-pk-anthracite border border-white/[0.08] flex items-center justify-center font-data text-lg font-bold"
              >
                {char}
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => {
              haptic("light");
              onCopyCode();
            }}
            className="inline-flex items-center gap-1.5 font-data text-[0.5625rem] text-pk-titane hover:text-pk-piste transition-colors"
            data-testid="copy-code-btn"
          >
            {copied === league.code ? (
              <>
                <Check className="w-3 h-3 text-pk-emerald" />
                <span className="text-pk-emerald">Copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copier le code
              </>
            )}
          </button>
        </motion.div>

        {/* Share buttons */}
        <motion.div variants={fadeUp} className="flex gap-2 mb-5">
          <button
            onClick={() => {
              haptic("medium");
              onShareCode();
            }}
            className="flex-1 h-11 rounded-lg bg-pk-emerald/[0.12] border border-pk-emerald/25 text-pk-emerald font-display text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            data-testid="share-code-btn"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
          <button
            onClick={() => {
              haptic("light");
              onCopyCode();
            }}
            className="flex-1 h-11 rounded-lg bg-white/[0.04] border border-white/[0.08] text-pk-piste font-display text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            data-testid="copy-btn"
          >
            <Copy className="w-4 h-4" />
            Copier
          </button>
        </motion.div>

        {/* CTA */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => {
              haptic("success");
              onDone();
            }}
            className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform"
            data-testid="go-dashboard-btn"
          >
            <Flag className="w-4 h-4" />
            Commencer à pronostiquer
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
