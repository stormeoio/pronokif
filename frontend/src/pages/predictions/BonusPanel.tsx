import { motion } from "framer-motion";
import { AlertTriangle, Timer, Flag, X, Zap } from "lucide-react";
import type { Driver } from "./DriverPicker";
import { Card, CardContent } from "@/components/ui/card";
import { haptic } from "@/lib/haptics";

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
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="game-card">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
            <Zap className={activeTab === "sprint" ? "text-yellow-400" : "text-cyan-400"} />
            Paris Bonus {activeTab === "sprint" ? "Sprint" : ""}
          </h3>

          {/* Safety Car */}
          <motion.div
            className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="font-body text-white">Safety Car</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { haptic("selection"); setSafetyCar(true); }}
                className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                  safetyCar === true ? "bg-green-500 text-white" : "bg-white/10 text-gray-400"
                }`}
              >
                OUI
              </button>
              <button
                onClick={() => { haptic("selection"); setSafetyCar(false); }}
                className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                  safetyCar === false ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"
                }`}
              >
                NON
              </button>
            </div>
          </motion.div>

          {/* Fastest Lap */}
          <motion.button
            onClick={() =>
              setSelectionMode(activeTab === "sprint" ? "sprint_fastest_lap" : "fastest_lap")
            }
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-purple-400" />
              <span className="font-body text-white">Meilleur tour</span>
            </div>
            <span className="font-body text-sm text-cyan-400">
              {fastestLap
                ? drivers.find((d) => d.id === fastestLap)?.name || "Sélectionné"
                : "Sélectionner →"}
            </span>
          </motion.button>

          {/* First Corner Leader */}
          <motion.button
            onClick={() =>
              setSelectionMode(activeTab === "sprint" ? "sprint_first_corner" : "first_corner")
            }
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-green-400" />
              <span className="font-body text-white">Leader T1</span>
            </div>
            <span className="font-body text-sm text-cyan-400">
              {firstCorner
                ? drivers.find((d) => d.id === firstCorner)?.name || "Sélectionné"
                : "Sélectionner →"}
            </span>
          </motion.button>

          {/* DNF */}
          <motion.div
            className="p-3 bg-white/5 rounded-xl space-y-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 text-red-400" />
                <span className="font-body text-white">Abandons (DNF)</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  haptic("selection");
                  setNoDnf(true);
                  setDnfDrivers([]);
                }}
                className={`flex-1 px-3 py-2 rounded-lg font-heading text-sm transition-all ${
                  noDnf ? "bg-green-500 text-white" : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                Pas de DNF
              </button>
              <button
                onClick={() => {
                  haptic("selection");
                  setNoDnf(false);
                  setSelectionMode(activeTab === "sprint" ? "sprint_dnf_select" : "dnf_select");
                }}
                className={`flex-1 px-3 py-2 rounded-lg font-heading text-sm transition-all ${
                  !noDnf && dnfDrivers.length > 0
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                {dnfDrivers.length > 0 ? `${dnfDrivers.length} pilote(s)` : "Sélectionner →"}
              </button>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
