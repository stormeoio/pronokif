/**
 * StreakWidget — Compact flame + streak counter for dashboard banner.
 *
 * Shows consecutive prediction days. Pulses when active.
 */
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_prediction_date: string | null;
  is_active_today: boolean;
}

export default function StreakWidget() {
  const { data: streak } = useQuery({
    queryKey: ["/user/streak"],
    queryFn: () => api.user.streak() as Promise<StreakData>,
    staleTime: 60_000,
  });

  if (!streak || streak.current_streak === 0) return null;

  const isHot = streak.current_streak >= 3;
  const isOnFire = streak.current_streak >= 7;

  return (
    <motion.div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
        isOnFire
          ? "bg-gradient-to-r from-orange-500/30 to-red-500/30 border-orange-500/50 shadow-lg shadow-orange-500/20"
          : isHot
            ? "bg-orange-500/20 border-orange-500/40"
            : "bg-yellow-500/10 border-yellow-500/30"
      }`}
      title={`Serie de ${streak.current_streak} jours | Record : ${streak.longest_streak}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      whileHover={{ scale: 1.1 }}
    >
      <motion.span
        className="text-base"
        role="img"
        aria-label="streak"
        animate={isOnFire ? { y: [0, -3, 0] } : undefined}
        transition={isOnFire ? { repeat: Infinity, duration: 0.6 } : undefined}
      >
        {isOnFire ? "🔥" : isHot ? "🔥" : "⭐"}
      </motion.span>
      <span
        className={`font-data text-xs font-bold ${
          isOnFire ? "text-orange-300" : isHot ? "text-orange-400" : "text-yellow-400"
        }`}
      >
        {streak.current_streak}j
      </span>
    </motion.div>
  );
}
