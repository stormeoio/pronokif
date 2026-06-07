/**
 * RaceDetailHero — Immersive banner for the Grand Prix detail page.
 *
 * Layout: a big centered GP/circuit name, a discreet sub-line (country flag +
 * country name + local date & time in the visitor's timezone), a discreet
 * integrated countdown to the next session, and a state-aware prediction CTA:
 *   - upcoming & open, no prediction      → "Pronostiquer"
 *   - upcoming & open, has prediction      → "Modifier mes pronostics"
 *   - race started / finished              → locked (read-only)
 *   - cancelled                            → cancelled
 */
import { useTranslation } from "react-i18next";
import { ArrowRight, Pencil, Lock, Ban, Trophy, Timer } from "lucide-react";
import { getRaceThumbnail } from "@/lib/raceThumbnails";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface RaceDetailHeroProps {
  name: string;
  country: string;
  flag: string;
  date?: string | null;
  thumbnailRace: Parameters<typeof getRaceThumbnail>[0];
  status?: string;
  isCancelled?: boolean;
  canPredict?: boolean;
  hasPrediction?: boolean;
  isSprintWeekend?: boolean;
  /** Live countdown to the next upcoming session (null when none / finished). */
  countdown?: Countdown | null;
  /** Translated label of the session being counted down to (e.g. "Course"). */
  countdownLabel?: string;
  onPredict: () => void;
  onResults: () => void;
  /** Jump to the live results section (race in progress). */
  onFollowLive?: () => void;
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
  country,
  flag,
  date,
  thumbnailRace,
  status,
  isCancelled,
  canPredict,
  hasPrediction,
  isSprintWeekend,
  countdown,
  countdownLabel,
  onPredict,
  onResults,
  onFollowLive,
}: RaceDetailHeroProps) {
  const { t, i18n } = useTranslation();
  const thumb = getRaceThumbnail(thumbnailRace);
  const started = status === "in_progress";
  const finished = status === "finished";
  const locked = !isCancelled && (started || finished || canPredict === false);

  // Date + time rendered in the *visitor's* local timezone (no timeZone option
  // → runtime locale TZ), with the zone abbreviation so it's unambiguous.
  const parsed = date ? new Date(date) : null;
  const validDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const dateTimeLabel = validDate
    ? new Intl.DateTimeFormat(i18n.language || "fr", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(validDate)
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

      {/* Content — tall, immersive header anchored to the bottom */}
      <div className="relative z-[1] flex min-h-[56vh] flex-col justify-end px-4 pb-5 pt-40">
        <div className="flex items-center justify-center gap-2">
          {isSprintWeekend && (
            <span className="rounded-sm border border-pk-amber/30 bg-pk-amber/15 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] text-pk-amber">
              {t("race_hero.sprint_badge")}
            </span>
          )}
          {finished && (
            <span className="rounded-sm border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] text-pk-titane">
              {t("race_hero.status.finished")}
            </span>
          )}
          {started && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-pk-red/35 bg-pk-red/15 px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.12em] text-pk-red">
              <span className="h-1 w-1 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-pk-red" />
              {t("race_hero.status.live")}
            </span>
          )}
        </div>

        {/* Big centered GP / circuit name */}
        <h1 className="mt-1.5 text-center font-race text-[3.5rem] font-bold italic uppercase leading-[0.88] tracking-[0.01em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          {shortName(name)}
        </h1>

        {/* Discreet meta — flag + country + local date & time */}
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center font-data text-[0.6875rem] text-pk-piste/80">
          <span className="text-sm leading-none">{flag}</span>
          <span className="uppercase tracking-[0.06em] text-pk-piste/90">{country}</span>
          {dateTimeLabel && (
            <>
              <span className="text-pk-titane">·</span>
              <span className="tabular-nums">{dateTimeLabel}</span>
            </>
          )}
        </p>

        {/* Discreet integrated countdown to the next session */}
        {countdown && (
          <div className="mt-2.5 flex justify-center" data-testid="race-hero-countdown">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-pk-carbon/50 px-3 py-1 backdrop-blur-sm">
              <Timer className="h-3 w-3 text-pk-red" strokeWidth={2} />
              {countdownLabel && (
                <span className="font-data text-[0.5625rem] uppercase tracking-[0.1em] text-pk-titane">
                  {t("grand_prix.countdown_in", { session: countdownLabel })}
                </span>
              )}
              <span className="font-data text-[0.8125rem] font-bold tabular-nums text-pk-piste">
                {countdown.days > 0 && (
                  <>
                    {countdown.days}
                    {t("race_hero.countdown.d")}{" "}
                  </>
                )}
                {String(countdown.hours).padStart(2, "0")}
                {t("race_hero.countdown.h")} {String(countdown.minutes).padStart(2, "0")}
                {t("race_hero.countdown.m")} {String(countdown.seconds).padStart(2, "0")}
                {t("race_hero.countdown.s")}
              </span>
            </span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4">
          {isCancelled ? (
            <div className="flex h-12 items-center justify-center gap-2 rounded-lg border border-pk-amber/25 bg-pk-amber/10 font-display text-sm text-pk-amber">
              <Ban className="h-4 w-4" /> {t("race_hero.status.cancelled")}
            </div>
          ) : finished ? (
            <button
              onClick={onResults}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white/[0.06] font-display text-sm text-pk-piste transition-transform active:scale-[0.98] hover:bg-white/[0.1]"
              data-testid="race-hero-results-btn"
            >
              <Trophy className="h-4 w-4 text-pk-gold" /> {t("race_hero.cta.results")}
            </button>
          ) : started ? (
            <button
              onClick={onFollowLive}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pk-red font-display text-sm text-white shadow-glow-red transition-transform active:scale-[0.98]"
              data-testid="race-hero-live-btn"
            >
              <span className="h-2 w-2 animate-[pulse-dot_1.5s_ease-in-out_infinite] rounded-full bg-white" />
              {t("race_hero.cta.follow_live")}
            </button>
          ) : locked ? (
            <div
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.04] font-display text-sm text-pk-titane"
              data-testid="race-hero-locked"
            >
              <Lock className="h-4 w-4" /> {t("race_hero.cta.locked")}
            </div>
          ) : hasPrediction ? (
            <button
              onClick={onPredict}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-pk-amber/40 bg-pk-amber/10 font-display text-sm text-pk-amber transition-transform active:scale-[0.98] hover:bg-pk-amber/15"
              data-testid="race-hero-modify-btn"
            >
              <Pencil className="h-4 w-4" /> {t("race_hero.cta.edit")}
            </button>
          ) : (
            <button
              onClick={onPredict}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pk-red font-display text-sm text-white shadow-glow-red transition-transform active:scale-[0.98]"
              data-testid="race-hero-predict-btn"
            >
              <ArrowRight className="h-4 w-4" /> {t("race_hero.cta.predict")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
