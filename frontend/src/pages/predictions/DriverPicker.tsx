import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { TEAM_COLORS } from "@/lib/constants";
import { haptic } from "@/lib/haptics";
import { staggerContainer, STAGGER_DELAY, easing, duration } from "@/lib/motion";

// ----------------------------------------------------------- types ---

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

// ----------------------------------------------------------- variants ---

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ----------------------------------------------------------- component ---

/**
 * Reusable driver picker grid with team-colored left bar,
 * haptic feedback on selection, and scale micro-animations.
 * Broadcast Premium theme.
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
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.03 } },
      }}
    >
      {drivers.map((driver) => {
        const selected = isDriverSelected(driver.id);
        const teamColor = TEAM_COLORS[driver.team] || "#6B7280";
        const position = getPosition ? getPosition(driver.id) : null;

        return (
          <motion.button
            key={driver.id}
            onClick={() => handleSelect(driver.id)}
            variants={cardVariants}
            whileTap={{ scale: 0.92 }}
            className={`
              relative flex items-center gap-2.5
              p-3 rounded-md
              border transition-all duration-pk-short ease-pk-enter
              ${
                selected
                  ? "border-pk-red bg-pk-red-subtle shadow-[0_0_15px_rgba(225,6,0,0.15)]"
                  : "border-white/[0.08] bg-pk-surface hover:border-white/[0.15]"
              }
            `}
            data-testid={`driver-${driver.id}`}
          >
            {/* Team color bar */}
            <div
              className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-md"
              style={{ background: teamColor }}
            />

            {/* Number */}
            <span
              className={`font-mono text-[1.125rem] font-bold w-8 text-center ml-1
                ${selected ? "text-pk-red" : "text-pk-titane"}
                transition-colors duration-pk-short`}
            >
              {driver.number}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <p
                className={`font-semibold text-[0.8125rem] truncate
                  ${selected ? "text-pk-piste" : "text-pk-piste"}`}
              >
                {driver.name}
              </p>
              <p className="font-mono text-[0.5625rem] text-pk-titane truncate">{driver.team}</p>
            </div>

            {/* Position badge (when assigned) */}
            {position && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="absolute -top-1.5 -right-1.5
                  w-5 h-5 rounded-full
                  bg-pk-red text-white
                  flex items-center justify-center
                  font-mono text-[0.625rem] font-bold
                  shadow-[0_0_8px_rgba(225,6,0,0.5)]"
              >
                {position}
              </motion.span>
            )}

            {/* Position label (inside card) */}
            <span
              className={`font-display text-[1.25rem] min-w-6 text-center
                ${selected ? "text-pk-red" : "text-pk-titane"}
                transition-colors duration-pk-short`}
            >
              {position ? `P${position}` : "—"}
            </span>

            {/* Selection indicator line */}
            {selected && (
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: 12 }}
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2
                  h-[2px] bg-pk-red rounded-sm"
              />
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
