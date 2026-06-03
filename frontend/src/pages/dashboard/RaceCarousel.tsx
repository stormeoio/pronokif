/**
 * RaceCarousel — Horizontal calendar carousel for the dashboard home.
 *
 * Order: upcoming races first (chronological), then past / cancelled races at
 * the end (chronological). Each card surfaces its prediction status so the user
 * can spot at a glance which races still need predictions. A range slider below
 * acts as a fluid scrollbar synced two-ways with the scroll position.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, AlertCircle, Check, Ban, Trophy, ChevronRight } from "lucide-react";
import { getRaceThumbnail } from "@/lib/raceThumbnails";
import { haptic } from "@/lib/haptics";
import type { Race } from "@/types/api";

// ── Country flag (by API country name) ──────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  Australia: "🇦🇺",
  China: "🇨🇳",
  Japan: "🇯🇵",
  Bahrain: "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  USA: "🇺🇸",
  "United States": "🇺🇸",
  Italy: "🇮🇹",
  Monaco: "🇲🇨",
  Spain: "🇪🇸",
  Canada: "🇨🇦",
  Austria: "🇦🇹",
  UK: "🇬🇧",
  "United Kingdom": "🇬🇧",
  "Great Britain": "🇬🇧",
  Belgium: "🇧🇪",
  Hungary: "🇭🇺",
  Netherlands: "🇳🇱",
  Azerbaijan: "🇦🇿",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Brazil: "🇧🇷",
  Qatar: "🇶🇦",
  UAE: "🇦🇪",
  "United Arab Emirates": "🇦🇪",
};

function raceFlag(race: Race): string {
  return COUNTRY_FLAG[race.country] ?? "🏁";
}

function shortName(name: string): string {
  return name
    .replace("Grand Prix de ", "")
    .replace("Grand Prix du ", "")
    .replace("Grand Prix d'", "")
    .replace(" Grand Prix", "")
    .replace("Grand Prix ", "");
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
}

// ── Per-race status derivation ──────────────────────────────────────
type CardState = "needs-prediction" | "predicted" | "finished" | "cancelled" | "locked";

function deriveState(race: Race, predicted: boolean): CardState {
  if (race.status === "cancelled" || race.is_cancelled) return "cancelled";
  if (race.status === "finished") return "finished";
  // upcoming / in_progress
  if (predicted) return "predicted";
  if (race.can_predict === false) return "locked";
  return "needs-prediction";
}

const STATE_META: Record<
  CardState,
  { label: string; cls: string; Icon: typeof Check; accent: string }
> = {
  "needs-prediction": {
    label: "À pronostiquer",
    cls: "border-pk-red/40 bg-pk-red/15 text-pk-red",
    Icon: AlertCircle,
    accent: "var(--pk-red)",
  },
  predicted: {
    label: "Prono fait",
    cls: "border-pk-emerald/30 bg-pk-emerald/12 text-pk-emerald",
    Icon: Check,
    accent: "#10b981",
  },
  finished: {
    label: "Terminé",
    cls: "border-white/[0.12] bg-white/[0.06] text-pk-titane",
    Icon: Trophy,
    accent: "rgba(255,255,255,0.18)",
  },
  cancelled: {
    label: "Annulé",
    cls: "border-pk-amber/25 bg-pk-amber/10 text-pk-amber",
    Icon: Ban,
    accent: "var(--pk-amber)",
  },
  locked: {
    label: "Pronos fermés",
    cls: "border-white/[0.12] bg-white/[0.06] text-pk-titane",
    Icon: Ban,
    accent: "rgba(255,255,255,0.18)",
  },
};

interface RaceCarouselProps {
  races: Race[];
  predictedRaceIds: string[];
}

export default function RaceCarousel({ races, predictedRaceIds }: RaceCarouselProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  const predictedSet = useMemo(
    () => new Set(Array.isArray(predictedRaceIds) ? predictedRaceIds : []),
    [predictedRaceIds],
  );

  // Order: upcoming (chronological) → past + cancelled (chronological)
  const ordered = useMemo(() => {
    const byDate = (a: Race, b: Race) => new Date(a.date).getTime() - new Date(b.date).getTime();
    const upcoming = races
      .filter((r) => r.status === "upcoming" || r.status === "in_progress")
      .sort(byDate);
    const past = races
      .filter((r) => r.status === "finished" || r.status === "cancelled" || r.is_cancelled)
      .sort(byDate);
    return [...upcoming, ...past];
  }, [races]);

  const missingCount = useMemo(
    () =>
      ordered.filter((r) => deriveState(r, predictedSet.has(String(r.id))) === "needs-prediction")
        .length,
    [ordered, predictedSet],
  );

  // ── Scroll ↔ slider sync ──
  const recalc = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollable(max > 4);
    setProgress(max > 0 ? (el.scrollLeft / max) * 100 : 0);
  }, []);

  useEffect(() => {
    recalc();
    const el = scrollRef.current;
    if (!el) return;
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalc, ordered.length]);

  const onSliderChange = (value: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Instant (no smooth-scroll animation) so the scrubber tracks the thumb 1:1.
    el.scrollLeft = (value / 100) * max;
    setProgress(value);
  };

  // While dragging the slider, suspend scroll-snap so the carousel follows the
  // thumb continuously; restore it on release so it settles on the nearest card.
  const setScrubbing = useCallback((active: boolean) => {
    const el = scrollRef.current;
    if (el) el.style.scrollSnapType = active ? "none" : "";
  }, []);

  if (ordered.length === 0) {
    return (
      <div className="rounded-md border border-white/[0.08] bg-pk-surface p-6 text-center">
        <CalendarDays className="mx-auto mb-2 h-6 w-6 text-pk-titane" strokeWidth={1.5} />
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-pk-titane">
          Calendrier indisponible
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Calendrier des Grands Prix">
      {/* Header */}
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h2 className="font-display text-[1rem] uppercase leading-none">Le calendrier</h2>
          {missingCount > 0 ? (
            <p className="mt-1 flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-red">
              <span className="h-1.5 w-1.5 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-pk-red" />
              {missingCount} course{missingCount > 1 ? "s" : ""} à pronostiquer
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-emerald">
              <Check className="h-3 w-3" strokeWidth={2.5} />
              Tu es à jour
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/predictions")}
          className="flex items-center gap-1 font-mono text-[0.6875rem] text-pk-red"
        >
          Tout voir
          <ChevronRight size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Carousel — one large centered card, neighbours peeking ~16px.
          Card width = scroller width − 56px (= 2×(16px peek + 12px gap)), so the
          fixed px-7 (28px) side padding centers it exactly. Scroller spans the
          430px column (or the viewport when narrower), hence min(100vw, 430px). */}
      <div
        ref={scrollRef}
        onScroll={recalc}
        style={{ ["--pk-card-w" as string]: "min(100vw - 56px, 374px)" }}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-7 pb-1 scrollbar-hide"
        data-testid="race-carousel"
      >
        {ordered.map((race, i) => {
          const state = deriveState(race, predictedSet.has(String(race.id)));
          const meta = STATE_META[state];
          const { Icon } = meta;
          const isPast = state === "finished" || state === "cancelled";
          const thumb = getRaceThumbnail(race);
          const target =
            state === "needs-prediction" ? `/predictions/${race.id}` : `/race/${race.id}`;
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => {
                haptic("light");
                navigate(target);
              }}
              className={`group relative flex w-[var(--pk-card-w)] flex-shrink-0 snap-center flex-col
                overflow-hidden rounded-lg border bg-pk-surface text-left
                transition-all duration-pk-short active:scale-[0.985]
                ${
                  state === "needs-prediction"
                    ? "border-pk-red/45 shadow-[0_0_0_1px_rgba(225,6,0,0.2),0_12px_30px_-12px_rgba(225,6,0,0.4)] hover:border-pk-red/65"
                    : "border-white/[0.08] hover:border-white/[0.18]"
                }`}
              data-testid={`race-card-${race.id}`}
              data-state={state}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={race.name}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${
                      isPast ? "opacity-55 grayscale-[0.4]" : ""
                    }`}
                  />
                ) : (
                  <div className="h-full w-full bg-pk-anthracite" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-pk-surface via-pk-surface/20 to-transparent" />

                {/* Round counter */}
                <span className="absolute left-2 top-2 rounded-full bg-pk-carbon/70 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold text-pk-piste backdrop-blur-sm">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Status badge */}
                <span
                  className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.06em] backdrop-blur-sm ${meta.cls}`}
                >
                  {state === "needs-prediction" && (
                    <span className="h-1 w-1 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-pk-red" />
                  )}
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                  {meta.label}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-2">
                <p className="flex items-center gap-1.5 font-display text-[1.0625rem] uppercase leading-tight text-pk-piste">
                  <span className="text-[1.125rem]">{raceFlag(race)}</span>
                  <span className="truncate">{shortName(race.name)}</span>
                </p>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-pk-titane">
                  {formatShortDate(race.date)}
                  {race.is_sprint_weekend ? (
                    <span className="ml-1 text-pk-amber">· Sprint</span>
                  ) : null}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Range slider scrollbar */}
      {scrollable && (
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={(e) => onSliderChange(Number(e.target.value))}
          onPointerDown={() => setScrubbing(true)}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          onBlur={() => setScrubbing(false)}
          aria-label="Faire défiler le calendrier"
          className="pk-carousel-range mx-auto mt-3 block h-[3px] w-[42%] cursor-pointer appearance-none rounded-full opacity-60 transition-opacity hover:opacity-100"
          style={{
            background: `linear-gradient(to right, rgba(225,6,0,0.7) ${progress}%, rgba(255,255,255,0.10) ${progress}%)`,
          }}
          data-testid="race-carousel-slider"
        />
      )}
    </section>
  );
}
