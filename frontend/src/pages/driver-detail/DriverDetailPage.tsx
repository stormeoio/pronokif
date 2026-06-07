/**
 * DriverDetailPage — Immersive driver profile (Broadcast Premium).
 *
 * Layout mirrors the race detail page: full-width hero banner with driver
 * photo, team branding, then content sections below. No tabs — everything
 * is visible in a single scroll.
 *
 * Design reference: figma maquettes dark/light (June 2026).
 */
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  GitCompare,
  MapPin,
  Star,
  Trophy,
  User,
} from "lucide-react";
import { getTeamColors } from "./driverHelpers";
import { useDriverDetailData } from "./useDriverDetailData";
import { useDriverRoster } from "./useDriverRoster";
import { DriverNavRail } from "./DriverNavRail";
import { getTeamMeta } from "@/lib/teamLogos";
import { haptic } from "@/lib/haptics";
import { getReducedMotionProps } from "@/lib/motion";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { api } from "@/lib/api";

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

/* ── Skeleton ─────────────────────────────────────────── */

function DriverDetailSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="h-[420px] bg-pk-surface animate-shimmer" />
      <div className="px-4 pt-4 space-y-3 pb-24">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Circular Progress ───────────────────────────────── */

function CircularProgress({
  value,
  max = 100,
  label,
  color,
}: {
  value: number;
  max?: number;
  label: string;
  color: string;
}) {
  const pct = Math.min(value / max, 1);
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="5"
          />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-data text-lg font-bold text-pk-piste">{value}</span>
          <span className="font-data text-[0.45rem] text-pk-titane">/{max}</span>
        </div>
      </div>
      <span className="font-data text-[0.5rem] uppercase tracking-[0.12em] text-pk-titane text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

/* ── Radar Chart ─────────────────────────────────────── */

function RadarChart({
  stats,
  color,
}: {
  stats: { label: string; value: number }[];
  color: string;
}) {
  const n = stats.length;
  const cx = 120;
  const cy = 120;
  const maxR = 65;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const getPoint = (index: number, ratio: number) => {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + maxR * ratio * Math.cos(angle),
      y: cy + maxR * ratio * Math.sin(angle),
    };
  };

  const dataPoints = stats.map((s, i) => getPoint(i, s.value / 100));
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[200px] mx-auto">
      {/* Grid */}
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, level));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ") + " Z";
        return (
          <path
            key={level}
            d={path}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const p = getPoint(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Data */}
      <path d={dataPath} fill={`${color}20`} stroke={color} strokeWidth="1.5" />

      {/* Labels */}
      {stats.map((s, i) => {
        const p = getPoint(i, 1.28);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-pk-titane"
            style={{
              fontSize: "7px",
              fontFamily: "var(--font-data, JetBrains Mono, monospace)",
              textTransform: "uppercase",
            }}
          >
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Shell (rail + scrollable profile) ─────────────────── */

function DriverPageShell({
  roster,
  currentId,
  onSelect,
  mainRef,
  children,
}: {
  roster: import("./useDriverRoster").RosterDriver[];
  currentId: string | undefined;
  onSelect: (id: string, direction: "next" | "prev") => void;
  mainRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-pk-carbon">
      <DriverNavRail drivers={roster} currentId={currentId} onSelect={onSelect} />
      <main
        ref={mainRef}
        className="relative flex-1 min-w-0 overflow-x-hidden pb-24"
        data-testid="driver-detail-page"
      >
        {children}
      </main>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function DriverDetailPage() {
  const { t } = useTranslation();
  const { driverId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const { loading, driver, error } = useDriverDetailData(driverId);

  // ── Roster navigation (sidebar rail + swipe) ──────────────
  const { roster } = useDriverRoster();
  const mainRef = useRef<HTMLElement>(null);

  const currentId = driver?.id ?? driverId;
  const currentIndex = roster.findIndex((d) => d.id === currentId);
  const prevDriver = currentIndex > 0 ? roster[currentIndex - 1] : undefined;
  const nextDriver =
    currentIndex >= 0 && currentIndex < roster.length - 1 ? roster[currentIndex + 1] : undefined;

  const goTo = useCallback(
    (id: string, direction: "next" | "prev") => {
      haptic("selection");
      navigate(`/driver/${id}`, { state: { dir: direction } });
    },
    [navigate],
  );
  const goPrev = useCallback(() => {
    if (prevDriver) goTo(prevDriver.id, "prev");
  }, [prevDriver, goTo]);
  const goNext = useCallback(() => {
    if (nextDriver) goTo(nextDriver.id, "next");
  }, [nextDriver, goTo]);

  // Swipe left → next driver, swipe right → previous driver.
  useSwipeNavigation(mainRef, {
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    enabled: roster.length > 1,
  });

  // Prefetch adjacent drivers so a swipe / tap feels instant (no skeleton).
  useEffect(() => {
    for (const d of [prevDriver, nextDriver]) {
      if (!d) continue;
      queryClient.prefetchQuery({
        queryKey: ["/drivers", d.id, "details"],
        queryFn: () => api.drivers.details(d.id),
        staleTime: 60_000,
      });
    }
  }, [queryClient, prevDriver, nextDriver]);

  useEffect(() => {
    if (error) {
      toast.error(t("driver_detail.load_error"));
      navigate("/championship");
    }
  }, [error, navigate]);

  if (loading) {
    return (
      <DriverPageShell roster={roster} currentId={currentId} onSelect={goTo} mainRef={mainRef}>
        <DriverDetailSkeleton />
      </DriverPageShell>
    );
  }

  if (!driver) {
    return (
      <DriverPageShell roster={roster} currentId={currentId} onSelect={goTo} mainRef={mainRef}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <User className="w-10 h-10 text-pk-titane mx-auto mb-3" />
            <p className="text-sm text-pk-titane">{t("driver_detail.not_found")}</p>
          </div>
        </div>
      </DriverPageShell>
    );
  }

  const colors = getTeamColors(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};
  const contract = driver.contract || {};
  const teamMeta = getTeamMeta(driver.team);
  const teamLogoSrc = teamMeta.logo_url || teamMeta.logo;

  const age = driver.date_of_birth
    ? new Date().getFullYear() - parseInt(driver.date_of_birth.split("-")[0], 10)
    : null;
  const height = driver.height_cm
    ? `${(driver.height_cm / 100).toFixed(2).replace(".", ",")} M`
    : null;
  const debutYear = f1Stats.seasons?.split("-")?.[0] ?? f1Stats.first_season ?? null;

  // Radar stats (synthetic — derived from palmares)
  const radarStats = [
    { label: t("driver_detail.speed"), value: Math.min(100, 60 + (f1Stats.poles || 0) * 2) },
    { label: t("driver_detail.overtaking"), value: Math.min(100, 50 + (f1Stats.wins || 0) * 3) },
    { label: t("driver_detail.consistency"), value: Math.min(100, 40 + (f1Stats.podiums || 0)) },
    {
      label: t("driver_detail.tyre_mgmt"),
      value: Math.min(100, 55 + (f1Stats.fastest_laps || 0) * 3),
    },
    { label: t("driver_detail.qualifying"), value: Math.min(100, 60 + (f1Stats.poles || 0) * 3) },
  ];

  // Points forts (synthetic scores)
  const pointsForts = [
    { label: t("driver_detail.qualifying"), value: radarStats[4].value, color: colors.primary },
    { label: t("driver_detail.tyre_mgmt"), value: radarStats[3].value, color: colors.primary },
    { label: t("driver_detail.overtaking"), value: radarStats[1].value, color: colors.primary },
  ];

  return (
    <DriverPageShell roster={roster} currentId={currentId} onSelect={goTo} mainRef={mainRef}>
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${colors.primary}30 0%, ${colors.primary}15 30%, ${colors.primary}06 60%, #0B0D12 100%)`,
        }}
        {...rmProps}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Full-width team color band at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: colors.primary }}
        />

        {/* Giant number watermark — taller, further right */}
        <div
          className="absolute -top-4 -right-4 font-display text-[220px] leading-none font-bold pointer-events-none select-none"
          style={{ color: `${colors.primary}12` }}
        >
          {driver.number}
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-pk-piste hover:text-white transition-colors"
            aria-label={t("driver_detail.back_label")}
            data-testid="driver-back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-heading text-sm uppercase">
              {t("driver_detail.drivers_label")}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {/* Prev / next driver — sequential slider control */}
            <div className="flex items-center bg-pk-carbon/40 backdrop-blur-sm rounded-lg">
              <button
                onClick={goPrev}
                disabled={!prevDriver}
                className="p-2 rounded-l-lg text-pk-titane hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label={t("driver_detail.prev_driver")}
                title={
                  prevDriver
                    ? `${prevDriver.first_name} ${prevDriver.last_name}`
                    : t("driver_detail.prev_driver")
                }
                data-testid="driver-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                disabled={!nextDriver}
                className="p-2 rounded-r-lg text-pk-titane hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label={t("driver_detail.next_driver")}
                title={
                  nextDriver
                    ? `${nextDriver.first_name} ${nextDriver.last_name}`
                    : t("driver_detail.next_driver")
                }
                data-testid="driver-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                haptic("light");
                navigate(`/compare?d1=${driver.id}`);
              }}
              className="p-2 bg-pk-carbon/40 backdrop-blur-sm rounded-lg text-pk-titane hover:text-white transition-colors"
              aria-label={t("driver_detail.compare_label")}
              title={t("driver_detail.compare_tooltip")}
              data-testid="driver-compare"
            >
              <GitCompare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero content: info left, photo positioned absolutely right */}
        <div className="relative z-10 min-h-[440px]">
          {/* Driver photo — absolute, fills full hero height, bleeds right */}
          <motion.div
            className="absolute right-0 top-0 bottom-0 w-[70%] z-0 flex items-end justify-end"
            {...rmProps}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
          >
            <img
              src={driver.photo_url_dark || driver.photo_url_light || driver.photo_url}
              alt={driver.full_name}
              className="max-w-none w-auto h-full object-contain object-bottom"
              style={{
                filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 60px ${colors.primary}20)`,
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.src =
                  "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback_image.png.transform/2col-retina/image.png";
              }}
            />
            {/* Bottom fade into content area */}
            <div
              className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
              style={{
                background: "linear-gradient(to top, var(--pk-carbon) 0%, transparent 100%)",
              }}
            />
          </motion.div>

          {/* Left column: team + name + meta — sits above the photo */}
          <div className="relative z-10 px-4 pt-4 pb-6 max-w-[55%]">
            {/* Team badge — logo with bright filter for visibility */}
            <div className="flex items-center gap-2.5 mb-4">
              {teamLogoSrc && (
                <img
                  src={teamLogoSrc}
                  alt={driver.team}
                  className="h-10 w-10 object-contain"
                  style={{ filter: "brightness(1.3) contrast(1.1)" }}
                />
              )}
              <span className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-white font-semibold">
                {driver.team}
              </span>
            </div>

            {/* Number */}
            <p className="font-data text-2xl font-bold" style={{ color: colors.primary }}>
              #{driver.number}
            </p>

            {/* Name — bigger */}
            <h1 className="font-display text-[2.2rem] leading-[0.9] uppercase mt-1">
              {driver.first_name}
              <br />
              <span className="text-pk-piste">{driver.last_name}</span>
            </h1>

            {/* Country */}
            <div className="flex items-center gap-2 mt-3">
              <Flag className="w-3.5 h-3.5 text-pk-titane" />
              <span className="font-body text-sm text-pk-titane">{driver.country_name}</span>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 mt-5">
              {age && (
                <div>
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    {t("driver_detail.age")}
                  </p>
                  <p className="font-data text-base font-bold text-pk-piste">
                    {age} {t("driver_detail.years_suffix")}
                  </p>
                </div>
              )}
              {height && (
                <div className="border-l border-white/[0.08] pl-4">
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    {t("driver_detail.height")}
                  </p>
                  <p className="font-data text-base font-bold text-pk-piste">{height}</p>
                </div>
              )}
              {debutYear && (
                <div className="border-l border-white/[0.08] pl-4">
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    {t("driver_detail.since")}
                  </p>
                  <p className="font-data text-base font-bold text-pk-piste">{debutYear}</p>
                </div>
              )}
            </div>

            {/* Follow button */}
            <button
              onClick={() => {
                haptic("medium");
                toast.success(t("driver_detail.followed"));
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs uppercase tracking-wider hover:bg-white/5 transition-colors font-data"
              style={{
                borderColor: `${colors.primary}60`,
                color: colors.primary,
              }}
            >
              <Star className="w-3.5 h-3.5" />
              {t("driver_detail.follow")}
            </button>
          </div>
        </div>

        {/* Diagonal stripes overlay — more visible */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 18px, ${colors.primary} 18px, ${colors.primary} 19px)`,
          }}
        />

        {/* Bottom gradient to carbon */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to top, var(--pk-carbon) 0%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* ── Saison stats ── */}
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="font-heading text-sm uppercase tracking-wide mb-4">
            {t("driver_detail.season", { year: new Date().getFullYear() })}
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <Trophy className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("driver_detail.ranking")}
              </p>
              <p className="font-data text-2xl font-bold text-pk-piste">
                {f1Stats.world_championships > 0 ? "1" : "-"}
                <sup className="text-xs font-normal text-pk-titane">e</sup>
              </p>
              <p className="font-data text-[0.5rem] text-pk-red">{f1Stats.points || 0} PTS</p>
            </div>
            <div>
              <Flag className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("driver_detail.podiums")}
              </p>
              <p className="font-data text-2xl font-bold text-pk-piste">{f1Stats.podiums || 0}</p>
              <p className="font-data text-[0.5rem] text-pk-titane">/ {f1Stats.entries || 0} GP</p>
            </div>
            <div>
              <MapPin className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("driver_detail.best_result")}
              </p>
              <p className="font-data text-2xl font-bold text-pk-piste">
                1<sup className="text-xs font-normal text-pk-titane">er</sup>
              </p>
              <p className="font-data text-[0.5rem]" style={{ color: colors.primary }}>
                {f1Stats.wins || 0} {t("driver_detail.victories")}
              </p>
            </div>
            <div>
              <Clock className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("driver_detail.avg_points")}
              </p>
              <p className="font-data text-2xl font-bold text-pk-piste">
                {f1Stats.entries
                  ? (f1Stats.points / f1Stats.entries).toFixed(1).replace(".", ",")
                  : "-"}
              </p>
              <p className="font-data text-[0.5rem] text-pk-titane">/ GP</p>
            </div>
          </div>
        </motion.div>

        {/* ── Points forts + Radar ── */}
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="font-heading text-sm uppercase tracking-wide mb-4">
            {t("driver_detail.strengths")}
          </h2>
          {/* Circular scores */}
          <div className="flex justify-center gap-5 mb-5">
            {pointsForts.map((pf) => (
              <CircularProgress key={pf.label} value={pf.value} label={pf.label} color={pf.color} />
            ))}
          </div>
          {/* Radar chart centered below */}
          <div className="flex justify-center">
            <RadarChart stats={radarStats} color={colors.primary} />
          </div>
        </motion.div>

        {/* ── Derniers Résultats (Carousel) ── */}
        {driver.recent_results?.length > 0 && (
          <motion.div
            className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            {...rmProps}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-sm uppercase tracking-wide">
                {t("driver_detail.recent_results")}
              </h2>
              <button
                onClick={() => navigate("/championship")}
                className="flex items-center gap-1 font-data text-[0.6rem] text-pk-titane hover:text-pk-piste transition-colors uppercase tracking-wider"
              >
                {t("driver_detail.see_all")} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div
              data-swipe-ignore
              className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
            >
              {(
                driver.recent_results as {
                  race_id: string;
                  race_name: string;
                  country: string;
                  date: string;
                  position: number;
                  is_winner: boolean;
                  circuit: string;
                }[]
              ).map((result) => {
                const flag = COUNTRY_FLAGS[result.country] || "🏁";
                const pos = result.position;
                const posLabel =
                  pos === 1
                    ? t("driver_detail.position_1")
                    : pos === 2
                      ? t("driver_detail.position_2")
                      : pos === 3
                        ? t("driver_detail.position_3")
                        : t("driver_detail.position_suffix", { pos });
                const dateStr = new Date(result.date)
                  .toLocaleDateString(undefined, { day: "numeric", month: "short" })
                  .toUpperCase();
                const podiumBg =
                  pos === 1
                    ? "from-pk-amber/20 to-pk-amber/5 border-pk-amber/30"
                    : pos <= 3
                      ? "from-pk-red/15 to-pk-red/5 border-pk-red/20"
                      : "from-white/[0.04] to-white/[0.02] border-white/[0.08]";

                return (
                  <div
                    key={result.race_id}
                    className={`flex-shrink-0 w-[120px] snap-start rounded-lg bg-gradient-to-b border p-3 ${podiumBg}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">{flag}</span>
                      <span className="font-heading text-[0.6rem] uppercase truncate">
                        {result.race_name}
                      </span>
                    </div>
                    <p className="font-data text-[0.5rem] text-pk-titane mb-1">{dateStr}</p>
                    <p
                      className={`font-display text-2xl font-bold ${pos === 1 ? "text-pk-amber" : pos <= 3 ? "text-pk-red" : "text-pk-piste"}`}
                    >
                      {posLabel}
                    </p>
                    {result.is_winner && (
                      <div className="mt-1.5">
                        <Trophy className="w-3.5 h-3.5 text-pk-amber" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Carriere F1 ── */}
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h2 className="font-heading text-sm uppercase tracking-wide mb-4">
            {t("driver_detail.f1_career")}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                value: f1Stats.world_championships || 0,
                label: t("driver_detail.titles"),
                color: "text-pk-gold",
              },
              {
                value: f1Stats.wins || 0,
                label: t("driver_detail.wins"),
                color: "text-pk-emerald",
              },
              {
                value: f1Stats.podiums || 0,
                label: t("driver_detail.podiums"),
                color: "text-pk-info",
              },
              {
                value: f1Stats.poles || 0,
                label: t("driver_detail.poles"),
                color: "text-purple-400",
              },
              {
                value: f1Stats.fastest_laps || 0,
                label: t("driver_detail.fastest_laps"),
                color: "text-pink-400",
              },
              {
                value: f1Stats.entries || 0,
                label: t("driver_detail.gp_entered"),
                color: "text-pk-piste",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center"
              >
                <p className={`font-data text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA Pronostiquer ── */}
        <motion.button
          onClick={() => navigate("/predictions")}
          className="w-full flex items-center justify-between p-4 rounded-lg bg-pk-red hover:bg-pk-red-hover transition-colors"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-heading text-sm uppercase text-white">
                {t("driver_detail.predict_performance")}
              </p>
              <p className="font-body text-xs text-white/70">{t("driver_detail.predict_desc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white font-heading text-xs uppercase">
            {t("driver_detail.predict_cta")} <ChevronRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* ── Equipe & Prochain GP ── */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          {/* Team card */}
          <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
            <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane mb-2">
              {t("driver_detail.team_contract")}
            </p>
            <div className="flex items-center gap-2">
              {teamLogoSrc && (
                <img src={teamLogoSrc} alt={driver.team} className="h-8 w-8 object-contain" />
              )}
              <div className="min-w-0">
                <p className="font-heading text-xs uppercase truncate">{driver.team}</p>
                <p className="font-body text-[0.6rem] text-pk-titane">
                  {t("driver_detail.contract_until", { year: contract.end_year || "?" })}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-pk-titane ml-auto shrink-0" />
            </div>
          </div>

          {/* Info card */}
          <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
            <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane mb-2">
              {t("driver_detail.useful_info")}
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pk-anthracite flex items-center justify-center shrink-0">
                <Flag className="w-4 h-4 text-pk-titane" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-xs uppercase truncate">{driver.country_name}</p>
                <p className="font-body text-[0.6rem] text-pk-titane">
                  {f1Stats.entries || 0} {t("driver_detail.gp_entered")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Useful facts (compact) ── */}
        {driver.useful_facts?.length > 0 && (
          <motion.div
            className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            {...rmProps}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="font-heading text-sm uppercase tracking-wide mb-3">
              {t("driver_detail.did_you_know")}
            </h2>
            <div className="space-y-2">
              {driver.useful_facts
                .slice(0, 5)
                .map((fact: { title: string; text: string }, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white/[0.02] border-l-2"
                    style={{ borderLeftColor: colors.primary }}
                  >
                    <p className="font-display text-xs">{fact.title}</p>
                    <p className="font-body text-xs text-pk-titane mt-0.5">{fact.text}</p>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </DriverPageShell>
  );
}
