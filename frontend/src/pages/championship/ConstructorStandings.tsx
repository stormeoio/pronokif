/**
 * ConstructorStandings — F1 constructors championship table.
 * Broadcast Premium: pk-gold/silver/bronze podium, team-color badges.
 */
import { motion } from "framer-motion";
import { Car, Trophy } from "lucide-react";
import { getTeamColor, getRankStyle, getRankIcon } from "./championshipUtils";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";

interface ConstructorEntry {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality: string;
  };
}

interface ConstructorStandingsProps {
  constructorsStandings: ConstructorEntry[];
}

export default function ConstructorStandings({ constructorsStandings }: ConstructorStandingsProps) {
  if (constructorsStandings.length === 0) {
    return <EmptyMinimal icon="🏎️" message="No data available" />;
  }

  return (
    <motion.div
      className="space-y-1.5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {constructorsStandings.map((entry) => {
        const constructor = entry.Constructor;
        const teamColor = getTeamColor(constructor?.constructorId);

        return (
          <motion.div
            key={constructor.constructorId}
            className={`p-3 rounded-lg border transition-colors ${getRankStyle(entry.position)}`}
            style={{ borderLeftWidth: "3px", borderLeftColor: teamColor }}
            variants={fadeUp}
          >
            <div className="flex items-center gap-2.5">
              {/* Rank */}
              <div className="w-7 h-7 flex items-center justify-center">
                {getRankIcon(entry.position)}
              </div>

              {/* Team badge */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: teamColor }}
              >
                <Car className="w-5 h-5 text-white" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm">{constructor?.name}</p>
                <p className="font-data text-[0.5625rem] text-pk-titane">
                  {constructor?.nationality}
                </p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p
                  className={`font-data text-lg font-bold ${parseInt(entry.position) <= 3 ? "text-pk-amber" : ""}`}
                >
                  {entry.points}
                </p>
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">pts</p>
              </div>
            </div>

            {/* Wins */}
            {parseInt(entry.wins) > 0 && (
              <div className="mt-1.5 ml-[4.25rem] flex items-center gap-1">
                <Trophy className="w-3 h-3 text-pk-gold" />
                <span className="font-data text-[0.5rem] text-pk-gold">
                  {entry.wins} victoire{parseInt(entry.wins) > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
