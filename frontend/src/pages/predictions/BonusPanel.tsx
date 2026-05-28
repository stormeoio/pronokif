import { motion } from "framer-motion";
import { AlertTriangle, Timer, Flag, X, Zap } from "lucide-react";
import type { Driver } from "./DriverPicker";
import { haptic } from "@/lib/haptics";
import { fadeUp, easing, duration } from "@/lib/motion";

// ----------------------------------------------------------- types ---

export interface BonusPanelProps {
  activeTab: string;
  drivers: Driver[];
  setSelectionMode: (mode: string) => void;
  safetyCar: boolean | null;
  setSafetyCar: (v: boolean | null) => void;
  fastestLap: string | null;
  firstCorner: string | null;
  noDnf: boolean;
  setNoDnf: (v: boolean) => void;
  dnfDrivers: string[];
  setDnfDrivers: (v: string[]) => void;
}

// ----------------------------------------------------------- component ---

export default function BonusPanel({
  activeTab,
  drivers,
  setSelectionMode,
  safetyCar,
  setSafetyCar,
  fastestLap,
  firstCorner,
  noDnf,
  setNoDnf,
  dnfDrivers,
  setDnfDrivers,
}: BonusPanelProps) {
  return (
    <motion.div
      className="space-y-4 pt-4 border-t border-white/[0.08]"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      {/* Section title */}
      <div className="flex items-center gap-2">
        <Zap size={16} strokeWidth={1.5} className="text-pk-amber" />
        <h3 className="font-display text-[0.875rem] uppercase">
          Questions Bonus{activeTab === "sprint" ? " Sprint" : ""}
        </h3>
        <span className="font-mono text-[0.5625rem] text-pk-titane">+50 pts</span>
      </div>

      {/* Safety Car */}
      <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06] rounded-md">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} strokeWidth={1.5} className="text-pk-amber" />
          <span className="text-[0.8125rem]">Safety Car</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              haptic("selection");
              setSafetyCar(true);
            }}
            className={`px-3.5 py-1.5 rounded-full font-mono text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                safetyCar === true
                  ? "bg-pk-emerald/20 border border-pk-emerald/30 text-pk-emerald"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
          >
            Oui
          </button>
          <button
            onClick={() => {
              haptic("selection");
              setSafetyCar(false);
            }}
            className={`px-3.5 py-1.5 rounded-full font-mono text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                safetyCar === false
                  ? "bg-pk-red-subtle border border-[rgba(225,6,0,0.2)] text-pk-red"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
          >
            Non
          </button>
        </div>
      </div>

      {/* Fastest Lap */}
      <button
        onClick={() =>
          setSelectionMode(activeTab === "sprint" ? "sprint_fastest_lap" : "fastest_lap")
        }
        className="w-full flex items-center justify-between p-3
          bg-white/[0.03] border border-white/[0.06] rounded-md
          hover:border-white/[0.12] transition-all duration-pk-short"
      >
        <div className="flex items-center gap-2">
          <Timer size={16} strokeWidth={1.5} className="text-pk-amber" />
          <span className="text-[0.8125rem]">Meilleur tour</span>
        </div>
        <span className="font-mono text-[0.75rem] text-pk-red">
          {fastestLap
            ? drivers.find((d) => d.id === fastestLap)?.name || "Sélectionné"
            : "Sélectionner →"}
        </span>
      </button>

      {/* First Corner Leader */}
      <button
        onClick={() =>
          setSelectionMode(activeTab === "sprint" ? "sprint_first_corner" : "first_corner")
        }
        className="w-full flex items-center justify-between p-3
          bg-white/[0.03] border border-white/[0.06] rounded-md
          hover:border-white/[0.12] transition-all duration-pk-short"
      >
        <div className="flex items-center gap-2">
          <Flag size={16} strokeWidth={1.5} className="text-pk-emerald" />
          <span className="text-[0.8125rem]">Leader au virage 1</span>
        </div>
        <span className="font-mono text-[0.75rem] text-pk-red">
          {firstCorner
            ? drivers.find((d) => d.id === firstCorner)?.name || "Sélectionné"
            : "Sélectionner →"}
        </span>
      </button>

      {/* DNF */}
      <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-md space-y-2.5">
        <div className="flex items-center gap-2">
          <X size={16} strokeWidth={1.5} className="text-pk-red" />
          <span className="text-[0.8125rem]">Abandons</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              haptic("selection");
              setNoDnf(true);
              setDnfDrivers([]);
            }}
            className={`flex-1 py-2 rounded-full font-mono text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                noDnf
                  ? "bg-pk-emerald/20 border border-pk-emerald/30 text-pk-emerald"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
          >
            Pas d'abandon
          </button>
          <button
            onClick={() => {
              haptic("selection");
              setNoDnf(false);
              setSelectionMode(activeTab === "sprint" ? "sprint_dnf_select" : "dnf_select");
            }}
            className={`flex-1 py-2 rounded-full font-mono text-[0.6875rem] uppercase
              transition-all duration-pk-short
              ${
                !noDnf && dnfDrivers.length > 0
                  ? "bg-pk-red-subtle border border-[rgba(225,6,0,0.2)] text-pk-red"
                  : "bg-white/[0.03] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
          >
            {dnfDrivers.length > 0 ? `${dnfDrivers.length} pilote(s)` : "Sélectionner →"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
