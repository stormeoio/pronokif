import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarDays,
  Flag,
  History,
  Keyboard,
  Loader2,
  Search,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { OPEN_DEEP_SEARCH_EVENT } from "./deepSearchEvents";
import {
  filterDeepSearchItems,
  groupDeepSearchItems,
  isEditableSearchTarget,
  type DeepSearchItem,
} from "./deepSearchIndex";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { UserIdentity } from "@/components/users/UserIdentity";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Driver, LeaderboardEntry, League, PointsHistoryResponse, Race } from "@/types/api";

const GROUP_ICONS = {
  Navigation: Keyboard,
  Pilotes: User,
  Drivers: User,
  Courses: Flag,
  Races: Flag,
  Ligues: Users,
  Leagues: Users,
  Joueurs: Trophy,
  Players: Trophy,
  Historique: History,
  History: History,
} satisfies Record<string, typeof Search>;

function shortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl F";
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘F" : "Ctrl F";
}

function formatRaceDate(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Date(value.includes("T") ? value : `${value}T12:00:00`).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function raceStatusLabel(status: Race["status"] | undefined, t: (key: string) => string) {
  if (status === "finished") return t("search.status.finished");
  if (status === "in_progress") return t("search.status.in_progress");
  if (status === "cancelled") return t("search.status.cancelled");
  return t("search.status.upcoming");
}

function staticItems(t: (key: string) => string): DeepSearchItem[] {
  const navigation = t("search.groups.navigation");
  return [
    {
      id: "nav-dashboard",
      title: t("search.static.dashboard_title"),
      subtitle: t("search.static.dashboard_subtitle"),
      href: "/",
      group: navigation,
      type: "page",
      keywords: ["dashboard", "home", "accueil"],
      priority: 40,
    },
    {
      id: "nav-predictions",
      title: t("search.static.predictions_title"),
      subtitle: t("search.static.predictions_subtitle"),
      href: "/predictions",
      group: navigation,
      type: "page",
      keywords: ["courses", "calendrier", "prediction"],
      priority: 39,
    },
    {
      id: "nav-championship",
      title: t("search.static.championship_title"),
      subtitle: t("search.static.championship_subtitle"),
      href: "/championship",
      group: navigation,
      type: "page",
      keywords: ["f1", "saison", "annee", "ecuries"],
      priority: 38,
    },
    {
      id: "nav-results",
      title: t("search.static.results_title"),
      subtitle: t("search.static.results_subtitle"),
      href: "/results",
      group: navigation,
      type: "page",
      keywords: ["score", "classement", "points"],
      priority: 37,
    },
    {
      id: "nav-leaderboard-global",
      title: t("search.static.global_leaderboard_title"),
      subtitle: t("search.static.global_leaderboard_subtitle"),
      href: "/leaderboard/global",
      group: navigation,
      type: "page",
      keywords: ["joueurs", "leaderboard", "ranking"],
      priority: 36,
    },
    {
      id: "nav-compare",
      title: t("search.static.compare_title"),
      subtitle: t("search.static.compare_subtitle"),
      href: "/compare",
      group: navigation,
      type: "page",
      keywords: ["pilotes", "stats", "comparaison"],
      priority: 32,
    },
    {
      id: "nav-profile",
      title: t("search.static.profile_title"),
      subtitle: t("search.static.profile_subtitle"),
      href: "/profile",
      group: navigation,
      type: "page",
      keywords: ["joueur", "compte", "profil"],
      priority: 30,
    },
  ];
}

function buildDriverItems(drivers: Driver[], group: string): DeepSearchItem[] {
  return drivers.map((driver) => ({
    id: `driver-${driver.id}`,
    title: driver.name,
    subtitle: `${driver.team} • #${driver.number} • ${driver.country}`,
    badge: driver.code,
    href: `/driver/${driver.id}`,
    group,
    type: "driver",
    keywords: [driver.first_name, driver.last_name, driver.team, driver.country, driver.number],
    priority: 26,
  }));
}

function buildRaceItems(
  races: Race[],
  group: string,
  locale: string,
  dateFallback: string,
  t: (key: string) => string,
): DeepSearchItem[] {
  return races.map((race) => ({
    id: `race-${race.id}`,
    title: race.name,
    subtitle: `${race.circuit} • ${race.country} • ${formatRaceDate(race.date, locale, dateFallback)}`,
    badge: raceStatusLabel(race.status, t),
    href: `/race/${race.id}`,
    group,
    type: "race",
    keywords: [
      race.id,
      race.circuit,
      race.country,
      race.date,
      race.season,
      race.timezone,
      race.is_sprint_weekend ? "sprint" : null,
      race.status,
    ],
    priority: race.status === "upcoming" || race.status === "in_progress" ? 24 : 18,
  }));
}

function buildLeagueItems(
  leagues: League[],
  group: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): DeepSearchItem[] {
  return leagues.map((league) => ({
    id: `league-${league.id}`,
    title: league.name,
    subtitle: t("search.league_subtitle", {
      count: league.members?.length ?? 0,
      code: league.code,
    }),
    badge: t("search.league_badge"),
    href: `/league/${league.id}/details`,
    group,
    type: "league",
    keywords: [league.code, league.description],
    priority: 20,
  }));
}

function buildLeaderboardItems(
  entries: LeaderboardEntry[],
  group: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): DeepSearchItem[] {
  return entries.map((entry) => ({
    id: `player-${entry.user_id}`,
    title: entry.username,
    subtitle: t("search.player_subtitle", {
      position: entry.position,
      points: entry.total_points,
      level: entry.level ?? "?",
    }),
    badge: t("search.player_badge"),
    href: `/profile/${entry.user_id}`,
    group,
    type: "player",
    userIdentity: {
      user_id: entry.user_id,
      username: entry.username,
      avatar_id: entry.avatar_id,
      custom_avatar_url: entry.custom_avatar_url,
      level: entry.level,
    },
    keywords: [entry.position, entry.total_points, entry.last_race_points],
    priority: Math.max(12, 22 - entry.position),
  }));
}

function buildHistoryItems(
  history: PointsHistoryResponse | undefined,
  group: string,
  t: (key: string) => string,
): DeepSearchItem[] {
  return (history?.history || []).map((entry) => ({
    id: `history-${entry.race_id}`,
    title: entry.race_name,
    subtitle: entry.has_results
      ? `${entry.total_points} pts • ${entry.xp_earned} XP`
      : t("search.history_pending"),
    badge: t("search.history_badge"),
    href: `/results/${entry.race_id}`,
    group,
    type: "history",
    keywords: [
      entry.race_date,
      entry.details?.join(" "),
      entry.is_sprint_weekend ? "sprint" : null,
    ],
    priority: entry.has_results ? 16 : 12,
  }));
}

type AppDeepSearchProps = {
  enabled?: boolean;
};

export default function AppDeepSearch({ enabled = true }: AppDeepSearchProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const canSearch = enabled && !!user;
  const fetchEnabled = canSearch && open;

  useEffect(() => {
    if (!canSearch) return;

    const openSearch = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f") return;
      if (isEditableSearchTarget(event.target)) return;
      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener(OPEN_DEEP_SEARCH_EVENT, openSearch);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_DEEP_SEARCH_EVENT, openSearch);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canSearch]);

  const driversQuery = useQuery({
    queryKey: ["deep-search", "drivers"],
    queryFn: () => api.drivers.list(),
    enabled: fetchEnabled,
    staleTime: 30 * 60 * 1000,
  });

  const racesQuery = useQuery({
    queryKey: ["deep-search", "races"],
    queryFn: () => api.races.list(),
    enabled: fetchEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const leaguesQuery = useQuery({
    queryKey: ["deep-search", "leagues"],
    queryFn: () => api.leagues.my(),
    enabled: fetchEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const leaderboardQuery = useQuery({
    queryKey: ["deep-search", "leaderboard", "global"],
    queryFn: () => api.leaderboard.global(30),
    enabled: fetchEnabled,
    staleTime: 2 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ["deep-search", "points-history"],
    queryFn: () => api.predictions.pointsHistory(),
    enabled: fetchEnabled,
    staleTime: 2 * 60 * 1000,
  });

  const items = useMemo(
    () => [
      ...staticItems(t),
      ...buildDriverItems(driversQuery.data || [], t("search.groups.drivers")),
      ...buildRaceItems(
        racesQuery.data || [],
        t("search.groups.races"),
        i18n.language?.startsWith("en") ? "en-US" : "fr-FR",
        t("search.date_tbc"),
        t,
      ),
      ...buildLeagueItems(leaguesQuery.data || [], t("search.groups.leagues"), t),
      ...buildLeaderboardItems(
        leaderboardQuery.data?.leaderboard || [],
        t("search.groups.players"),
        t,
      ),
      ...buildHistoryItems(historyQuery.data, t("search.groups.history"), t),
    ],
    [
      driversQuery.data,
      historyQuery.data,
      i18n.language,
      leaderboardQuery.data?.leaderboard,
      leaguesQuery.data,
      racesQuery.data,
      t,
    ],
  );

  const visibleItems = useMemo(() => filterDeepSearchItems(items, query, 36), [items, query]);
  const groupedItems = useMemo(() => groupDeepSearchItems(visibleItems), [visibleItems]);
  const isLoading =
    driversQuery.isFetching ||
    racesQuery.isFetching ||
    leaguesQuery.isFetching ||
    leaderboardQuery.isFetching ||
    historyQuery.isFetching;

  const selectItem = (item: DeepSearchItem) => {
    setOpen(false);
    setQuery("");
    navigate(item.href);
  };

  if (!canSearch) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[12vh] max-h-[78vh] max-w-3xl translate-y-0 overflow-hidden border-white/[0.08] bg-pk-surface p-0 text-pk-piste shadow-2xl shadow-black/50 sm:rounded-md"
        data-testid="app-deep-search-dialog"
      >
        <DialogTitle className="sr-only">{t("search_dialog.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("search_dialog.description")}</DialogDescription>
        <Command shouldFilter={false} className="bg-transparent">
          <div className="border-b border-white/[0.08]">
            <div className="flex items-center justify-between gap-3 px-4 pt-3">
              <div>
                <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-red">
                  {t("search_dialog.eyebrow")}
                </p>
                <p className="font-body text-xs text-pk-titane">{t("search_dialog.subtitle")}</p>
              </div>
              <span className="rounded-sm border border-white/[0.08] px-2 py-1 font-data text-[10px] text-pk-titane">
                {shortcutLabel()}
              </span>
            </div>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder={t("search_dialog.placeholder")}
              className="h-14 font-body text-base text-white placeholder:text-pk-titane"
              data-testid="app-deep-search-input"
            />
          </div>
          <CommandList className="max-h-[56vh] px-2 py-2">
            <CommandEmpty className="py-10 text-center font-body text-sm text-pk-titane">
              {t("search_dialog.empty")}
            </CommandEmpty>
            {Object.entries(groupedItems).map(([group, groupItems]) => {
              const Icon = GROUP_ICONS[group as keyof typeof GROUP_ICONS] || Search;
              return (
                <CommandGroup
                  key={group}
                  heading={
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {group}
                    </span>
                  }
                >
                  {groupItems.map((item) => {
                    const isPlayer = item.type === "player" && item.userIdentity;

                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.group}-${item.title}-${item.subtitle || ""}`}
                        onSelect={() => selectItem(item)}
                        className="min-h-14 cursor-pointer gap-3 rounded-md border border-transparent px-3 py-2 text-pk-piste data-[selected=true]:border-pk-red/35 data-[selected=true]:bg-pk-red-subtle data-[selected=true]:text-white"
                        data-testid={`deep-search-result-${item.id}`}
                      >
                        {!isPlayer ? (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/[0.08] bg-black/25">
                            <Icon className="h-4 w-4 text-pk-red" />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            {isPlayer ? (
                              <UserIdentity
                                user={item.userIdentity!}
                                linked={false}
                                showEmail={false}
                                showLevel={false}
                                size="md"
                                className="min-w-0 flex-1"
                              />
                            ) : (
                              <p className="truncate font-body text-sm font-semibold">
                                {item.title}
                              </p>
                            )}
                            {item.badge ? (
                              <span className="shrink-0 rounded-sm border border-white/[0.08] px-1.5 py-0.5 font-data text-[9px] uppercase text-pk-titane">
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                          {item.subtitle ? (
                            <p className="truncate font-body text-xs text-pk-titane">
                              {item.subtitle}
                            </p>
                          ) : null}
                        </div>
                        <CommandShortcut>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </CommandShortcut>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 font-body text-xs text-pk-titane">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("search_dialog.indexing")}
              </div>
            ) : null}
          </CommandList>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-2 font-body text-[11px] text-pk-titane">
            <span>{t("search_dialog.help")}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {t("search_dialog.local_index")}
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
