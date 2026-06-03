/**
 * RaceDetailHero — Immersive banner for the Grand Prix detail page.
 *
 * Uses the race thumbnail illustration with a layered gradient + subtle
 * parallax-ready zoom, the GP identity, and a state-aware prediction CTA:
 *   - upcoming & open, no prediction      → "Pronostiquer"
 *   - upcoming & open, has prediction      → "Modifier mes pronostics"
 *   - race started / finished              → locked (read-only)
 *   - cancelled                            → cancelled
 */
import { ArrowRight, Pencil, Lock, Ban, Trophy, MapPin, CalendarDays } from "lucide-react";
import { getRaceThumbnail } from "@/lib/raceThumbnails";

interface RaceDetailHeroProps {
  name: string;
  circuit: string;
  country: string;
  flag: string;
  date?: string | null;
  thumbnailRace: Parameters<typeof getRaceThumbnail>[0];
  status?: string;
  isCancelled?: boolean;
  canPredict?: boolean;
  hasPrediction?: boolean;
  isSprintWeekend?: boolean;
  onPredict: () => void;
  onResults: () => void;
}

function shortName(name: string): string {
  return name
    .replace("Grand Prix de ", "")
    .replace("Grand Prix du ", "")
    .replace("Grand Prix d'", "")
    .replace(" Grand Prix", "")
    .replace("Grand Prix ", "");
}

export default function RaceDetailHero({
  name,
  circuit,
  flag,
  date,
  thumbnailRace,
  status,
  isCancelled,
  canPredict,
  hasPrediction,
  isSprintWeekend,
  onPredict,
  onResults,
}: RaceDetailHeroProps) {
  const thumb = getRaceThumbnail(thumbnailRace);
  const started = status === "in_progress";
  const finished = status === "finished";
  const locked = !isCancelled && (started || finished || canPredict === false);

  const dateLabel = date
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(date),
      )
    : null;

  return (
    <section
      className="relative -mt-px overflow-hidden border-b border-white/[0.08]"
      data-testid="race-detail-hero"
    >
      {/* Illustration */}
      <div className="absolute inset-0">
        {thumb ? (
          <img
            src={thumb}
            alt={name}
            className="h-full w-full object-cover object-center motion-safe:animate-[heroZoom_18s_ease-in-out_infinite_alternate]"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#1a0000] via-pk-surface to-pk-anthracite" />
        )}
        {/* Layered gradients for depth + legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-pk-carbon via-pk-carbon/55 to-pk-carbon/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-pk-carbon/70 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-[1] flex flex-col justify-end px-4 pb-4 pt-28">
        <div className="flex items-center gap-2">
          {isSprintWeekend && (
            <span className="rounded-sm border border-pk-amber/30 bg-pk-amber/15 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] text-pk-amber">
              Week-end Sprint
            </span>
          )}
          {finished && (
            <span className="rounded-sm border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] text-pk-titane">
              Terminé
            </span>
          )}
          {started && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-pk-red/35 bg-pk-red/15 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] text-pk-red">
              <span className="h-1 w-1 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-pk-red" />
              En direct
            </span>
          )}
        </div>

        <h1 className="mt-1.5 font-display text-[1.75rem] uppercase leading-[1.05] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          <span className="text-[1.25rem] mr-1.5">{flag}</span>
          {shortName(name)}
        </h1>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1 font-mono text-[0.6875rem] text-pk-piste/90">
            <MapPin className="h-3 w-3 text-pk-red" /> {circuit}
          </span>
          {dateLabel && (
            <span className="flex items-center gap-1 font-mono text-[0.6875rem] text-pk-piste/90">
              <CalendarDays className="h-3 w-3 text-pk-info" /> {dateLabel}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-4">
          {isCancelled ? (
            <div className="flex h-12 items-center justify-center gap-2 rounded-lg border border-pk-amber/25 bg-pk-amber/10 font-display text-sm text-pk-amber">
              <Ban className="h-4 w-4" /> Course annulée
            </div>
          ) : finished ? (
            <button
              onClick={onResults}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white/[0.06] font-display text-sm text-pk-piste transition-transform active:scale-[0.98] hover:bg-white/[0.1]"
              data-testid="race-hero-results-btn"
            >
              <Trophy className="h-4 w-4 text-pk-gold" /> Voir les résultats
            </button>
          ) : locked ? (
            <div
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] font-display text-sm text-pk-titane"
              data-testid="race-hero-locked"
            >
              <Lock className="h-4 w-4" /> Pronostics verrouillés
            </div>
          ) : hasPrediction ? (
            <button
              onClick={onPredict}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-pk-amber/40 bg-pk-amber/10 font-display text-sm text-pk-amber transition-transform active:scale-[0.98] hover:bg-pk-amber/15"
              data-testid="race-hero-modify-btn"
            >
              <Pencil className="h-4 w-4" /> Modifier mes pronostics
            </button>
          ) : (
            <button
              onClick={onPredict}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pk-red font-display text-sm text-white shadow-glow-red transition-transform active:scale-[0.98]"
              data-testid="race-hero-predict-btn"
            >
              <ArrowRight className="h-4 w-4" /> Pronostiquer
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
