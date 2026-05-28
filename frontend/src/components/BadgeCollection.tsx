/**
 * BadgeCollection — Shows earned badges/achievements on the profile.
 * Broadcast Premium: pk-surface card, pk-* badge colors, stagger animations.
 */
import { motion } from "framer-motion";
import { Trophy, Target, Flame, Zap, Crown, Star, Flag, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  earned: boolean;
}

interface BadgeCollectionProps {
  totalPredictions: number;
  totalPoints: number;
  level: number;
  streak: number;
}

function getBadges({
  totalPredictions,
  totalPoints,
  level,
  streak,
}: BadgeCollectionProps): Badge[] {
  return [
    {
      id: "first_prediction",
      name: "Beginner",
      description: "Premier pickstic",
      icon: Target,
      color: "bg-pk-emerald",
      earned: totalPredictions >= 1,
    },
    {
      id: "five_predictions",
      name: "Regular",
      description: "5 predictions",
      icon: Flag,
      color: "bg-pk-info",
      earned: totalPredictions >= 5,
    },
    {
      id: "twenty_predictions",
      name: "Veteran",
      description: "20 predictions",
      icon: Star,
      color: "bg-pk-info",
      earned: totalPredictions >= 20,
    },
    {
      id: "hundred_points",
      name: "Scoreur",
      description: "100 total points",
      icon: Zap,
      color: "bg-pk-amber",
      earned: totalPoints >= 100,
    },
    {
      id: "five_hundred_points",
      name: "Expert",
      description: "500 total points",
      icon: Trophy,
      color: "bg-pk-gold",
      earned: totalPoints >= 500,
    },
    {
      id: "streak_3",
      name: "On a streak",
      description: "3 consecutive GPs",
      icon: Flame,
      color: "bg-pk-amber",
      earned: streak >= 3,
    },
    {
      id: "streak_7",
      name: "Unstoppable",
      description: "7 consecutive GPs",
      icon: Flame,
      color: "bg-pk-red",
      earned: streak >= 7,
    },
    {
      id: "level_5",
      name: "Champion",
      description: "Niveau 5 atteint",
      icon: Crown,
      color: "bg-pk-info",
      earned: level >= 5,
    },
    {
      id: "level_10",
      name: "Legend",
      description: "Niveau 10 atteint",
      icon: Crown,
      color: "bg-pk-red",
      earned: level >= 10,
    },
  ];
}

export default function BadgeCollection(props: BadgeCollectionProps) {
  const badges = getBadges(props);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xs flex items-center gap-2">
          <Users className="w-4 h-4 text-pk-amber" />
          Badges
        </h3>
        <span className="font-data text-xs text-pk-titane">
          {earnedCount}/{badges.length}
        </span>
      </div>

      <motion.div
        className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
      >
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={badge.id}
              className={`relative flex flex-col items-center p-2.5 rounded-lg border transition-all ${
                badge.earned
                  ? "border-white/[0.12] bg-white/[0.04]"
                  : "border-white/[0.06] bg-pk-surface opacity-40"
              }`}
              title={badge.earned ? badge.description : `${badge.description} (non obtenu)`}
              variants={{ hidden: { opacity: 0, scale: 0.7 }, visible: { opacity: 1, scale: 1 } }}
              whileHover={badge.earned ? { scale: 1.1, y: -2 } : undefined}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 ${
                  badge.earned ? `${badge.color} shadow-lg` : "bg-white/[0.06]"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${badge.earned ? "text-white" : "text-pk-titane/40"}`}
                  strokeWidth={2}
                />
              </div>
              <span
                className={`font-data text-[0.5625rem] text-center leading-tight ${
                  badge.earned ? "text-pk-piste/80" : "text-pk-titane/40"
                }`}
              >
                {badge.name}
              </span>
              {!badge.earned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg opacity-30">&#x1F512;</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
