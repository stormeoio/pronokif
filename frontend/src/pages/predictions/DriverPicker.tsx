import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TEAM_COLORS } from "@/lib/constants";
import { resolveDriverPhoto } from "@/lib/driverPhotos";
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

function driverLastName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

// ----------------------------------------------------------- component ---

/**
 * 3-column driver picker grid with avatar photos, team-color accent,
 * haptic feedback and Broadcast Premium styling.
 */
export default function DriverPicker({
  drivers,
  isDriverSelected,
  onDriverSelect,
  getPosition,
}: DriverPickerProps) {
  const { t } = useTranslation();

  // Track drivers whose photo failed to load → show initials fallback
  const [brokenPhotos, setBrokenPhotos] = useState<Set<string>>(() => new Set());

  const handleSelect = (driverId: string) => {
    haptic("selection");
    onDriverSelect(driverId);
  };

  const handlePhotoError = (driverId: string) => {
    setBrokenPhotos((prev) => {
      if (prev.has(driverId)) return prev;
      const next = new Set(prev);
      next.add(driverId);
      return next;
    });
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
        className="grid grid-cols-3 gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.025 } },
        }}
      >
        {drivers.map((driver) => {
          const selected = isDriverSelected(driver.id);
          const teamColor = TEAM_COLORS[driver.team] || "#6B7280";
          const position = getPosition ? getPosition(driver.id) : null;
          const photoUrl = resolveDriverPhoto(driver.id);
          const showPhoto = photoUrl && !brokenPhotos.has(driver.id);

          return (
            <motion.button
              key={driver.id}
              type="button"
              onClick={() => handleSelect(driver.id)}
              aria-pressed={selected}
              variants={cardVariants}
              whileTap={{ scale: 0.94 }}
              className={`
                relative flex flex-col items-center overflow-hidden
                rounded-md border pt-2.5 pb-2 px-1
                transition-all duration-pk-short ease-pk-enter
                ${
                  selected
                    ? "border-pk-red/70 bg-pk-red-subtle shadow-[0_0_18px_rgba(225,6,0,0.18)]"
                    : "border-white/[0.08] bg-pk-surface hover:border-white/[0.15]"
                }
              `}
              data-testid={`driver-${driver.id}`}
            >
              {/* Team color accent — top bar */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: teamColor }}
                aria-hidden="true"
              />

              {/* Position badge (top-right) */}
              {position && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-pk-red font-data text-[0.6rem] font-bold text-white shadow-[0_0_8px_rgba(225,6,0,0.5)]"
                >
                  {position}
                </motion.span>
              )}

              {/* Selected check (top-left) */}
              {selected && !position && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 left-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-pk-red"
                >
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </motion.span>
              )}

              {/* Avatar circle */}
              <div
                className={`relative mb-1.5 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-colors ${
                  selected ? "border-pk-red/60" : "border-white/[0.1]"
                }`}
                style={{
                  boxShadow: selected ? `0 0 12px ${teamColor}40` : undefined,
                }}
              >
                {showPhoto ? (
                  <img
                    src={photoUrl}
                    alt={driver.name}
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                    onError={() => handlePhotoError(driver.id)}
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-[0.8rem] font-bold"
                    style={{ background: `${teamColor}25`, color: teamColor }}
                  >
                    {driverInitials(driver.name)}
                  </span>
                )}
              </div>

              {/* Name + number */}
              <p className="w-full truncate text-center font-display text-[0.6rem] uppercase leading-tight text-pk-piste">
                {driverLastName(driver.name)}
              </p>
              <p className="mt-0.5 font-data text-[0.48rem] uppercase text-pk-titane">
                #{driver.number} ·{" "}
                {driver.team.length > 10 ? driver.team.slice(0, 8) + "…" : driver.team}
              </p>

              {/* Selection underline */}
              {selected && (
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: 16 }}
                  className="mt-1 h-[2px] rounded-sm bg-pk-red"
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}
