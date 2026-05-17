/**
 * BadgeCollection — Shows earned badges/achievements on the profile.
 * Locked badges are shown grayed out to motivate completion.
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
      name: "Debutant",
      description: "Premier pronostic",
      icon: Target,
      color: "from-green-400 to-green-600",
      earned: totalPredictions >= 1,
    },
    {
      id: "five_predictions",
      name: "Habitue",
      description: "5 pronostics",
      icon: Flag,
      color: "from-blue-400 to-blue-600",
      earned: totalPredictions >= 5,
    },
    {
      id: "twenty_predictions",
      name: "Veterant",
      description: "20 pronostics",
      icon: Star,
      color: "from-purple-400 to-purple-600",
      earned: totalPredictions >= 20,
    },
    {
      id: "hundred_points",
      name: "Scoreur",
      description: "100 points cumules",
      icon: Zap,
      color: "from-yellow-400 to-yellow-600",
      earned: totalPoints >= 100,
    },
    {
      id: "five_hundred_points",
      name: "Expert",
      description: "500 points cumules",
      icon: Trophy,
      color: "from-amber-400 to-amber-600",
      earned: totalPoints >= 500,
    },
    {
      id: "streak_3",
      name: "En serie",
      description: "3 courses consecutives",
      icon: Flame,
      color: "from-orange-400 to-orange-600",
      earned: streak >= 3,
    },
    {
      id: "streak_7",
      name: "Inarretable",
      description: "7 courses consecutives",
      icon: Flame,
      color: "from-red-400 to-red-600",
      earned: streak >= 7,
    },
    {
      id: "level_5",
      name: "Champion",
      description: "Niveau 5 atteint",
      icon: Crown,
      color: "from-cyan-400 to-cyan-600",
      earned: level >= 5,
    },
    {
      id: "level_10",
      name: "Legende",
      description: "Niveau 10 atteint",
      icon: Crown,
      color: "from-pink-400 to-pink-600",
      earned: level >= 10,
    },
  ];
}

export default function BadgeCollection(props: BadgeCollectionProps) {
  const badges = getBadges(props);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="card-arcade p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-yellow-500" />
          Badges
        </h3>
        <span className="font-data text-xs text-gray-400">
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
                  ? "border-white/20 bg-white/5"
                  : "border-gray-800 bg-gray-900/50 opacity-40"
              }`}
              title={badge.earned ? badge.description : `${badge.description} (non obtenu)`}
              variants={{ hidden: { opacity: 0, scale: 0.7 }, visible: { opacity: 1, scale: 1 } }}
              whileHover={badge.earned ? { scale: 1.1, y: -2 } : undefined}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-1 ${
                  badge.earned
                    ? `bg-gradient-to-br ${badge.color} shadow-lg`
                    : "bg-gray-800"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 ${badge.earned ? "text-white" : "text-gray-600"}`}
                  strokeWidth={2}
                />
              </div>
              <span
                className={`font-body text-[10px] text-center leading-tight ${
                  badge.earned ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {badge.name}
              </span>
              {!badge.earned && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg opacity-30">🔒</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
