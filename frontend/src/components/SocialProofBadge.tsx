/**
 * SocialProofBadge — Shows how many players have predicted for a race.
 * Broadcast Premium: pk-emerald live dot, pk-titane text, font-data.
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
      className="flex items-center gap-1.5 text-xs text-pk-titane"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-pk-emerald opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-pk-emerald" />
      </span>
      <Users className="w-3 h-3" />
      <span>
        <span className="text-pk-emerald font-data">{data.count}</span> joueurs ont déjà soumis
        leurs pronos
      </span>
    </motion.div>
  );
}
