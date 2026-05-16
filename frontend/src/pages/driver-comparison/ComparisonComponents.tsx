import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { TEAM_COLORS } from "@/lib/constants";

// Map team IDs (snake_case) to team colors
const teamIdColors: Record<string, string> = {
  "mclaren": "#FF8000",
  "mercedes": "#27F4D2",
  "ferrari": "#E80020",
  "red_bull": "#3671C6",
  "aston_martin": "#229971",
  "alpine": "#0093CC",
  "williams": "#64C4FF",
  "rb": "#6692FF",
  "haas": "#B6BABD",
  "sauber": "#52E252",
  "cadillac": "#C4A747",
};

export function getTeamColor(teamId: string | undefined): string {
  const id = teamId?.toLowerCase().replace(/\s+/g, '_');
  return (id && teamIdColors[id]) || "#666666";
}

// Driver Card Component
interface DriverCardProps {
  driver: Record<string, any>;
}

export function DriverCard({ driver }: DriverCardProps) {
  const navigate = useNavigate();
  const teamColor = getTeamColor(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};

  return (
    <div
      className="card-arcade p-3 cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => navigate(`/driver/${driver.id}`)}
      style={{ borderColor: `${teamColor}50` }}
    >
      <div className="flex flex-col items-center">
        <div
          className="w-16 h-16 rounded-full overflow-hidden border-3 mb-2"
          style={{ borderColor: teamColor, borderWidth: '3px' }}
        >
          <img src={driver.photo_url} alt={driver.full_name} className="w-full h-full object-cover" />
        </div>
        <p className="font-heading text-sm text-white text-center">{driver.first_name}</p>
        <p className="font-heading text-base text-center" style={{ color: teamColor }}>
          {driver.last_name?.toUpperCase()}
        </p>
        <p className="font-body text-[10px] text-gray-500 mt-1">{driver.team}</p>
        <div className="flex gap-3 mt-2">
          <div className="text-center">
            <p className="font-data text-sm text-yellow-400">{f1Stats.world_championships || 0}</p>
            <p className="font-body text-[8px] text-gray-500">TITRES</p>
          </div>
          <div className="text-center">
            <p className="font-data text-sm text-white">{f1Stats.wins || 0}</p>
            <p className="font-body text-[8px] text-gray-500">VICT.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Comparison Bar Component
interface ComparisonBarProps {
  label: string;
  icon: LucideIcon;
  value1: number;
  value2: number;
  color1: string;
  color2: string;
}

export function ComparisonBar({ label, icon: Icon, value1, value2, color1, color2 }: ComparisonBarProps) {
  const total = Math.max(value1 + value2, 1);
  const percent1 = (value1 / total) * 100;
  const percent2 = (value2 / total) * 100;
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-data text-sm ${winner === 1 ? 'text-white' : 'text-gray-500'}`}>{value1}</span>
        <span className="font-body text-xs text-gray-400 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
        <span className={`font-data text-sm ${winner === 2 ? 'text-white' : 'text-gray-500'}`}>{value2}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        <div className="h-full transition-all duration-500" style={{ width: `${percent1}%`, backgroundColor: color1 }} />
        <div className="h-full transition-all duration-500" style={{ width: `${percent2}%`, backgroundColor: color2 }} />
      </div>
    </div>
  );
}

// Efficiency Card Component
interface EfficiencyCardProps {
  label: string;
  value1: number;
  value2: number;
  driver1: Record<string, any>;
  driver2: Record<string, any>;
  suffix: string;
}

export function EfficiencyCard({ label, value1, value2, driver1, driver2, suffix }: EfficiencyCardProps) {
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;

  return (
    <div className="bg-gray-800/30 rounded-lg p-3">
      <p className="font-body text-[10px] text-gray-500 uppercase mb-2">{label}</p>
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className={`font-data text-lg ${winner === 1 ? 'text-green-400' : 'text-white'}`}>{value1}{suffix}</p>
          <p className="font-body text-[9px] text-gray-500">{driver1.code}</p>
        </div>
        <div className="text-gray-600 font-body text-xs">VS</div>
        <div className="text-center">
          <p className={`font-data text-lg ${winner === 2 ? 'text-green-400' : 'text-white'}`}>{value2}{suffix}</p>
          <p className="font-body text-[9px] text-gray-500">{driver2.code}</p>
        </div>
      </div>
    </div>
  );
}

// Generate verdict based on comparison
export function getVerdict(comparison: Record<string, any>, d1: Record<string, any>, d2: Record<string, any>): string {
  const stats = comparison.stats_comparison;
  let d1Wins = 0;
  let d2Wins = 0;

  Object.values(stats).forEach((stat: any) => {
    if (stat.winner === "driver1") d1Wins++;
    else if (stat.winner === "driver2") d2Wins++;
  });

  if (d1Wins > d2Wins) {
    return `${d1.first_name} ${d1.last_name} domine dans ${d1Wins} categories sur 7. Son experience et ses statistiques en font le favori dans une confrontation directe.`;
  } else if (d2Wins > d1Wins) {
    return `${d2.first_name} ${d2.last_name} domine dans ${d2Wins} categories sur 7. Son profil statistique est superieur dans cette comparaison.`;
  } else {
    return `Ces deux pilotes sont tres proches ! Le resultat d'une confrontation directe dependrait du circuit et des conditions du week-end.`;
  }
}
