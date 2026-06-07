/**
 * RaceLiveResults — race results + prediction outcomes surfaced on the GP fiche.
 *
 * Shown while a race is live or finished. Renders:
 *   - the race podium (top 3),
 *   - the user's prediction score for this GP (perso),
 *   - the user's standing + points in each of their leagues.
 *
 * While the race is live it polls every 30s so the fiche fills in near-real-time
 * as the backend posts results. (Results are near-real-time at best — see the
 * results cron limits — so this is a poll, not a websocket feed.)
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueries, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/lib/auth";
import { fadeUp } from "@/lib/motion";
import { buildDriverLookup, resolveDriverReference } from "@/components/entities/driverEntityUtils";
import type { LeaderboardEntry, League } from "@/types/api";

const POLL_MS = 30_000;
const PODIUM = ["🥇", "🥈", "🥉"];

// The /results/:id payload returns `points` as an object (total/details/xp) —
// the generated ResultsResponse type lags the API, so describe the live shape here.
interface LiveResultsResponse {
  results?: {
    race_winner?: string | null;
    race_top10?: string[];
  } | null;
  points?: { total: number; details?: string[]; xp_earned?: number } | null;
}

interface RaceLiveResultsProps {
  raceId: string;
  isLive: boolean;
  isFinished: boolean;
}

export default function RaceLiveResults({ raceId, isLive, isFinished }: RaceLiveResultsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const enabled = isLive || isFinished;

  const { data: resultData } = useQuery({
    queryKey: queryKeys.results.get(raceId),
    queryFn: () => api.results.get(raceId) as unknown as Promise<LiveResultsResponse>,
    enabled,
    retry: false,
    // Poll while live so posted results / scores appear without a refresh.
    refetchInterval: isLive ? POLL_MS : false,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: () => api.drivers.list(),
    enabled,
    staleTime: 60 * 60 * 1000,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: queryKeys.leagues.my(),
    queryFn: () => api.leagues.my(),
    enabled,
  });

  // One leaderboard query per league (polled while live to track movements).
  const leaderboards = useQueries({
    queries: (leagues as League[]).map((lg) => ({
      queryKey: queryKeys.leagues.leaderboard(lg.id),
      queryFn: () => api.leagues.leaderboard(lg.id),
      enabled,
      refetchInterval: isLive ? POLL_MS : (false as const),
    })),
  });

  if (!enabled) return null;

  const lookup = buildDriverLookup(drivers);
  const driverLabel = (ref?: string | null): string | null => {
    if (!ref) return null;
    const d = resolveDriverReference(ref, lookup);
    return d ? d.code || d.last_name || d.name : String(ref);
  };

  const results = resultData?.results;
  const hasResults = Boolean(results?.race_winner);
  // race_top10[0] already IS the winner; fall back to race_winner if top10 absent.
  const podiumRefs =
    results?.race_top10 && results.race_top10.length
      ? results.race_top10.slice(0, 3)
      : results?.race_winner
        ? [results.race_winner]
        : [];
  const podium = podiumRefs.map(driverLabel);
  const myScore = resultData?.points?.total;

  const leagueRows = (leagues as League[]).map((lg, i) => {
    const entries = (leaderboards[i]?.data as LeaderboardEntry[] | undefined) ?? [];
    const me = entries.find((e) => String(e.user_id) === String(user?.id));
    return {
      id: lg.id,
      name: lg.name,
      position: me?.position ?? null,
      lastRacePoints: me?.last_race_points ?? null,
    };
  });

  return (
    <motion.div
      variants={fadeUp}
      className="mb-3 scroll-mt-20 overflow-hidden rounded-lg border border-pk-red/30 bg-pk-surface shadow-[0_0_0_1px_rgba(225,6,0,0.12)]"
      data-testid="race-live-results"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] bg-pk-red/[0.06] px-3.5 py-2.5">
        {isLive && !isFinished ? (
          <span className="h-2 w-2 animate-[pulse-dot_1.5s_ease-in-out_infinite] rounded-full bg-pk-red" />
        ) : (
          <Trophy className="h-3.5 w-3.5 text-pk-gold" />
        )}
        <span className="font-display text-[0.8125rem] uppercase tracking-[0.04em] text-pk-piste">
          {isFinished
            ? t("grand_prix.live_results.title_final")
            : t("grand_prix.live_results.title_live")}
        </span>
      </div>

      <div className="space-y-3 p-3.5">
        {/* Race podium */}
        {hasResults ? (
          <div className="flex items-stretch gap-2" data-testid="live-podium">
            {podium.map((name, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1 rounded-md border border-white/[0.06] bg-pk-anthracite/60 py-2"
              >
                <span className="text-base leading-none">{PODIUM[i]}</span>
                <span className="font-data text-[0.8125rem] font-bold text-pk-piste">
                  {name ?? "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-md border border-white/[0.06] bg-pk-anthracite/40 py-3">
            <span className="h-1.5 w-1.5 animate-[pulse-dot_1.5s_ease-in-out_infinite] rounded-full bg-pk-red" />
            <span className="font-data text-[0.6875rem] uppercase tracking-[0.08em] text-pk-titane">
              {t("grand_prix.live_results.awaiting")}
            </span>
          </div>
        )}

        {/* Personal score */}
        <div className="flex items-center justify-between rounded-md bg-pk-anthracite/40 px-3 py-2">
          <span className="font-data text-[0.625rem] uppercase tracking-[0.1em] text-pk-titane">
            {t("grand_prix.live_results.your_score")}
          </span>
          {hasResults && typeof myScore === "number" ? (
            <span
              className="font-data text-base font-bold text-pk-emerald"
              data-testid="live-my-score"
            >
              +{myScore}
              <span className="ml-1 text-[0.625rem] font-normal text-pk-titane">pts</span>
            </span>
          ) : (
            <span className="font-data text-[0.75rem] text-pk-titane">
              {t("grand_prix.live_results.pending_score")}
            </span>
          )}
        </div>

        {/* Leagues */}
        {leagueRows.length > 0 ? (
          <div>
            <p className="mb-1.5 font-data text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
              {t("grand_prix.live_results.leagues")}
            </p>
            <ul className="space-y-1.5" data-testid="live-league-rows">
              {leagueRows.map((lg) => (
                <li
                  key={lg.id}
                  className="flex items-center justify-between rounded-md bg-pk-anthracite/40 px-3 py-1.5"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {lg.position != null && (
                      <span className="shrink-0 rounded bg-pk-red/15 px-1.5 py-0.5 font-data text-[0.625rem] font-bold tabular-nums text-pk-red">
                        {t("grand_prix.live_results.position", { pos: lg.position })}
                      </span>
                    )}
                    <span className="truncate text-[0.8125rem] text-pk-piste">{lg.name}</span>
                  </span>
                  {hasResults && lg.lastRacePoints != null && (
                    <span className="shrink-0 font-data text-[0.75rem] font-bold tabular-nums text-pk-emerald">
                      +{lg.lastRacePoints}
                      <span className="ml-1 text-[0.5625rem] font-normal text-pk-titane">pts</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center font-data text-[0.625rem] uppercase tracking-[0.08em] text-pk-titane">
            {t("grand_prix.live_results.no_leagues")}
          </p>
        )}

        {/* Full results CTA */}
        <button
          onClick={() => navigate(`/results/${raceId}`)}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-white/[0.05] font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-piste transition-colors hover:bg-white/[0.1]"
          data-testid="live-see-details"
        >
          {t("grand_prix.live_results.see_details")}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
