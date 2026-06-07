/**
 * ConstructorStandings — F1 constructors championship table.
 * Broadcast Premium: pk-gold/silver/bronze podium, team-color badges.
 */
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { getTeamColor, getRankStyle, getRankIcon } from "./championshipUtils";
import { getTeamMeta } from "@/lib/teamLogos";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";
import { TeamEntityToken } from "@/components/entities/TeamEntityToken";

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
  const { t } = useTranslation();

  if (constructorsStandings.length === 0) {
    return <EmptyMinimal icon="🏎️" message={t("championship.constructors.no_data")} />;
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
        const teamMeta = getTeamMeta(constructor?.name || constructor?.constructorId);
        const logoSrc = teamMeta.logo_url || teamMeta.logo;

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

              {/* Team logo */}
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt={constructor?.name}
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-10 w-10 flex-shrink-0 rounded-lg object-contain p-1"
                  style={{ backgroundColor: teamColor }}
                  onError={(e) => {
                    if (teamMeta.logo) (e.currentTarget as HTMLImageElement).src = teamMeta.logo;
                  }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: teamColor }}
                >
                  <span className="font-data text-[0.5625rem] font-bold text-white">
                    {teamMeta.abbr}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <TeamEntityToken
                  teamId={constructor?.constructorId}
                  name={constructor?.name}
                  nationality={constructor?.nationality}
                  className="font-display text-xs tracking-normal"
                />
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
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">
                  {t("championship.constructors.pts")}
                </p>
              </div>
            </div>

            {/* Wins */}
            {parseInt(entry.wins) > 0 && (
              <div className="mt-1.5 ml-[4.25rem] flex items-center gap-1">
                <Trophy className="w-3 h-3 text-pk-gold" />
                <span className="font-data text-[0.5rem] text-pk-gold">
                  {t("championship.constructors.wins", { count: parseInt(entry.wins) })}
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
