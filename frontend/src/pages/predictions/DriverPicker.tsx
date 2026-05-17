import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { TEAM_COLORS } from "@/lib/constants";
import { haptic } from "@/lib/haptics";

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
 * Reusable driver picker grid with team-colored left borders,
 * haptic feedback on selection, and scale micro-animations.
 */
export default function DriverPicker({
  drivers,
  isDriverSelected,
  onDriverSelect,
  getPosition,
}: DriverPickerProps) {
  const handleSelect = (driverId: string) => {
    haptic("selection");
    onDriverSelect(driverId);
  };

  return (
    <motion.div
      className="grid grid-cols-2 gap-2"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.03 } }, hidden: {} }}
    >
      {drivers.map((driver) => {
        const selected = isDriverSelected(driver.id);
        const teamColor = TEAM_COLORS[driver.team] || "#6B7280";
        const position = getPosition ? getPosition(driver.id) : null;

        return (
          <motion.button
            key={driver.id}
            onClick={() => handleSelect(driver.id)}
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 10 },
              visible: { opacity: 1, scale: 1, y: 0 },
            }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.03, y: -2 }}
            className={`relative p-3 rounded-xl border-2 transition-colors ${
              selected
                ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/10"
                : "border-gray-700 bg-white/5 hover:bg-white/10"
            }`}
            style={{ borderLeftColor: teamColor, borderLeftWidth: "4px" }}
            data-testid={`driver-${driver.id}`}
          >
            {position && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md animate-scale-in">
                {position}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`font-data text-lg ${selected ? "text-cyan-400" : "text-gray-500"}`}>
                {driver.number}
              </span>
              <div className="text-left">
                <p className={`font-body text-sm ${selected ? "text-cyan-300" : "text-white"}`}>
                  {driver.name}
                </p>
                <p className="font-body text-xs text-gray-500">{driver.team}</p>
              </div>
            </div>
            {selected && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="absolute top-2 right-2"
              >
                <Check className="w-4 h-4 text-cyan-400" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
