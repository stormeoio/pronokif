/**
 * ComparisonComponents — Shared sub-components for DriverComparison.
 * Broadcast Premium: pk-surface cards, team-color bars, pk-emerald winners.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { haptic } from "@/lib/haptics";

// Map team IDs (snake_case) to team colors
const teamIdColors: Record<string, string> = {
  mclaren: "#FF8000",
  mercedes: "#27F4D2",
  ferrari: "#E80020",
  red_bull: "#3671C6",
  aston_martin: "#229971",
  alpine: "#0093CC",
  williams: "#64C4FF",
  rb: "#6692FF",
  haas: "#B6BABD",
  sauber: "#52E252",
  cadillac: "#C4A747",
};

export function getTeamColor(teamId: string | undefined): string {
  const id = teamId?.toLowerCase().replace(/\s+/g, "_");
  return (id && teamIdColors[id]) || "#5F6673";
}

/* ── Driver Card ──────────────────────────────────────── */

interface DriverCardProps {
  driver: Record<string, any>;
}

export function DriverCard({ driver }: DriverCardProps) {
  const navigate = useNavigate();
  const teamColor = getTeamColor(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};

  return (
    <motion.div
      className="bg-pk-surface border border-white/[0.08] rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/[0.03]"
      onClick={() => {
        haptic("light");
        navigate(`/driver/${driver.id}`);
      }}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") navigate(`/driver/${driver.id}`);
      }}
      role="button"
      tabIndex={0}
      aria-label={`Voir la fiche de ${driver.full_name}`}
      style={{ borderColor: `${teamColor}30` }}
      whileTap={{ scale: 0.97 }}
    >
      <div className="flex flex-col items-center">
        <div
          className="w-14 h-14 rounded-full overflow-hidden mb-2"
          style={{ borderWidth: "2px", borderStyle: "solid", borderColor: teamColor }}
        >
          <img
            src={driver.photo_url}
            alt={driver.full_name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <p className="font-display text-xs text-center">{driver.first_name}</p>
        <p className="font-display text-sm text-center" style={{ color: teamColor }}>
          {driver.last_name?.toUpperCase()}
        </p>
        <p className="font-data text-[0.5rem] text-pk-titane mt-0.5">{driver.team}</p>
        <div className="flex gap-3 mt-2">
          <div className="text-center">
            <p className="font-data text-sm text-pk-gold">{f1Stats.world_championships || 0}</p>
            <p className="font-data text-[0.4375rem] text-pk-titane uppercase">Titres</p>
          </div>
          <div className="text-center">
            <p className="font-data text-sm">{f1Stats.wins || 0}</p>
            <p className="font-data text-[0.4375rem] text-pk-titane uppercase">Vict.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Comparison Bar ───────────────────────────────────── */

interface ComparisonBarProps {
  label: string;
  icon: LucideIcon;
  value1: number;
  value2: number;
  color1: string;
  color2: string;
}

export function ComparisonBar({
  label,
  icon: Icon,
  value1,
  value2,
  color1,
  color2,
}: ComparisonBarProps) {
  const total = Math.max(value1 + value2, 1);
  const percent1 = (value1 / total) * 100;
  const percent2 = (value2 / total) * 100;
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-data text-sm ${winner === 1 ? "text-pk-piste" : "text-pk-titane"}`}>
          {value1}
        </span>
        <span className="font-data text-[0.5625rem] text-pk-titane flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </span>
        <span className={`font-data text-sm ${winner === 2 ? "text-pk-piste" : "text-pk-titane"}`}>
          {value2}
        </span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-pk-anthracite">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${percent1}%`, backgroundColor: color1 }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${percent2}%`, backgroundColor: color2 }}
        />
      </div>
    </motion.div>
  );
}

/* ── Efficiency Card ──────────────────────────────────── */

interface EfficiencyCardProps {
  label: string;
  value1: number;
  value2: number;
  driver1: Record<string, any>;
  driver2: Record<string, any>;
  suffix: string;
}

export function EfficiencyCard({
  label,
  value1,
  value2,
  driver1,
  driver2,
  suffix,
}: EfficiencyCardProps) {
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;

  return (
    <div className="bg-pk-anthracite/60 border border-white/[0.06] rounded-lg p-3">
      <p className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className={`font-data text-base ${winner === 1 ? "text-pk-emerald" : ""}`}>
            {value1}
            {suffix}
          </p>
          <p className="font-data text-[0.4375rem] text-pk-titane">{driver1.code}</p>
        </div>
        <div className="font-data text-[0.5rem] text-pk-titane">VS</div>
        <div className="text-center">
          <p className={`font-data text-base ${winner === 2 ? "text-pk-emerald" : ""}`}>
            {value2}
            {suffix}
          </p>
          <p className="font-data text-[0.4375rem] text-pk-titane">{driver2.code}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Verdict Generator ────────────────────────────────── */

export function getVerdict(
  comparison: {
    stats_comparison: Record<string, { driver1: number; driver2: number; winner: string }>;
  },
  d1: { first_name: string; last_name: string },
  d2: { first_name: string; last_name: string },
): string {
  const stats = comparison.stats_comparison;
  let d1Wins = 0;
  let d2Wins = 0;

  Object.values(stats).forEach((stat) => {
    if (stat.winner === "driver1") d1Wins++;
    else if (stat.winner === "driver2") d2Wins++;
  });

  if (d1Wins > d2Wins) {
    return `${d1.first_name} ${d1.last_name} leads in ${d1Wins} categories out of 7. Their experience and stats make them the favorite in a direct matchup.`;
  } else if (d2Wins > d1Wins) {
    return `${d2.first_name} ${d2.last_name} leads in ${d2Wins} categories out of 7. Their statistical profile is stronger in this comparison.`;
  } else {
    return `These two drivers are very close! The result of a head-to-head would depend on the circuit and weekend conditions.`;
  }
}
