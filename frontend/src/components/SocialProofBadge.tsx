/**
 * SocialProofBadge — Shows how many players have predicted for a race.
 * Creates FOMO / social pressure to encourage predictions.
 */
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { api } from "@/lib/api";

interface SocialProofBadgeProps {
  raceId: string | number;
}

export default function SocialProofBadge({ raceId }: SocialProofBadgeProps) {
  const { data } = useQuery({
    queryKey: ["/races", raceId, "prediction-count"],
    queryFn: () => api.races.predictionCount(String(raceId)) as Promise<{ count: number }>,
    staleTime: 30_000,
    enabled: !!raceId,
  });

  if (!data || data.count === 0) return null;

  return (
    <motion.div
      className="flex items-center gap-1.5 text-xs font-body text-gray-400"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <Users className="w-3 h-3" />
      <span>
        <span className="text-green-400 font-data">{data.count}</span> joueurs ont deja pronostique
      </span>
    </motion.div>
  );
}
