import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { fadeUp, easing, duration } from "@/lib/motion";

/**
 * Countdown / deadline info banner for predictions.
 * Shows closing time relative to qualifying session.
 */
interface PredictionTimerProps {
  activeTab: string;
}

export default function PredictionTimer({ activeTab }: PredictionTimerProps) {
  return (
    <motion.div
      className="flex items-center gap-2
        p-3 rounded-md
        bg-pk-red-subtle border border-[rgba(225,6,0,0.12)]"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <Clock size={14} strokeWidth={1.5} className="text-pk-red" />
      </motion.div>
      <span className="text-[0.8125rem] text-pk-piste">
        {activeTab === "sprint" ? "Cloture 15 min avant SQ1" : "Cloture 15 min avant Q1"}
      </span>
    </motion.div>
  );
}
