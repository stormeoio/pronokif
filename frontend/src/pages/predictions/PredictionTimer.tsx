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
    <div
      className={`p-3 rounded-xl ${
        activeTab === "sprint"
          ? "bg-yellow-500/10 border border-yellow-500/30"
          : "bg-cyan-500/10 border border-cyan-500/30"
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock
          className={`w-4 h-4 ${
            activeTab === "sprint" ? "text-yellow-400" : "text-cyan-400"
          }`}
        />
        <span className="font-body text-sm text-gray-300">
          {activeTab === "sprint"
            ? "Clôture 15 min avant SQ1"
            : "Clôture 15 min avant Q1"}
        </span>
      </div>
    </div>
  );
}
