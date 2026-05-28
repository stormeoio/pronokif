/**
 * OnboardingTooltip — Contextual tooltip that appears once per step.
 * Broadcast Premium: pk-surface tooltip, pk-info accent, font-data.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface OnboardingTooltipProps {
  /** Unique key for localStorage tracking */
  stepId: string;
  /** Tooltip message */
  message: string;
  /** Position relative to anchor */
  position?: "top" | "bottom";
  /** Optional emoji */
  emoji?: string;
  /** Delay before showing (ms) */
  delay?: number;
}

const STORAGE_PREFIX = "pronokif_onboarding_";

export default function OnboardingTooltip({
  stepId,
  message,
  position = "bottom",
  emoji = "👋",
  delay = 1000,
}: OnboardingTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `${STORAGE_PREFIX}${stepId}`;
    if (localStorage.getItem(key)) return;

    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [stepId, delay]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(`${STORAGE_PREFIX}${stepId}`, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`absolute z-50 max-w-[250px] ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          initial={{ opacity: 0, y: position === "top" ? 8 : -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? 8 : -8, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
        >
          <div className="relative bg-pk-anthracite backdrop-blur-sm border border-pk-info/30 rounded-lg p-3 shadow-xl">
            {/* Arrow */}
            <div
              className={`absolute left-6 w-3 h-3 bg-pk-anthracite border-pk-info/30 rotate-45 ${
                position === "top"
                  ? "bottom-[-6px] border-b border-r"
                  : "top-[-6px] border-t border-l"
              }`}
            />

            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{emoji}</span>
              <p className="text-xs text-pk-piste/80 leading-relaxed">{message}</p>
              <motion.button
                onClick={dismiss}
                className="flex-shrink-0 p-0.5 text-pk-titane hover:text-pk-piste rounded"
                whileTap={{ scale: 0.8 }}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
