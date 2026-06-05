/**
 * DriverDetailPage — Immersive driver profile (Broadcast Premium).
 *
 * Layout mirrors the race detail page: full-width hero banner with driver
 * photo, team branding, then content sections below. No tabs — everything
 * is visible in a single scroll.
 *
 * Design reference: figma maquettes dark/light (June 2026).
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
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
import { getTeamMeta } from "@/lib/teamLogos";
import { haptic } from "@/lib/haptics";
import { getReducedMotionProps } from "@/lib/motion";

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
  const cx = 100;
  const cy = 100;
  const maxR = 70;

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
    <svg viewBox="0 0 200 200" className="w-full max-w-[160px]">
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
        const p = getPoint(i, 1.22);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-pk-titane"
            style={{
              fontSize: "6px",
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

/* ── Component ─────────────────────────────────────────── */

export default function DriverDetailPage() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const { loading, driver, error } = useDriverDetailData(driverId);

  useEffect(() => {
    if (error) {
      toast.error("Impossible de charger les infos du pilote");
      navigate("/championship");
    }
  }, [error, navigate]);

  if (loading) return <DriverDetailSkeleton />;

  if (!driver) {
    return (
      <div className="min-h-screen bg-pk-carbon flex items-center justify-center">
        <div className="text-center">
          <User className="w-10 h-10 text-pk-titane mx-auto mb-3" />
          <p className="text-sm text-pk-titane">Pilote introuvable</p>
        </div>
      </div>
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
    { label: "Vitesse", value: Math.min(100, 60 + (f1Stats.poles || 0) * 2) },
    { label: "Depassements", value: Math.min(100, 50 + (f1Stats.wins || 0) * 3) },
    { label: "Regularite", value: Math.min(100, 40 + (f1Stats.podiums || 0)) },
    { label: "Gestion pneus", value: Math.min(100, 55 + (f1Stats.fastest_laps || 0) * 3) },
    { label: "Qualifications", value: Math.min(100, 60 + (f1Stats.poles || 0) * 3) },
  ];

  // Points forts (synthetic scores)
  const pointsForts = [
    { label: "Qualifications", value: radarStats[4].value, color: colors.primary },
    { label: "Gestion pneus", value: radarStats[3].value, color: colors.primary },
    { label: "Depassements", value: radarStats[1].value, color: colors.primary },
  ];

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="driver-detail-page">
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}08 40%, #0B0D12 100%)`,
        }}
        {...rmProps}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Giant number watermark */}
        <div
          className="absolute top-6 right-4 font-display text-[180px] leading-none font-bold pointer-events-none select-none"
          style={{ color: `${colors.primary}10` }}
        >
          {driver.number}
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-pk-piste hover:text-white transition-colors"
            aria-label="Retour"
            data-testid="driver-back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-heading text-sm uppercase">Pilotes</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic("light");
                navigate(`/compare?d1=${driver.id}`);
              }}
              className="p-2 bg-pk-carbon/40 backdrop-blur-sm rounded-lg text-pk-titane hover:text-white transition-colors"
              aria-label="Comparer"
              title="Comparer avec un autre pilote"
              data-testid="driver-compare"
            >
              <GitCompare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero content: info left, photo right */}
        <div className="relative z-10 flex items-end px-4 pb-6 pt-4 min-h-[340px]">
          {/* Left column: team + name + meta */}
          <div className="flex-1 min-w-0 pb-2">
            {/* Team badge */}
            <div className="flex items-center gap-2 mb-3">
              {teamLogoSrc && (
                <img src={teamLogoSrc} alt={driver.team} className="h-8 w-8 object-contain" />
              )}
              <span className="font-data text-[0.6rem] uppercase tracking-[0.14em] text-pk-piste">
                {driver.team}
              </span>
            </div>

            {/* Number */}
            <p className="font-data text-xl font-bold" style={{ color: colors.primary }}>
              #{driver.number}
            </p>

            {/* Name */}
            <h1 className="font-display text-3xl sm:text-4xl leading-[0.95] uppercase mt-1">
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
            <div className="flex gap-5 mt-4">
              {age && (
                <div>
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    Age
                  </p>
                  <p className="font-data text-base font-bold text-pk-piste">{age} ANS</p>
                </div>
              )}
              {height && (
                <div className="border-l border-white/[0.08] pl-5">
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    Taille
                  </p>
                  <p className="font-data text-base font-bold text-pk-piste">{height}</p>
                </div>
              )}
              {debutYear && (
                <div className="border-l border-white/[0.08] pl-5">
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    Depuis
                  </p>
                  <p className="font-data text-base font-bold text-pk-piste">{debutYear}</p>
                </div>
              )}
            </div>

            {/* Follow button */}
            <button
              onClick={() => {
                haptic("medium");
                toast.success("Pilote suivi !");
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-pk-red/40 text-pk-red font-data text-xs uppercase tracking-wider hover:bg-pk-red/10 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              Suivi
            </button>
          </div>

          {/* Right column: driver photo */}
          <motion.div
            className="relative shrink-0 w-[45%] max-w-[220px]"
            {...rmProps}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
          >
            <img
              src={driver.photo_url}
              alt={driver.full_name}
              className="w-full h-auto object-cover object-top"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.src =
                  "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback_image.png.transform/1col/image.png";
              }}
            />
          </motion.div>
        </div>

        {/* Diagonal stripes overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 20px, ${colors.primary} 20px, ${colors.primary} 21px)`,
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
            Saison {new Date().getFullYear()}
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <Trophy className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">Classement</p>
              <p className="font-data text-2xl font-bold text-pk-piste">
                {f1Stats.world_championships > 0 ? "1" : "-"}
                <sup className="text-xs font-normal text-pk-titane">e</sup>
              </p>
              <p className="font-data text-[0.5rem] text-pk-red">{f1Stats.points || 0} PTS</p>
            </div>
            <div>
              <Flag className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">Podiums</p>
              <p className="font-data text-2xl font-bold text-pk-piste">{f1Stats.podiums || 0}</p>
              <p className="font-data text-[0.5rem] text-pk-titane">/ {f1Stats.entries || 0} GP</p>
            </div>
            <div>
              <MapPin className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">Meilleur resultat</p>
              <p className="font-data text-2xl font-bold text-pk-piste">
                1<sup className="text-xs font-normal text-pk-titane">er</sup>
              </p>
              <p className="font-data text-[0.5rem]" style={{ color: colors.primary }}>
                {f1Stats.wins || 0} victoires
              </p>
            </div>
            <div>
              <Clock className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">Points moyen</p>
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
          <h2 className="font-heading text-sm uppercase tracking-wide mb-4">Points forts</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 flex-1">
              {pointsForts.map((pf) => (
                <CircularProgress
                  key={pf.label}
                  value={pf.value}
                  label={pf.label}
                  color={pf.color}
                />
              ))}
            </div>
            <div className="shrink-0">
              <RadarChart stats={radarStats} color={colors.primary} />
            </div>
          </div>
        </motion.div>

        {/* ── Carriere F1 ── */}
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h2 className="font-heading text-sm uppercase tracking-wide mb-4">Carriere F1</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: f1Stats.world_championships || 0, label: "Titres", color: "text-pk-gold" },
              { value: f1Stats.wins || 0, label: "Victoires", color: "text-pk-emerald" },
              { value: f1Stats.podiums || 0, label: "Podiums", color: "text-pk-info" },
              { value: f1Stats.poles || 0, label: "Poles", color: "text-purple-400" },
              {
                value: f1Stats.fastest_laps || 0,
                label: "Meilleurs tours",
                color: "text-pink-400",
              },
              { value: f1Stats.entries || 0, label: "GP disputes", color: "text-pk-piste" },
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
                Pronostiquez ses performances
              </p>
              <p className="font-body text-xs text-white/70">
                Gagnez des points en anticipant ses resultats
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white font-heading text-xs uppercase">
            Pronostiquer <ChevronRight className="w-4 h-4" />
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
              Equipe & Contract
            </p>
            <div className="flex items-center gap-2">
              {teamLogoSrc && (
                <img src={teamLogoSrc} alt={driver.team} className="h-8 w-8 object-contain" />
              )}
              <div className="min-w-0">
                <p className="font-heading text-xs uppercase truncate">{driver.team}</p>
                <p className="font-body text-[0.6rem] text-pk-titane">
                  Contrat jusqu'en {contract.end_year || "?"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-pk-titane ml-auto shrink-0" />
            </div>
          </div>

          {/* Info card */}
          <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
            <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane mb-2">
              Infos utiles
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pk-anthracite flex items-center justify-center shrink-0">
                <Flag className="w-4 h-4 text-pk-titane" />
              </div>
              <div className="min-w-0">
                <p className="font-heading text-xs uppercase truncate">{driver.country_name}</p>
                <p className="font-body text-[0.6rem] text-pk-titane">
                  {f1Stats.entries || 0} GP disputes
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
            <h2 className="font-heading text-sm uppercase tracking-wide mb-3">Le saviez-vous ?</h2>
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
    </div>
  );
}
