/**
 * Shared helpers for DriverDetail sub-components.
 * Broadcast Premium: pk-* tokens for InfoRow, StatCard.
 */
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Medal,
  Award,
  Flag,
  Zap,
  Timer,
  Calendar,
  FileText,
  DollarSign,
  MapPin,
  Ruler,
  Car,
  Play,
  Target,
  Hash,
  Shield,
  Info,
} from "lucide-react";

// Team colors mapping
export interface TeamColors {
  primary: string;
  secondary: string;
}

const teamColors: Record<string, TeamColors> = {
  mclaren: { primary: "#FF8000", secondary: "#FF8000" },
  mercedes: { primary: "#27F4D2", secondary: "#00A19C" },
  ferrari: { primary: "#E80020", secondary: "#DC0000" },
  red_bull: { primary: "#3671C6", secondary: "#1E5BC6" },
  aston_martin: { primary: "#229971", secondary: "#006F62" },
  alpine: { primary: "#0093CC", secondary: "#0078C1" },
  williams: { primary: "#64C4FF", secondary: "#005AFF" },
  rb: { primary: "#6692FF", secondary: "#1E41FF" },
  haas: { primary: "#B6BABD", secondary: "#FFFFFF" },
  sauber: { primary: "#52E252", secondary: "#00E701" },
  cadillac: { primary: "#C4A747", secondary: "#1C1C1C" },
};

export function getTeamColors(teamId: string | undefined): TeamColors {
  const id = teamId?.toLowerCase().replace(/\s+/g, "_");
  return (id && teamColors[id]) || { primary: "#5F6673", secondary: "#3A3F48" };
}

// Icon mapping for facts
export const factIcons: Record<string, LucideIcon> = {
  trophy: Trophy,
  flag: Flag,
  medal: Medal,
  zap: Zap,
  timer: Timer,
  award: Award,
  file: FileText,
  dollar: DollarSign,
  calendar: Calendar,
  map: MapPin,
  ruler: Ruler,
  car: Car,
  play: Play,
  target: Target,
  hash: Hash,
  shield: Shield,
  info: Info,
};

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
}

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div>
      <p className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider">{label}</p>
      <p className="text-sm">{value || "-"}</p>
    </div>
  );
}

interface StatCardProps {
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
}

export function StatCard({ value, label, color, bgColor }: StatCardProps) {
  return (
    <div className={`p-3 rounded-lg border border-white/[0.06] ${bgColor} text-center`}>
      <p className={`font-data text-xl font-bold ${color}`}>{value}</p>
      <p className="font-data text-[0.5rem] text-pk-titane uppercase">{label}</p>
    </div>
  );
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
