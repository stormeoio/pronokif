/**
 * NewResultsBanner — Teases recent race results the user hasn't viewed yet.
 * Shows score preview and animates to drive clicks to results page.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, ChevronRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

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
      onClick={() => navigate(`/results/${latestResult.race_id}`)}
      className="w-full card-arcade p-4 border-2 border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent hover:from-yellow-500/10 transition-all group"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-heading text-sm text-yellow-400 uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Resultats disponibles !
            </p>
            <p className="font-body text-xs text-gray-400">
              {latestResult.race_name}
              {latestResult.user_score !== null && (
                <span className="ml-2 text-green-400 font-data">
                  +{latestResult.user_score} pts
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-yellow-500 group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.button>
  );
}
