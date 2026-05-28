/**
 * NewResultsBanner — Teases recent race results the user hasn't viewed yet.
 * Broadcast Premium: pk-surface card, pk-amber accent, haptic feedback.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";

interface LatestResult {
  race_id: string;
  race_name: string;
  user_score: number | null;
  position_in_league: number | null;
  total_players: number | null;
}

export default function NewResultsBanner() {
  const navigate = useNavigate();

  const { data: latestResult } = useQuery({
    queryKey: ["/results/latest-unseen"],
    queryFn: () => api.results.latestUnseen() as Promise<LatestResult | null>,
    staleTime: 60_000,
    retry: false,
  });

  if (!latestResult) return null;

  return (
    <motion.button
      onClick={() => {
        haptic("light");
        navigate(`/results/${latestResult.race_id}`);
      }}
      className="w-full bg-pk-surface border border-pk-amber/20 rounded-lg p-4 hover:border-pk-amber/40 transition-all group"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      whileTap={{ scale: 0.97 }}
      data-testid="new-results-banner"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pk-amber flex items-center justify-center shadow-lg shadow-pk-amber/20 group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-display text-xs text-pk-amber flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Results available!
            </p>
            <p className="font-data text-[0.5625rem] text-pk-titane">
              {latestResult.race_name}
              {latestResult.user_score !== null && (
                <span className="ml-2 text-pk-emerald font-data">
                  +{latestResult.user_score} pts
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-pk-amber group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.button>
  );
}
