/**
 * Grand Prix Detail — V2 Tabbed (Countdown + tabs).
 * Broadcast Premium theme.
 */
import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
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
} from "lucide-react";
import { api } from "@/lib/api";
import type { CircuitMapData } from "@/lib/circuitMaps";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { CircuitMap } from "@/components/CircuitMap";
import { EmptyFullPage } from "@/components/EmptyState";
import RaceGrid from "@/components/RaceGrid";
import RaceDetailHero from "@/components/RaceDetailHero";

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

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Circuit" },
  { key: "programme", label: "Programme" },
  { key: "grille", label: "Grille" },
  { key: "picks", label: "Picks" },
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
    const labels: Record<string, { name: string; short_name: string }> = {
      fp1: { name: "Essais Libres 1", short_name: "FP1" },
      fp2: { name: "Essais Libres 2", short_name: "FP2" },
      fp3: { name: "Essais Libres 3", short_name: "FP3" },
      sprint_qualifying: { name: "Qualifications Sprint", short_name: "SQ" },
      sprint_race: { name: "Sprint", short_name: "SPRINT" },
      qualifying: { name: "Qualifications", short_name: "QUALI" },
      race: { name: "Course", short_name: "COURSE" },
    };

    return Object.entries(rawSessions as Record<string, unknown>)
      .filter(([, v]) => Boolean(v))
      .map(([key, session]) => {
        const s = session as { date?: string; time?: string; datetime?: string };
        const label = labels[key] ?? { name: key, short_name: key.toUpperCase() };
        return {
          ...label,
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

/* ── Countdown Display ───────────────────────────────────── */

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-lg bg-pk-anthracite border border-white/[0.08] flex items-center justify-center font-data text-xl font-bold text-pk-piste">
        {String(value).padStart(2, "0")}
      </div>
      <p className="font-data text-[0.5rem] text-pk-titane mt-1 uppercase">{label}</p>
    </div>
  );
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
  const [searchParams, setSearchParams] = useSearchParams();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const {
    data: raceDetails = null,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ["/races", raceId, "details"],
    queryFn: () => api.races.details(raceId!) as unknown as Promise<Record<string, unknown>>,
    enabled: !!raceId,
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
          title="Grand Prix introuvable"
          description={
            queryError ? "Impossible de charger les détails" : "Ce Grand Prix n'existe pas"
          }
          actionLabel="Retour"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="grandprix-detail-page">
      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
                data-testid="back-btn"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{countryFlag}</span>
                <h1 className="font-display text-lg truncate">
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

          {/* Tabs */}
          <div className="flex gap-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  haptic("selection");
                  setActiveTab(tab.key);
                }}
                className={`flex-1 py-1.5 rounded-full text-center font-data text-[0.5625rem] border transition-colors ${
                  activeTab === tab.key
                    ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                    : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
                }`}
                data-testid={`gp-tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Immersive hero + prediction CTA ── */}
      <RaceDetailHero
        name={raceDetails.name as string}
        circuit={circuitName}
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
        onPredict={() => {
          haptic("medium");
          navigate(`/predictions/${raceId}`);
        }}
        onResults={() => navigate(`/results/${raceId}`)}
      />

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
              {/* Countdown or status banner */}
              {countdown && nextSession ? (
                <motion.div
                  variants={fadeUp}
                  className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 mb-3"
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-pk-red animate-live-pulse" />
                    <span className="font-data text-[0.5625rem] text-pk-red uppercase tracking-wider">
                      {nextSession.name} dans
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {countdown.days > 0 && (
                      <>
                        <CountdownUnit value={countdown.days} label="jours" />
                        <span className="font-data text-lg text-pk-titane self-start mt-3">:</span>
                      </>
                    )}
                    <CountdownUnit value={countdown.hours} label="heures" />
                    <span className="font-data text-lg text-pk-titane self-start mt-3">:</span>
                    <CountdownUnit value={countdown.minutes} label="min" />
                    <span className="font-data text-lg text-pk-titane self-start mt-3">:</span>
                    <CountdownUnit value={countdown.seconds} label="sec" />
                  </div>
                </motion.div>
              ) : isFinished ? (
                <motion.div
                  variants={fadeUp}
                  className="flex items-center gap-2.5 p-3.5 bg-pk-surface border border-white/[0.08] rounded-lg mb-3"
                >
                  <div className="w-8 h-8 rounded-md bg-pk-anthracite flex items-center justify-center">
                    <Check className="w-4 h-4 text-pk-titane" />
                  </div>
                  <p className="text-[0.8125rem] text-pk-titane">Course terminée</p>
                </motion.div>
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
                  <p className="font-data text-[0.5rem] text-pk-titane uppercase">virages</p>
                </div>
                <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-3 text-center">
                  <Flag className="w-4 h-4 text-pk-red mx-auto mb-1.5" />
                  <p className="font-data text-base font-bold" data-testid="circuit-laps">
                    {circuitStats.laps || "—"}
                  </p>
                  <p className="font-data text-[0.5rem] text-pk-titane uppercase">tours</p>
                </div>
              </motion.div>

              {/* Race info card */}
              <motion.div
                variants={fadeUp}
                className="bg-pk-surface border border-white/[0.08] rounded-lg p-3.5"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-pk-titane flex-shrink-0" />
                    <span className="text-[0.8125rem] text-pk-piste">
                      {new Date(raceDetails.date as string).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {Boolean(raceDetails.predictions_close_at) && (
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-pk-titane flex-shrink-0" />
                      <span className="text-[0.8125rem] text-pk-piste">
                        Limite des picks :{" "}
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
                  title="Programme indisponible"
                  description="Les horaires de ce Grand Prix ne sont pas encore connus."
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
                            {session.name}
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
                            heure fr
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
          {activeTab === "grille" && <RaceGrid />}

          {/* ════════════════ PRONOS TAB ════════════════ */}
          {activeTab === "picks" && (
            <>
              {isUpcoming && canPredict ? (
                <motion.div variants={fadeUp} className="space-y-3">
                  {/* Prediction timer */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-pk-red-subtle border border-pk-red/[0.12]">
                    <motion.div
                      animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                      <Clock className="w-3.5 h-3.5 text-pk-red" />
                    </motion.div>
                    <span className="text-[0.8125rem] text-pk-piste">
                      Ferme 15 min avant {raceDetails.is_sprint_weekend ? "SQ1" : "Q1"}
                    </span>
                  </div>

                  {/* CTA button */}
                  <button
                    onClick={() => {
                      haptic("medium");
                      navigate(`/predictions/${raceId}`);
                    }}
                    className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform"
                    data-testid="make-predictions-cta"
                  >
                    <Target className="w-4 h-4" />
                    Faire mes picks
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
                        Picks Sprint
                      </button>
                    )}
                </motion.div>
              ) : isUpcoming && !canPredict ? (
                <motion.div variants={fadeUp} className="text-center py-12">
                  <div className="w-14 h-14 rounded-full bg-pk-anthracite flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-pk-titane" />
                  </div>
                  <p className="font-display text-sm text-pk-titane mb-1">Picks non disponibles</p>
                  <p className="text-xs text-pk-titane/60">
                    Les pronostics ouvriront bientôt pour ce Grand Prix.
                  </p>
                </motion.div>
              ) : isFinished ? (
                <motion.div variants={fadeUp} className="space-y-3">
                  <div className="flex items-center gap-2.5 p-3.5 bg-pk-surface border border-white/[0.08] rounded-lg">
                    <div className="w-8 h-8 rounded-md bg-pk-emerald/[0.12] border border-pk-emerald/25 flex items-center justify-center">
                      <Check className="w-4 h-4 text-pk-emerald" />
                    </div>
                    <p className="text-[0.8125rem] text-pk-piste">Course terminée</p>
                  </div>

                  <button
                    onClick={() => {
                      haptic("selection");
                      navigate(`/results/${raceId}`);
                    }}
                    className="w-full h-11 rounded-lg bg-pk-surface border border-white/[0.08] text-pk-piste font-display text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                    data-testid="view-results-cta"
                  >
                    Voir les résultats
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <EmptyFullPage
                  Icon={Target}
                  title="Picks indisponibles"
                  description="Les pronostics ne sont pas encore ouverts pour ce Grand Prix."
                />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
