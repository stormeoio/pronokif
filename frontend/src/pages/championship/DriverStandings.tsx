/**
 * DriverStandings — F1 drivers championship table.
 * Broadcast Premium: pk-gold/silver/bronze podium, team-color left border.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";
import { getTeamColor, getRankStyle, getRankIcon, DRIVER_ID_MAP } from "./championshipUtils";
import { haptic } from "@/lib/haptics";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";

interface DriverEntry {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    permanentNumber?: string;
  };
  Constructors?: Array<{
    constructorId: string;
    name: string;
  }>;
}

interface DriverStandingsProps {
  driversStandings: DriverEntry[];
}

export default function DriverStandings({ driversStandings }: DriverStandingsProps) {
  const navigate = useNavigate();

  if (driversStandings.length === 0) {
    return <EmptyMinimal icon="🏆" message="Aucune donnée disponible" />;
  }

  return (
    <motion.div
      className="space-y-1.5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {driversStandings.map((entry) => {
        const driver = entry.Driver;
        const constructor = entry.Constructors?.[0];
        const teamColor = getTeamColor(constructor?.constructorId);
        const mappedDriverId = DRIVER_ID_MAP[driver.driverId] || driver.familyName?.toLowerCase();
        const driverKey =
          driver.driverId || `${driver.givenName}-${driver.familyName}-${entry.position}`;

        return (
          <motion.button
            key={driverKey}
            onClick={() => {
              haptic("light");
              navigate(`/driver/${mappedDriverId}`);
            }}
            className={`w-full p-3 rounded-lg border transition-colors text-left hover:bg-white/[0.02] ${getRankStyle(entry.position)}`}
            style={{ borderLeftWidth: "3px", borderLeftColor: teamColor }}
            data-testid={`driver-row-${driverKey}`}
            variants={fadeUp}
          >
            <div className="flex items-center gap-2.5">
              {/* Rank */}
              <div className="w-7 h-7 flex items-center justify-center">
                {getRankIcon(entry.position)}
              </div>

              {/* Number badge */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-data text-sm text-white flex-shrink-0"
                style={{ backgroundColor: teamColor }}
              >
                {driver.permanentNumber || "?"}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm truncate">
                  {driver.givenName}{" "}
                  <span className="text-pk-red">{driver.familyName?.toUpperCase()}</span>
                </p>
                <p className="font-data text-[0.5625rem] text-pk-titane truncate">
                  {constructor?.name || "Écurie inconnue"}
                </p>
              </div>

              {/* Points */}
              <div className="text-right flex items-center gap-1.5">
                <div>
                  <p
                    className={`font-data text-lg font-bold ${parseInt(entry.position) <= 3 ? "text-pk-amber" : ""}`}
                  >
                    {entry.points}
                  </p>
                  <p className="font-data text-[0.5rem] text-pk-titane uppercase">pts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-pk-titane" />
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
          </motion.button>
        );
      })}
    </motion.div>
  );
}
