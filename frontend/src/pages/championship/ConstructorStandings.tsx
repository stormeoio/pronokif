import { motion } from "framer-motion";
import { Car, Trophy } from "lucide-react";
import { getTeamColor, getRankStyle, getRankIcon } from "./championshipUtils";

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
    return (
      <div className="card-arcade p-8 text-center">
        <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="font-body text-gray-400">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-2"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
    >
      {constructorsStandings.map((entry) => {
        const constructor = entry.Constructor;
        const teamColor = getTeamColor(constructor?.constructorId);

        return (
          <motion.div
            key={constructor.constructorId}
            className={`p-4 rounded-lg border transition-all ${getRankStyle(entry.position)}`}
            style={{ borderLeftWidth: "4px", borderLeftColor: teamColor }}
            variants={{ hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0 } }}
            whileHover={{ x: 4, scale: 1.01 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon(entry.position)}
              </div>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: teamColor }}
              >
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-base text-white">{constructor?.name}</p>
                <p className="font-body text-xs text-gray-500">{constructor?.nationality}</p>
              </div>
              <div className="text-right">
                <p
                  className={`font-data text-2xl ${parseInt(entry.position) <= 3 ? "text-yellow-400" : "text-white"}`}
                >
                  {entry.points}
                </p>
                <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
              </div>
            </div>
            {parseInt(entry.wins) > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="font-body text-[10px] text-yellow-400">
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
