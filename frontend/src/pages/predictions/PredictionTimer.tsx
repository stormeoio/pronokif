import { motion } from "framer-motion";
import { Clock, Flag, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fadeUp } from "@/lib/motion";

/**
 * Countdown / deadline info banner for predictions.
 * Shows closing time relative to qualifying session.
 */
interface PredictionTimerProps {
  activeTab: string;
}

export default function PredictionTimer({ activeTab }: PredictionTimerProps) {
  const { t } = useTranslation();
  const isSprint = activeTab === "sprint";

  return (
    <motion.div
      className="relative overflow-hidden rounded-md border border-pk-red/20 bg-[linear-gradient(135deg,rgba(225,6,0,0.12),rgba(18,20,24,0.95)_58%)] p-3"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      data-testid="prediction-timer"
    >
      <div className="absolute right-0 top-0 h-full w-24 bg-pk-red/10 blur-2xl" aria-hidden />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <motion.div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-pk-red/25 bg-pk-red-subtle"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          >
            <Clock size={15} strokeWidth={1.5} className="text-pk-red" />
          </motion.div>
          <div className="min-w-0">
            <p className="font-data text-[0.5rem] uppercase tracking-[0.16em] text-pk-red">
              {t("predictions.timer.deadline")}
            </p>
            <p className="truncate text-[0.8125rem] font-medium text-pk-piste">
              {isSprint ? t("predictions.timer.sprint") : t("predictions.timer.race")}
            </p>
          </div>
        </div>
        <span
          className={`flex h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2 font-data text-[0.5625rem] uppercase tracking-[0.12em] ${
            isSprint
              ? "border-pk-amber/25 bg-pk-amber/10 text-pk-amber"
              : "border-pk-red/25 bg-pk-red-subtle text-pk-red"
          }`}
        >
          {isSprint ? <Zap size={12} strokeWidth={1.7} /> : <Flag size={12} strokeWidth={1.7} />}
          {isSprint ? "SQ1" : "Q1"}
        </span>
      </div>
    </motion.div>
  );
}
