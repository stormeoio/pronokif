/**
 * WelcomeHeader — Dashboard sticky welcome box.
 *
 * Broadcast Premium: glass header, time-aware greeting, avatar wrapped in an
 * XP level-ring, prominent username, and an at-a-glance rank/points chip.
 * Replaces the previous "Salut + name" minimal header.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, ChevronRight } from "lucide-react";
import { AvatarDisplay, type AvatarObject } from "@/components/AvatarDisplay";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { iconSmall } from "@/lib/icons";
import { openDeepSearch } from "@/components/search/deepSearchEvents";

interface WelcomeHeaderUser {
  id?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  level?: number | null;
  xp?: number | null;
}

interface WelcomeHeaderProps {
  user: WelcomeHeaderUser | null | undefined;
  rank?: number;
  totalPlayers?: number;
  points?: number;
  hasUnreadNotifications?: boolean;
}

/** Time-aware greeting — uses i18n keys. */
function greetingKeyFor(hour: number): string {
  if (hour < 6) return "dashboard.greeting.night";
  if (hour < 12) return "dashboard.greeting.morning";
  if (hour < 18) return "dashboard.greeting.afternoon";
  return "dashboard.greeting.evening";
}

/** XP progress within the current level — matches MissionsPage convention. */
function levelProgress(level?: number | null, xp?: number | null): number {
  if (!level || level < 1) return 0;
  const xpForLevel = level * 200;
  if (!xp || xpForLevel <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((xp % xpForLevel) / xpForLevel) * 100)));
}

function useAvatarObject(avatarId?: string | null): AvatarObject | null {
  const { data } = useQuery({
    queryKey: queryKeys.avatars.list(),
    queryFn: () => api.avatars.list(),
    enabled: !!avatarId,
    staleTime: 5 * 60_000,
  });
  return useMemo(() => {
    if (!avatarId) return null;
    return (data?.all?.find((a) => a.id === avatarId) as AvatarObject | undefined) ?? null;
  }, [avatarId, data]);
}

export default function WelcomeHeader({
  user,
  rank,
  totalPlayers,
  points,
  hasUnreadNotifications = true,
}: WelcomeHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const avatar = useAvatarObject(user?.avatar_id);

  const greeting = useMemo(() => t(greetingKeyFor(new Date().getHours())), [t]);
  const progress = levelProgress(user?.level, user?.xp);
  const name = user?.username || user?.email?.split("@")[0] || t("dashboard.fallback_name");
  const level = user?.level ?? 1;
  const hasRank = !!rank && rank > 0;

  return (
    <header
      className="sticky top-0 z-50
        bg-pk-carbon/85 backdrop-blur-[20px] saturate-[1.3]
        border-b border-white/[0.08]"
      data-testid="dashboard-header"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        {/* ---- Identity ---- */}
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="group flex min-w-0 items-center gap-3 rounded-md text-left
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
          data-testid="dashboard-profile-link"
          aria-label={t("dashboard.aria_profile")}
        >
          {/* Avatar + XP level-ring */}
          <span className="relative inline-flex flex-shrink-0">
            <span
              className="grid place-items-center rounded-[18px] p-[2.5px]"
              style={{
                background: `conic-gradient(var(--pk-red) ${progress * 3.6}deg, rgba(255,255,255,0.10) ${progress * 3.6}deg)`,
              }}
            >
              <span className="rounded-[15px] bg-pk-carbon p-[2px]">
                <AvatarDisplay avatar={avatar} customUrl={user?.custom_avatar_url} size="lg" />
              </span>
            </span>
            {/* Level badge */}
            <span
              className="absolute -bottom-1 left-1/2 -translate-x-1/2
                rounded-full border border-pk-red/40 bg-pk-carbon
                px-2 py-[1px] font-mono text-[0.5625rem] font-bold uppercase
                tracking-[0.08em] text-pk-red shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
            >
              {t("common.level_short", { level })}
            </span>
          </span>

          {/* Greeting + name + rank */}
          <span className="min-w-0">
            <span className="block font-mono text-[0.625rem] uppercase tracking-[0.14em] text-pk-titane">
              {greeting}
            </span>
            <span className="flex items-center gap-1">
              <span className="block max-w-[9.5rem] truncate font-display text-[1.0625rem] uppercase leading-tight text-pk-piste group-hover:text-white transition-colors duration-pk-short">
                {name}
              </span>
              <ChevronRight
                size={14}
                strokeWidth={2.5}
                className="flex-shrink-0 text-pk-titane group-hover:translate-x-0.5 group-hover:text-pk-red transition-all duration-pk-short"
              />
            </span>
            {/* At-a-glance chip */}
            <span className="mt-1 inline-flex items-center gap-1.5">
              {hasRank ? (
                <span className="inline-flex items-center gap-1 rounded-sm border border-pk-gold/20 bg-pk-gold/[0.08] px-1.5 py-[1px] font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-pk-gold">
                  {rank}
                  <span className="text-pk-gold/70">e</span>
                  {totalPlayers ? <span className="text-pk-titane">/ {totalPlayers}</span> : null}
                </span>
              ) : null}
              {typeof points === "number" ? (
                <span className="inline-flex items-center gap-1 rounded-sm border border-white/[0.08] bg-white/[0.03] px-1.5 py-[1px] font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-pk-titane">
                  {points.toLocaleString("fr-FR")}
                  <span className="text-pk-titane/70">pts</span>
                </span>
              ) : null}
            </span>
          </span>
        </button>

        {/* ---- Actions ---- */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full
              text-pk-titane transition-colors duration-pk-short hover:text-pk-piste"
            onClick={openDeepSearch}
            aria-label={t("dashboard.aria_search")}
            data-testid="dashboard-open-deep-search"
          >
            <Search {...iconSmall} size={18} />
          </button>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full
              text-pk-titane transition-colors duration-pk-short hover:text-pk-piste"
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
          >
            <Bell {...iconSmall} size={18} />
            {hasUnreadNotifications && (
              <span className="absolute right-[6px] top-[6px] h-[5px] w-[5px] rounded-full bg-pk-red" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
