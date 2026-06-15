/**
 * Grand Prix Detail — V2 Tabbed (Countdown + tabs).
 * Broadcast Premium theme.
 */
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCw,
  ChevronLeft,
  Calendar,
  Clock,
  Flag,
  Zap,
  Target,
  ChevronRight,
  Check,
  Lock,
  Route,
  CornerDownRight,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { api } from "@/lib/api";
import type { CircuitMapData } from "@/lib/circuitMaps";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { CircuitMap } from "@/components/CircuitMap";
import { EmptyFullPage } from "@/components/EmptyState";
import StartingGrid from "@/components/StartingGrid";
import RaceDetailHero from "@/components/RaceDetailHero";
import RaceLiveResults from "@/components/RaceLiveResults";
import PredictionSummaryCard from "@/components/PredictionSummaryCard";

/* ── Country flags ────────────────────────────────────────── */

const COUNTRY_FLAGS: Record<string, string> = {
  Australia: "🇦🇺",
  China: "🇨🇳",
  Japan: "🇯🇵",
  Bahrain: "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  USA: "🇺🇸",
  Italy: "🇮🇹",
  Monaco: "🇲🇨",
  Spain: "🇪🇸",
  Canada: "🇨🇦",
  Austria: "🇦🇹",
  UK: "🇬🇧",
  Belgium: "🇧🇪",
  Hungary: "🇭🇺",
  Netherlands: "🇳🇱",
  Azerbaijan: "🇦🇿",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Brazil: "🇧🇷",
  Qatar: "🇶🇦",
  UAE: "🇦🇪",
};

/* ── Types ─────────────────────────────────────────────────── */

type TabKey = "info" | "programme" | "grille" | "picks";

const TAB_KEYS: { key: TabKey; labelKey: string }[] = [
  { key: "info", labelKey: "grand_prix.tabs.circuit" },
  { key: "programme", labelKey: "grand_prix.tabs.schedule" },
  { key: "grille", labelKey: "grand_prix.tabs.grid" },
  { key: "picks", labelKey: "grand_prix.tabs.picks" },
];

interface ParsedSession {
  name: string;
  short_name: string;
  datetime: string;
}

/* ── Session colors ──────────────────────────────────────── */

const SESSION_COLOR: Record<string, { bg: string; text: string }> = {
  FP1: { bg: "bg-pk-titane/20", text: "text-pk-titane" },
  FP2: { bg: "bg-pk-titane/20", text: "text-pk-titane" },
  FP3: { bg: "bg-pk-titane/20", text: "text-pk-titane" },
  SQ: { bg: "bg-pk-amber/20", text: "text-pk-amber" },
  SPRINT: { bg: "bg-pk-amber/20", text: "text-pk-amber" },
  QUALI: { bg: "bg-purple-500/20", text: "text-purple-400" },
  COURSE: { bg: "bg-pk-red/20", text: "text-pk-red" },
};

/* ── Helpers ──────────────────────────────────────────────── */

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function isPast(isoString: string) {
  return new Date(isoString) < new Date();
}

/** Parse sessions from API response (handles both array and object shapes) */
function parseSessions(raceDetails: Record<string, unknown>): ParsedSession[] {
  const rawSessions = raceDetails.sessions;

  if (Array.isArray(rawSessions)) {
    return rawSessions as ParsedSession[];
  }

  if (rawSessions && typeof rawSessions === "object") {
    const labels: Record<string, { nameKey: string; short_name: string }> = {
      fp1: { nameKey: "grand_prix.sessions.fp1", short_name: "FP1" },
      fp2: { nameKey: "grand_prix.sessions.fp2", short_name: "FP2" },
      fp3: { nameKey: "grand_prix.sessions.fp3", short_name: "FP3" },
      sprint_qualifying: { nameKey: "grand_prix.sessions.sprint_quali", short_name: "SQ" },
      sprint_race: { nameKey: "grand_prix.sessions.sprint", short_name: "SPRINT" },
      qualifying: { nameKey: "grand_prix.sessions.qualifying", short_name: "QUALI" },
      race: { nameKey: "grand_prix.sessions.race", short_name: "COURSE" },
    };

    return Object.entries(rawSessions as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([key, session]) => {
        const s = session as { date?: string; time?: string; datetime?: string };
        const label = labels[key] ?? { nameKey: key, short_name: key.toUpperCase() };
        return {
          name: label.nameKey,
          short_name: label.short_name,
          datetime: s.datetime || `${s.date}T${s.time}:00+00:00`,
        };
      });
  }

  return [];
}

