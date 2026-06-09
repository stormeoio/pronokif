import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import type { RosterTeam } from "./useTeamRoster";

interface TeamNavRailProps {
  teams: RosterTeam[];
  currentId: string | undefined;
  onSelect: (id: string, direction: "next" | "prev") => void;
}

export function TeamNavRail({ teams, currentId, onSelect }: TeamNavRailProps) {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const currentIndex = teams.findIndex((t) => t.id === currentId);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [currentId]);

  if (teams.length === 0) return null;

  return (
    <nav
      className="sticky top-0 z-30 h-[100dvh] w-14 shrink-0 flex flex-col items-center
                 bg-pk-anthracite/70 backdrop-blur-xl border-r border-white/[0.08]"
      aria-label={t("team_detail.nav_teams_aria", "Navigation écuries")}
      data-testid="team-nav-rail"
    >
      <div className="flex-1 w-full overflow-y-auto scrollbar-hide py-3 flex flex-col items-center gap-2.5 pb-24">
        {teams.map((team, i) => {
          const active = team.id === currentId;
          const direction: "next" | "prev" = i > currentIndex ? "next" : "prev";
          const color = team.meta.color;
          const logoSrc = team.meta.logo_url || team.meta.logo;

          return (
            <button
              key={team.id}
              ref={active ? activeRef : undefined}
              onClick={() => {
                if (!active) onSelect(team.id, direction);
              }}
              className="relative h-10 w-10 shrink-0 rounded-full focus:outline-none
                         focus-visible:ring-2 focus-visible:ring-pk-red group"
              aria-current={active ? "true" : undefined}
              aria-label={team.name}
              title={team.name}
              data-testid={`rail-team-${team.id}`}
            >
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  boxShadow: active
                    ? `0 0 0 2px ${color}, 0 0 12px ${color}80`
                    : `0 0 0 1.5px ${color}55`,
                }}
                animate={{ scale: active ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              />
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  loading="lazy"
                  className={`h-10 w-10 rounded-full object-contain p-1.5 bg-pk-surface transition-opacity ${
                    active ? "opacity-100" : "opacity-50 group-hover:opacity-90"
                  }`}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    if (team.meta.logo && e.currentTarget.src !== team.meta.logo) {
                      e.currentTarget.src = team.meta.logo;
                    } else {
                      e.currentTarget.style.visibility = "hidden";
                    }
                  }}
                />
              ) : (
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-pk-surface font-data text-[0.5rem] font-bold transition-opacity ${
                    active
                      ? "opacity-100 text-white"
                      : "opacity-50 text-pk-titane group-hover:opacity-90"
                  }`}
                >
                  {team.meta.abbr}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
