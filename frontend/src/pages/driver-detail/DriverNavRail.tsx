/**
 * DriverNavRail — thin vertical sidebar of driver avatars.
 *
 * Lets the user jump straight to any driver's profile (complementing the
 * left/right swipe used for sequential navigation). Teammates are grouped by
 * écurie via a subtle team-color tick. The active driver gets the Broadcast
 * Premium red selection glow (DESIGN.md). Sticky so it stays in reach while
 * the profile scrolls.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { getTeamColors } from "./driverHelpers";
import type { RosterDriver } from "./useDriverRoster";
import { resolveDriverPhotoUrl } from "@/lib/driverPhotos";

interface DriverNavRailProps {
  drivers: RosterDriver[];
  currentId: string | undefined;
  onSelect: (id: string, direction: "next" | "prev") => void;
}

export function DriverNavRail({ drivers, currentId, onSelect }: DriverNavRailProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const currentIndex = drivers.findIndex((d) => d.id === currentId);

  // Keep the active avatar centered as the user moves between drivers.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentId]);

  if (drivers.length === 0) return null;

  return (
    <nav
      className="sticky top-0 z-30 h-[100dvh] w-14 shrink-0 flex flex-col items-center
                 bg-pk-anthracite/70 backdrop-blur-xl border-r border-white/[0.08]"
      aria-label={t("driver_detail.nav_drivers_aria")}
      data-testid="driver-nav-rail"
    >
      <div className="flex-1 w-full overflow-y-auto scrollbar-hide py-3 flex flex-col items-center gap-2.5 pb-24">
        {drivers.map((d, i) => {
          const colors = getTeamColors(d.team_id);
          const active = d.id === currentId;
          const direction: "next" | "prev" = i > currentIndex ? "next" : "prev";
          const photo = resolveDriverPhotoUrl(d, { mode: "dark" });
          // First driver of a team → top spacer + team tick (écurie grouping).
          const prev = drivers[i - 1];
          const isTeamStart = i > 0 && (prev.team_id || prev.team) !== (d.team_id || d.team);

          return (
            <div key={d.id} className="flex flex-col items-center">
              {isTeamStart && (
                <span
                  className="mb-2.5 h-px w-5 rounded-full"
                  style={{ backgroundColor: `${colors.primary}40` }}
                  aria-hidden
                />
              )}
              <button
                ref={active ? activeRef : undefined}
                onClick={() => {
                  if (!active) onSelect(d.id, direction);
                }}
                className="relative h-10 w-10 shrink-0 rounded-full focus:outline-none
                           focus-visible:ring-2 focus-visible:ring-pk-red group"
                aria-current={active ? "true" : undefined}
                aria-label={`${d.first_name} ${d.last_name}`}
                title={`${d.first_name} ${d.last_name}`}
                data-testid={`rail-driver-${d.id}`}
              >
                {/* Selection ring: red glow when active (DESIGN), team color otherwise */}
                <motion.span
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: active
                      ? "0 0 0 2px #E10600, 0 0 12px rgba(225,6,0,0.5)"
                      : `0 0 0 1.5px ${colors.primary}55`,
                  }}
                  animate={{ scale: active ? 1.06 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                />
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className={`h-10 w-10 rounded-full object-cover object-top bg-pk-surface transition-opacity ${
                    active ? "opacity-100" : "opacity-50 group-hover:opacity-90"
                  }`}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
                {/* Tiny number badge */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 min-w-[14px] px-1 rounded-full
                             font-data text-[8px] font-bold leading-[14px] text-center text-white"
                  style={{ backgroundColor: active ? "#E10600" : "rgba(11,13,18,0.85)" }}
                  aria-hidden
                >
                  {d.number}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
