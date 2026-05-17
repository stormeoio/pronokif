import { motion } from "framer-motion";
import { Clock } from "lucide-react";

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
      className={`p-3 rounded-xl ${
        activeTab === "sprint"
          ? "bg-yellow-500/10 border border-yellow-500/30"
          : "bg-cyan-500/10 border border-cyan-500/30"
      }`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <Clock
            className={`w-4 h-4 ${activeTab === "sprint" ? "text-yellow-400" : "text-cyan-400"}`}
          />
        </motion.div>
        <span className="font-body text-sm text-gray-300">
          {activeTab === "sprint" ? "Clôture 15 min avant SQ1" : "Clôture 15 min avant Q1"}
        </span>
      </div>
    </motion.div>
  );
}
