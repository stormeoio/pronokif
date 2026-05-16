import { Check, AlertTriangle, Timer, Target, Users, X, Zap } from "lucide-react";
import { TEAM_COLORS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Driver {
  id: number;
  name: string;
  team: string;
  number: number;
}

interface BonusPanelProps {
  safetyCar: boolean;
  setSafetyCar: (value: boolean) => void;
  dnfDrivers: number[];
  setDnfDrivers: (drivers: number[]) => void;
  fastestLap: number | null;
  firstCornerLeader: number | null;
  drivers: Driver[];
  setSelectionMode: (mode: string) => void;
}

export function BonusPanel({
  safetyCar,
  setSafetyCar,
  dnfDrivers,
  fastestLap,
  firstCornerLeader,
  drivers,
  setSelectionMode,
}: BonusPanelProps) {
  return (
    <div className="space-y-4 mb-6">
      <h3 className="font-heading text-lg uppercase text-yellow-500 flex items-center gap-2">
        <Zap className="w-5 h-5" /> Options Bonus
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Safety Car */}
        <div
          className={`p-4 rounded-lg border-2 transition-all ${safetyCar ? "border-yellow-500 bg-yellow-500/20" : "border-gray-600 bg-gray-800/50"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-6 h-6 ${safetyCar ? "text-yellow-400" : "text-gray-500"}`}
              />
              <Label className="font-heading text-white text-sm uppercase">Safety Car</Label>
            </div>
            <Switch checked={safetyCar} onCheckedChange={setSafetyCar} />
          </div>
          <p
            className={`font-data text-xs mt-2 ${safetyCar ? "text-yellow-400" : "text-gray-500"}`}
          >
            {safetyCar ? "✓ OUI" : "✗ NON"}
          </p>
        </div>

        {/* DNF Drivers */}
        <button
          onClick={() => setSelectionMode("dnf_select")}
          className={`p-4 rounded-lg text-left border-2 transition-all ${dnfDrivers.length > 0 ? "border-red-500 bg-red-500/20" : "border-gray-600 bg-gray-800/50 hover:border-red-500/50"}`}
        >
          <div className="flex items-center gap-2">
            <Users
              className={`w-6 h-6 ${dnfDrivers.length > 0 ? "text-red-400" : "text-gray-500"}`}
            />
            <span className="font-heading text-white text-sm uppercase">DNF Pilotes</span>
          </div>
          <p
            className={`font-data text-xs mt-2 ${dnfDrivers.length > 0 ? "text-red-400" : "text-gray-500"}`}
          >
            {dnfDrivers.length} selectionne(s) &rarr;
          </p>
        </button>
      </div>

      {/* Fastest Lap */}
      <div className="bonus-bet-card p-4 rounded-lg border-2 border-purple-500/30 bg-purple-500/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Timer className="w-6 h-6 text-purple-400" />
            <span className="font-heading text-white text-base uppercase">Meilleur Tour</span>
          </div>
          {fastestLap && <Check className="w-5 h-5 text-green-400" />}
        </div>
        <Button
          onClick={() => setSelectionMode("fastest_lap")}
          className={`w-full h-12 text-base ${fastestLap ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white" : "bg-purple-500/20 border-2 border-purple-500 text-purple-300 hover:bg-purple-500/30"}`}
        >
          {fastestLap ? drivers.find((d) => d.id === fastestLap)?.name : "→ Choisir un pilote"}
        </Button>
      </div>

      {/* First Corner Leader */}
      <div className="bonus-bet-card p-4 rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-400" />
            <span className="font-heading text-white text-base uppercase">Leader 1er Virage</span>
          </div>
          {firstCornerLeader && <Check className="w-5 h-5 text-green-400" />}
        </div>
        <Button
          onClick={() => setSelectionMode("first_corner")}
          className={`w-full h-12 text-base ${firstCornerLeader ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white" : "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300 hover:bg-cyan-500/30"}`}
        >
          {firstCornerLeader
            ? drivers.find((d) => d.id === firstCornerLeader)?.name
            : "→ Choisir un pilote"}
        </Button>
      </div>
    </div>
  );
}

interface DnfPanelProps {
  dnfDrivers: number[];
  setDnfDrivers: (drivers: number[]) => void;
  drivers: Driver[];
  setSelectionMode: (mode: string) => void;
}

export function DnfPanel({ dnfDrivers, setDnfDrivers, drivers, setSelectionMode }: DnfPanelProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg uppercase text-red-500 flex items-center gap-2">
            <Users className="w-5 h-5" /> Pilotes DNF
          </h3>
          <p className="font-body text-xs text-gray-400">
            Selectionne les pilotes qui ont abandonne
          </p>
        </div>
        <Button
          onClick={() => setSelectionMode("bonus")}
          variant="outline"
          size="sm"
          className="border-gray-600"
        >
          Retour
        </Button>
      </div>

      {dnfDrivers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {dnfDrivers.map((driverId) => {
            const driver = drivers.find((d) => d.id === driverId);
            return (
              <div
                key={driverId}
                className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full"
              >
                <span className="font-body text-sm text-red-400">{driver?.name}</span>
                <button onClick={() => setDnfDrivers(dnfDrivers.filter((d) => d !== driverId))}>
                  <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DriverGridProps {
  drivers: Driver[];
  isDriverSelected: (driverId: number) => boolean;
  getDriverPosition: (driverId: number) => number | null;
  handleDriverSelect: (driverId: number) => void;
}

export function DriverGrid({
  drivers,
  isDriverSelected,
  getDriverPosition,
  handleDriverSelect,
}: DriverGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {drivers.map((driver) => {
        const selected = isDriverSelected(driver.id);
        const position = getDriverPosition(driver.id);
        const teamColor = (TEAM_COLORS as Record<string, string>)[driver.team] || "#666";

        return (
          <button
            key={driver.id}
            onClick={() => handleDriverSelect(driver.id)}
            className={`driver-card-gaming relative p-4 rounded-lg border-l-4 transition-all text-left ${selected ? "selected" : ""}`}
            style={{ borderLeftColor: teamColor }}
          >
            {position && (
              <div
                className={`absolute top-2 right-2 w-7 h-7 rounded flex items-center justify-center border ${
                  position <= 3
                    ? position === 1
                      ? "position-1-gaming"
                      : position === 2
                        ? "position-2-gaming"
                        : "position-3-gaming"
                    : "bg-gradient-to-b from-orange-500 to-orange-700 border-orange-400"
                }`}
              >
                <span
                  className={`font-heading text-sm ${position <= 3 && position !== 3 ? "text-black" : "text-white"}`}
                >
                  {position}
                </span>
              </div>
            )}
            {selected && !position && (
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-b from-green-500 to-green-700 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center font-heading text-lg border-2"
                style={{
                  backgroundColor: teamColor + "30",
                  borderColor: teamColor,
                  color: teamColor,
                }}
              >
                {driver.number}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm uppercase tracking-tight text-white truncate">
                  {driver.name}
                </p>
                <p className="font-body text-xs text-gray-500 truncate">{driver.team}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