/* ── Countdown Hook ──────────────────────────────────────── */

function useCountdown(targetDate: string | null) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;

  const diff = new Date(targetDate).getTime() - now;
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

/* ── Shimmer Skeleton ─────────────────────────────────────── */

function GrandPrixSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 p-4 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-5 w-5 rounded bg-pk-anthracite animate-shimmer" />
          <div className="h-5 w-48 rounded bg-pk-anthracite animate-shimmer" />
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-7 flex-1 rounded-full bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3 pb-24">
        <div className="h-20 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className="h-48 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer" />
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */

export default function GrandPrixDetailPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const {
    data: raceDetails = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["/races", raceId, "details"],
    queryFn: () => api.races.details(raceId!) as unknown as Promise<Record<string, unknown>>,
    enabled: !!raceId,
    // While the race is running, poll so status flips to "finished" and the live
    // results section refreshes without a manual pull.
    refetchInterval: (query) => {
      const data = query.state.data as Record<string, unknown> | undefined;
      return data?.status === "in_progress" ? 30_000 : false;
    },
  });

  usePullToRefresh({
    enabled: !loading,
    onRefresh: () => queryClient.invalidateQueries({ queryKey: ["/races", raceId, "details"] }),
  });

  /* ── Derived data ── */

  const circuitName = useMemo(() => {
    if (!raceDetails) return "";
    const c = raceDetails.circuit;
    return typeof c === "string" ? c : (c as Record<string, string>)?.name || String(c);
  }, [raceDetails]);

  const circuitFullName = useMemo(() => {
    if (!raceDetails) return "";
    return (
      (raceDetails.circuit as Record<string, string>)?.full_name ||
      (raceDetails.circuit_full_name as string) ||
      circuitName
    );
  }, [raceDetails, circuitName]);

  const circuitStats = useMemo(() => {
    if (!raceDetails) return { lengthKm: null, turns: null, laps: null };
    const c = raceDetails.circuit as Record<string, unknown> | undefined;
    return {
      lengthKm: (c?.length_km ?? raceDetails.circuit_length_km) as number | null,
      turns: (c?.turns ?? raceDetails.circuit_turns) as number | null,
      laps: (c?.laps ?? raceDetails.circuit_laps) as number | null,
    };
  }, [raceDetails]);

  const circuitMapData = useMemo(() => {
    if (!raceDetails) return null;
    return (raceDetails.circuit_map as CircuitMapData | null | undefined) ?? null;
  }, [raceDetails]);

  // The /races/:id/details payload exposes race_start_at (not `date`), so fall
  // back to it and guard against an invalid value (avoids "Invalid Date").
  const raceDateLabel = useMemo(() => {
    const iso = (raceDetails?.race_start_at ?? raceDetails?.date) as string | undefined;
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [raceDetails]);

  const selectedHotspotId = searchParams.get("hotspot");

  const selectCircuitHotspot = (hotspotId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("hotspot", hotspotId);
    setSearchParams(next, { replace: true });
  };

  const sessions = useMemo(() => {
    if (!raceDetails) return [];
    return parseSessions(raceDetails);
  }, [raceDetails]);

  const nextSession = useMemo(() => {
    return sessions.find((s) => !isPast(s.datetime)) || null;
  }, [sessions]);

  const countdown = useCountdown(nextSession?.datetime || null);

  const countryFlag = raceDetails ? COUNTRY_FLAGS[raceDetails.country as string] || "🏁" : "🏁";

  const isFinished = raceDetails?.status === "finished";
  const isLive = raceDetails?.status === "in_progress";
  const isUpcoming = raceDetails?.status === "upcoming";
  // Predictions stay open until the race starts (status flips to in_progress).
  // The /details payload may omit can_predict, so derive it from the status.
  const canPredict =
    (raceDetails?.can_predict as boolean | undefined) ?? (isUpcoming && !raceDetails?.is_cancelled);

  // User's prediction for this race — drives the hero CTA (Pronostiquer / Modifier).
  const { data: myPrediction } = useQuery({
    queryKey: ["/predictions/race", raceId],
    queryFn: async () => {
      try {
        return await api.predictions.get(raceId!);
      } catch {
        return null;
      }
    },
    enabled: !!raceId,
  });
  const hasPrediction = !!myPrediction;

  /* ── Loading ── */

  if (loading) return <GrandPrixSkeleton />;

  /* ── Error ── */

  if (queryError || !raceDetails) {
    return (
      <div className="min-h-screen bg-pk-carbon pb-24">
        <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
          <div className="px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </header>
        <EmptyFullPage
          Icon={Flag}
          title={t("grand_prix.empty.not_found")}
          description={queryError ? t("grand_prix.error_loading") : t("grand_prix.not_exist")}
          actionLabel={t("common.back")}
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="grandprix-detail-page">
      <div className="ptr-indicator" aria-hidden="true">
        <RotateCw className="h-4 w-4 text-white" />
      </div>

      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="back-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">{countryFlag}</span>
              <h1 className="font-race text-xl font-bold italic uppercase tracking-[0.01em] truncate">
                {(raceDetails.name as string).replace(" Grand Prix", "")}
              </h1>
            </div>
          </div>
          {Boolean(raceDetails.is_sprint_weekend) && (
            <span className="font-data text-[0.4375rem] px-1.5 py-0.5 rounded bg-pk-amber/20 text-pk-amber uppercase flex-shrink-0">
              Sprint
            </span>
          )}
        </div>
      </header>

      {/* ── Immersive hero + prediction CTA ── */}
      <RaceDetailHero
        name={raceDetails.name as string}
        country={raceDetails.country as string}
        flag={countryFlag}
        date={(raceDetails.race_start_at as string) || (raceDetails.date as string)}
        thumbnailRace={{
          id: raceDetails.id as string,
          name: raceDetails.name as string,
          circuit: circuitName,
          thumbnail_url: (raceDetails.thumbnail_url as string) || null,
        }}
        status={raceDetails.status as string}
        isCancelled={Boolean(raceDetails.is_cancelled)}
        canPredict={canPredict}
        hasPrediction={hasPrediction}
        isSprintWeekend={Boolean(raceDetails.is_sprint_weekend)}
        countdown={countdown}
        countdownLabel={nextSession ? t(nextSession.name) : undefined}
        onPredict={() => {
          haptic("medium");
          navigate(`/predictions/${raceId}`);
        }}
        onResults={() => navigate(`/results/${raceId}`)}
        onFollowLive={() => {
          haptic("light");
          // Surface the live results section (lives on the Circuit/info tab) and
          // scroll to it once it has mounted.
          setActiveTab("info");
          let tries = 0;
          const tryScroll = () => {
            const el = document.querySelector('[data-testid="race-live-results"]');
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
              return;
            }
            if (tries++ < 10) setTimeout(tryScroll, 80);
          };
          setTimeout(tryScroll, 120);
        }}
      />

      {/* ── Tabs — placed below the hero, high-contrast for legibility ── */}
      <nav
        className="relative z-10 border-b border-white/[0.08] bg-pk-carbon px-4 py-2.5"
        data-testid="gp-tabs"
      >
        <div className="flex gap-2">
          {TAB_KEYS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                haptic("selection");
                setActiveTab(tab.key);
              }}
              className={`flex-1 rounded-lg py-2.5 text-center font-data text-[0.6875rem] font-bold uppercase tracking-[0.08em] transition-all ${
                activeTab === tab.key
                  ? "bg-pk-red text-white shadow-[0_0_15px_rgba(225,6,0,0.35)]"
                  : "bg-white/[0.05] text-pk-piste/75 hover:bg-white/[0.09] hover:text-pk-piste"
              }`}
              data-testid={`gp-tab-${tab.key}`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="px-4 pt-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          {...rmProps}
        >
          {/* ════════════════ INFO TAB ════════════════ */}
          {activeTab === "info" && (
            <>
              {/* Live / finished race results — race podium + perso & league scores,
                  polled in near-real-time. Supersedes the old "finished" banner. */}
              {(isLive || isFinished) && raceId ? (
                <RaceLiveResults raceId={raceId} isLive={isLive} isFinished={isFinished} />
              ) : null}

              {/* Circuit map */}
              <motion.div variants={fadeUp} className="mb-3">
                <CircuitMap
                  circuitName={circuitName}
                  circuitFullName={circuitFullName}
                  country={raceDetails.country as string}
                  mapData={circuitMapData}
                  selectedHotspotId={selectedHotspotId}
                  onHotspotSelect={selectCircuitHotspot}
                />
              </motion.div>

              {/* Circuit stats grid */}
              <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-3 text-center">
                  <Route className="w-4 h-4 text-pk-info mx-auto mb-1.5" />
                  <p className="font-data text-base font-bold" data-testid="circuit-length">
                    {circuitStats.lengthKm?.toFixed(3) || "—"}
                  </p>
                  <p className="font-data text-[0.5rem] text-pk-titane uppercase">km</p>
                </div>
                <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-3 text-center">
                  <CornerDownRight className="w-4 h-4 text-pk-amber mx-auto mb-1.5" />
                  <p className="font-data text-base font-bold" data-testid="circuit-turns">
                    {circuitStats.turns || "—"}
                  </p>
                  <p className="font-data text-[0.5rem] text-pk-titane uppercase">
                    {t("grand_prix.circuit_stats.turns")}
                  </p>
                </div>
                <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-3 text-center">
                  <Flag className="w-4 h-4 text-pk-red mx-auto mb-1.5" />
                  <p className="font-data text-base font-bold" data-testid="circuit-laps">
                    {circuitStats.laps || "—"}
                  </p>
                  <p className="font-data text-[0.5rem] text-pk-titane uppercase">
                    {t("grand_prix.circuit_stats.laps")}
                  </p>
                </div>
              </motion.div>

              {/* Race info card */}
              <motion.div
                variants={fadeUp}
                className="bg-pk-surface border border-white/[0.08] rounded-lg p-3.5"
              >
                <div className="space-y-2.5">
                  {raceDateLabel && (
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-pk-titane flex-shrink-0" />
                      <span className="text-[0.8125rem] text-pk-piste">{raceDateLabel}</span>
                    </div>
                  )}
                  {Boolean(raceDetails.predictions_close_at) && (
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-pk-titane flex-shrink-0" />
                      <span className="text-[0.8125rem] text-pk-piste">
                        {t("grand_prix.status.pick_deadline")} :{" "}
                        <span className="text-pk-red">
                          {formatTime(raceDetails.predictions_close_at as string)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}

          {/* ════════════════ PROGRAMME TAB ════════════════ */}
          {activeTab === "programme" && (
            <>
              {sessions.length === 0 ? (
                <EmptyFullPage
                  Icon={Calendar}
                  title={t("grand_prix.empty.no_schedule")}
                  description={t("grand_prix.picks_open_soon")}
                />
              ) : (
                <motion.div
                  className="space-y-1.5"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {sessions.map((session, index) => {
                    const past = isPast(session.datetime);
                    const isNext = nextSession?.datetime === session.datetime;
                    const color = SESSION_COLOR[session.short_name] || SESSION_COLOR.FP1;

                    return (
                      <motion.div
                        key={index}
                        variants={fadeUp}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          past
                            ? "bg-pk-surface/50 border border-white/[0.04] opacity-50"
                            : isNext
                              ? "bg-pk-surface border border-pk-red/25 shadow-glow-red"
                              : "bg-pk-surface border border-white/[0.08]"
                        }`}
                        data-testid={`session-${session.short_name.toLowerCase()}`}
                      >
                        {/* Session badge */}
                        <div
                          className={`w-14 h-10 rounded-md ${color.bg} flex items-center justify-center flex-shrink-0`}
                        >
                          <span className={`font-data text-[0.625rem] font-bold ${color.text}`}>
                            {session.short_name}
                          </span>
                        </div>

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[0.8125rem] font-semibold ${past ? "text-pk-titane" : "text-pk-piste"}`}
                          >
                            {t(session.name)}
                          </p>
                          <p className="text-[0.625rem] text-pk-titane">
                            {formatDate(session.datetime)}
                          </p>
                        </div>

                        {/* Time */}
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`font-data text-[0.9375rem] font-bold ${
                              past ? "text-pk-titane" : isNext ? "text-pk-red" : "text-pk-piste"
                            }`}
                          >
                            {formatTime(session.datetime)}
                          </p>
                          <p className="font-data text-[0.4375rem] text-pk-titane uppercase">
                            {t("grand_prix.status.paris_time")}
                          </p>
                        </div>

                        {/* Status indicator */}
                        {past && <Check className="w-3.5 h-3.5 text-pk-titane flex-shrink-0" />}
                        {isNext && (
                          <span className="w-1.5 h-1.5 rounded-full bg-pk-red animate-live-pulse flex-shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </>
          )}

          {/* ════════════════ GRILLE TAB ════════════════ */}
          {activeTab === "grille" && <StartingGrid raceId={raceId!} sessions={sessions} />}

          {/* ════════════════ PRONOS TAB ════════════════ */}
          {activeTab === "picks" && (
            <motion.div variants={fadeUp} className="space-y-3" data-testid="picks-tab">
              {/* Deadline banner — predictions still open */}
              {isUpcoming && canPredict && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-pk-red-subtle border border-pk-red/[0.12]">
                  <motion.div
                    animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Clock className="w-3.5 h-3.5 text-pk-red" />
                  </motion.div>
                  <span className="text-[0.8125rem] text-pk-piste">
                    {t(
                      raceDetails.is_sprint_weekend
                        ? "grand_prix.deadline.sprint"
                        : "grand_prix.deadline.race",
                    )}
                  </span>
                </div>
              )}

              {/* Live banner — race running */}
              {isLive && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-pk-surface border border-white/[0.08]">
                  <span className="h-2 w-2 animate-[pulse-dot_1.5s_ease-in-out_infinite] rounded-full bg-pk-red" />
                  <span className="text-[0.8125rem] text-pk-piste">
                    {t("grand_prix.picks.live_hint")}
                  </span>
                </div>
              )}

              {/* Submitted picks recap — shown whenever the user has played */}
              {hasPrediction && myPrediction && (
                <PredictionSummaryCard
                  prediction={myPrediction}
                  isSprintWeekend={Boolean(raceDetails.is_sprint_weekend)}
                  locked={!canPredict}
                />
              )}

              {/* Action / empty region */}
              {isUpcoming && canPredict ? (
                <>
                  <button
                    onClick={() => {
                      haptic("medium");
                      navigate(`/predictions/${raceId}`);
                    }}
                    className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform"
                    data-testid="make-predictions-cta"
                  >
                    {hasPrediction ? (
                      <Pencil className="w-4 h-4" />
                    ) : (
                      <Target className="w-4 h-4" />
                    )}
                    {hasPrediction ? t("grand_prix.picks.modify") : t("grand_prix.cta.predict")}
                  </button>

                  {Boolean(raceDetails.is_sprint_weekend) &&
                    Boolean(raceDetails.can_predict_sprint) && (
                      <button
                        onClick={() => {
                          haptic("medium");
                          navigate(`/predictions/${raceId}?tab=sprint`);
                        }}
                        className="w-full h-11 rounded-lg bg-pk-amber/[0.12] border border-pk-amber/25 text-pk-amber font-display text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                        data-testid="make-sprint-predictions-cta"
                      >
                        <Zap className="w-4 h-4" />
                        {hasPrediction
                          ? t("grand_prix.picks.modify_sprint")
                          : t("grand_prix.cta.sprint_picks")}
                      </button>
                    )}
                </>
              ) : isFinished ? (
                <>
                  {!hasPrediction && (
                    <div className="text-center py-8" data-testid="picks-none">
                      <div className="w-14 h-14 rounded-full bg-pk-anthracite flex items-center justify-center mx-auto mb-3">
                        <Target className="w-6 h-6 text-pk-titane" />
                      </div>
                      <p className="font-display text-sm text-pk-titane">
                        {t("grand_prix.picks.none_finished")}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      haptic("selection");
                      navigate(`/results/${raceId}`);
                    }}
                    className="w-full h-11 rounded-lg bg-pk-surface border border-white/[0.08] text-pk-piste font-display text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                    data-testid="view-results-cta"
                  >
                    {t("grand_prix.cta.results")}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : isUpcoming && !canPredict && !hasPrediction ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-pk-anthracite flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-pk-titane" />
                  </div>
                  <p className="font-display text-sm text-pk-titane mb-1">
                    {t("grand_prix.cta.unavailable")}
                  </p>
                  <p className="text-xs text-pk-titane/60">{t("grand_prix.picks_open_soon")}</p>
                </div>
              ) : isLive && !hasPrediction ? (
                <div className="text-center py-10" data-testid="picks-none">
                  <div className="w-14 h-14 rounded-full bg-pk-anthracite flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-pk-titane" />
                  </div>
                  <p className="font-display text-sm text-pk-titane">
                    {t("grand_prix.picks.none_finished")}
                  </p>
                </div>
              ) : null}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
