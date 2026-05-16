import {
  Trophy, Medal, Award, Flag, Zap, Timer, Calendar,
  FileText, DollarSign, MapPin, Ruler, Car, Play, Target, Hash,
  Shield, Info
} from "lucide-react";

// Team colors mapping
const teamColors = {
  "mclaren": { primary: "#FF8000", secondary: "#FF8000" },
  "mercedes": { primary: "#27F4D2", secondary: "#00A19C" },
  "ferrari": { primary: "#E80020", secondary: "#DC0000" },
  "red_bull": { primary: "#3671C6", secondary: "#1E5BC6" },
  "aston_martin": { primary: "#229971", secondary: "#006F62" },
  "alpine": { primary: "#0093CC", secondary: "#0078C1" },
  "williams": { primary: "#64C4FF", secondary: "#005AFF" },
  "rb": { primary: "#6692FF", secondary: "#1E41FF" },
  "haas": { primary: "#B6BABD", secondary: "#FFFFFF" },
  "sauber": { primary: "#52E252", secondary: "#00E701" },
  "cadillac": { primary: "#C4A747", secondary: "#1C1C1C" },
};

export function getTeamColors(teamId) {
  const id = teamId?.toLowerCase().replace(/\s+/g, '_');
  return teamColors[id] || { primary: "#666666", secondary: "#444444" };
}

// Icon mapping for facts
export const factIcons = {
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

export function InfoRow({ label, value }) {
  return (
    <div>
      <p className="font-body text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="font-body text-sm text-white">{value || "-"}</p>
    </div>
  );
}

export function StatCard({ value, label, color, bgColor }) {
  return (
    <div className={`p-3 rounded-lg ${bgColor} text-center`}>
      <p className={`font-data text-2xl ${color}`}>{value}</p>
      <p className="font-body text-[10px] text-gray-500 uppercase">{label}</p>
    </div>
  );
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
