import { Check } from "lucide-react";
import { TEAM_COLORS } from "@/lib/constants";

export interface Driver {
  id: string;
  name: string;
  team: string;
  number: number | string;
}

interface DriverPickerProps {
  drivers: Driver[];
  isDriverSelected: (driverId: string) => boolean;
  onDriverSelect: (driverId: string) => void;
  getPosition?: (driverId: string) => number | null;
}

/**
 * Reusable driver picker grid with team-colored left borders
 * and optional position badges (for top-10 selections).
 */
export default function DriverPicker({
  drivers,
  isDriverSelected,
  onDriverSelect,
  getPosition,
}: DriverPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {drivers.map((driver) => {
        const selected = isDriverSelected(driver.id);
        const teamColor = TEAM_COLORS[driver.team] || "#6B7280";
        const position = getPosition ? getPosition(driver.id) : null;

        return (
          <button
            key={driver.id}
            onClick={() => onDriverSelect(driver.id)}
            className={`relative p-3 rounded-xl border-2 transition-all ${
              selected
                ? "border-cyan-400 bg-cyan-500/20"
                : "border-gray-700 bg-white/5 hover:bg-white/10"
            }`}
            style={{ borderLeftColor: teamColor, borderLeftWidth: "4px" }}
            data-testid={`driver-${driver.id}`}
          >
            {position && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {position}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-data text-lg text-gray-500">{driver.number}</span>
              <div className="text-left">
                <p className="font-body text-sm text-white">{driver.name}</p>
                <p className="font-body text-xs text-gray-500">{driver.team}</p>
              </div>
            </div>
            {selected && <Check className="absolute top-2 right-2 w-4 h-4 text-cyan-400" />}
          </button>
        );
      })}
    </div>
  );
}
