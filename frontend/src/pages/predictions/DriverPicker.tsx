import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TEAM_COLORS } from "@/lib/constants";
import { haptic } from "@/lib/haptics";

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

function driverInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
  const { t } = useTranslation();

  const handleSelect = (driverId: string) => {
    haptic("selection");
    onDriverSelect(driverId);
  };

  return (
    <section className="space-y-3" data-testid="driver-picker">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-data text-[0.5rem] uppercase tracking-[0.16em] text-pk-red">
            {t("predictions.form.driver_grid")}
          </p>
          <h3 className="font-display text-[0.95rem] uppercase text-pk-piste">
            {t("predictions.form.pick_driver")}
          </h3>
        </div>
        <span className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-data text-[0.5625rem] uppercase text-pk-titane">
          {drivers.length} {t("predictions.form.drivers_short")}
        </span>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-2.5"
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
              type="button"
              onClick={() => handleSelect(driver.id)}
              aria-pressed={selected}
              variants={cardVariants}
              whileTap={{ scale: 0.94 }}
              className={`
                relative flex min-h-[82px] items-center gap-2.5
                overflow-hidden p-3 rounded-md
                border transition-all duration-pk-short ease-pk-enter
                ${
                  selected
                    ? "border-pk-red/70 bg-pk-red-subtle shadow-[0_0_18px_rgba(225,6,0,0.18)]"
                    : "border-white/[0.08] bg-pk-surface hover:-translate-y-0.5 hover:border-white/[0.15]"
                }
              `}
              data-testid={`driver-${driver.id}`}
            >
              <div
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: teamColor }}
                aria-hidden="true"
              />

              <span
                className={`ml-1 flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md border font-data
                  ${
                    selected
                      ? "border-pk-red/35 bg-pk-red-subtle text-pk-red"
                      : "border-white/[0.08] bg-black/20 text-pk-piste"
                  }
                  transition-colors duration-pk-short`}
                style={{ boxShadow: selected ? `inset 0 -2px 0 ${teamColor}` : undefined }}
              >
                <span className="text-[0.85rem] leading-none">{driverInitials(driver.name)}</span>
                <span className="mt-1 text-[0.5rem] leading-none text-pk-titane">
                  #{driver.number}
                </span>
              </span>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[0.8125rem] font-semibold leading-tight text-pk-piste">
                  {driver.name}
                </p>
                <p className="mt-1 truncate font-data text-[0.5rem] uppercase tracking-[0.08em] text-pk-titane">
                  {driver.team}
                </p>
              </div>

              {position && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pk-red font-data text-[0.625rem] font-bold text-white shadow-[0_0_8px_rgba(225,6,0,0.5)]"
                >
                  {position}
                </motion.span>
              )}

              <span
                className={`flex min-w-7 items-center justify-center font-display text-[1rem]
                  ${selected ? "text-pk-red" : "text-pk-titane/50"}
                  transition-colors duration-pk-short`}
              >
                {position ? `P${position}` : selected ? <Check className="h-4 w-4" /> : null}
              </span>

              {selected && (
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: 18 }}
                  className="absolute bottom-1.5 left-1/2 h-[2px] -translate-x-1/2 rounded-sm bg-pk-red"
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}
