import { ArrowRight, Clock } from "lucide-react";
import { BorderGlowButton } from "@/components/ui/border-glow-button";
import { iconSmall } from "@/lib/icons";
import { getRaceThumbnail } from "@/lib/raceThumbnails";

// ----------------------------------------------------------- types ---

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  phase?: "upcoming" | "in_progress" | "finished" | "cancelled";
}

interface RaceHeroCardProps {
  race:
    | {
        id: string | number;
        name: string;
        circuit: string;
        date: string;
        race_start_at?: string | null;
        race_end_at?: string | null;
        timezone?: string | null;
        race_duration_minutes?: number | null;
        status?: "upcoming" | "in_progress" | "finished" | "cancelled";
        can_predict?: boolean;
        is_sprint_weekend?: boolean;
        thumbnail_url?: string | null;
      }
    | undefined;
  countdown: CountdownValues;
  hasPrediction: boolean;
  onPredict: () => void;
  onViewDetails: () => void;
}

// ----------------------------------------------------------- helpers ---

/** Country flag emoji from race name (simplified mapping) */
function getRaceFlag(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("monaco")) return "\u{1F1F2}\u{1F1E8}";
  if (n.includes("espagne") || n.includes("spain") || n.includes("barcelona"))
    return "\u{1F1EA}\u{1F1F8}";
  if (n.includes("france") || n.includes("paul ricard")) return "\u{1F1EB}\u{1F1F7}";
  if (n.includes("itali") || n.includes("monza") || n.includes("imola") || n.includes("emili"))
    return "\u{1F1EE}\u{1F1F9}";
  if (n.includes("grande-bretagne") || n.includes("britain") || n.includes("silverstone"))
    return "\u{1F1EC}\u{1F1E7}";
  if (n.includes("miami") || n.includes("las vegas") || n.includes("austin") || n.includes("usa"))
    return "\u{1F1FA}\u{1F1F8}";
  if (n.includes("canada") || n.includes("montreal")) return "\u{1F1E8}\u{1F1E6}";
  if (n.includes("australi") || n.includes("melbourne")) return "\u{1F1E6}\u{1F1FA}";
  if (n.includes("japon") || n.includes("japan") || n.includes("suzuka"))
    return "\u{1F1EF}\u{1F1F5}";
  if (n.includes("bahre") || n.includes("bahrain") || n.includes("sakhir"))
    return "\u{1F1E7}\u{1F1ED}";
  if (n.includes("saudi") || n.includes("arabie") || n.includes("jeddah"))
    return "\u{1F1F8}\u{1F1E6}";
  if (n.includes("chine") || n.includes("china") || n.includes("shanghai"))
    return "\u{1F1E8}\u{1F1F3}";
  if (n.includes("pays-bas") || n.includes("netherland") || n.includes("zandvoort"))
    return "\u{1F1F3}\u{1F1F1}";
  if (n.includes("belgi") || n.includes("spa")) return "\u{1F1E7}\u{1F1EA}";
  if (n.includes("hongrie") || n.includes("hungar") || n.includes("budapest"))
    return "\u{1F1ED}\u{1F1FA}";
  if (n.includes("singap")) return "\u{1F1F8}\u{1F1EC}";
  if (n.includes("mexiq") || n.includes("mexico")) return "\u{1F1F2}\u{1F1FD}";
  if (n.includes("bresil") || n.includes("brazil") || n.includes("interlagos"))
    return "\u{1F1E7}\u{1F1F7}";
  if (n.includes("qatar")) return "\u{1F1F6}\u{1F1E6}";
  if (n.includes("abu dhabi") || n.includes("yas")) return "\u{1F1E6}\u{1F1EA}";
  if (n.includes("autriche") || n.includes("austria") || n.includes("spielberg"))
    return "\u{1F1E6}\u{1F1F9}";
  if (n.includes("azerba") || n.includes("baku")) return "\u{1F1E6}\u{1F1FF}";
  return "\u{1F3C1}";
}

// ----------------------------------------------------------- component ---

export default function RaceHeroCard({
  race,
  countdown,
  hasPrediction,
  onPredict,
  onViewDetails,
}: RaceHeroCardProps) {
  if (!race) return null;

  const flag = getRaceFlag(race.name);
  const raceName = race.name
    .replace("Grand Prix de ", "")
    .replace("Grand Prix du ", "")
    .replace("Grand Prix d'", "")
    .replace(" Grand Prix", "");
  const thumbnailUrl = getRaceThumbnail(race);

  const cdUnits = [
    { val: countdown.days, label: "Jours" },
    { val: countdown.hours, label: "Heures" },
    { val: countdown.minutes, label: "Min" },
    { val: countdown.seconds, label: "Sec" },
  ];
  const phase = countdown.phase ?? race.status ?? "upcoming";
  const isLive = phase === "in_progress";
  const isFinished = phase === "finished";
  const isCancelled = phase === "cancelled";
  const raceEndLabel = race.race_end_at
    ? new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: race.timezone || undefined,
      }).format(new Date(race.race_end_at))
    : null;

  return (
    <div
      className="relative rounded-lg overflow-hidden
        bg-gradient-to-br from-[#1a0000] via-pk-surface to-pk-anthracite
        border border-white/[0.08]"
      data-testid="race-hero-card"
    >
      {thumbnailUrl ? (
        <button
          type="button"
          onClick={onViewDetails}
          className="relative block w-full aspect-[16/9] overflow-hidden border-b border-white/[0.08]"
          aria-label={`View details for ${race.name}`}
        >
          <img
            src={thumbnailUrl}
            alt={`Vignette ${race.name}`}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-pk-carbon/90 via-pk-carbon/10 to-transparent" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-sm border border-pk-red/35 bg-pk-carbon/70 px-2 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-pk-red animate-[pulse-dot_2s_ease-in-out_infinite]" />
            <span className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-pk-piste">
              Prochain GP
            </span>
          </div>
        </button>
      ) : (
        <div
          className="absolute top-0 right-0 w-[200px] h-[200px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(225,6,0,0.1) 0%, transparent 70%)",
          }}
        />
      )}

      <div className="relative z-[1] p-5">
        {/* Badge */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-pk-red animate-[pulse-dot_2s_ease-in-out_infinite]" />
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.15em] text-pk-red">
            Prochain Grand Prix
          </span>
        </div>

        {/* Title */}
        <h2 className="font-display text-[1.375rem] uppercase leading-[1.15] mb-0.5">
          Grand Prix {race.name.includes("Grand Prix") ? "" : "de "}
          {raceName}
        </h2>
        <p className="text-[0.8125rem] text-pk-titane mb-4">
          <span className="text-[1.125rem] mr-1">{flag}</span>
          {race.circuit}
        </p>

        {/* Sprint badge */}
        {race.is_sprint_weekend && (
          <div
            className="inline-flex items-center gap-1 mb-3
              px-2 py-0.5 rounded-sm
              bg-pk-amber/10 border border-pk-amber/20
              font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-pk-amber"
          >
            Sprint Weekend
          </div>
        )}

        {/* Countdown */}
        {phase === "upcoming" ? (
          <div className="flex gap-2 mb-5">
            {cdUnits.map((u) => (
              <div
                key={u.label}
                className="flex flex-col items-center
                  bg-white/[0.03] border border-white/[0.08]
                  rounded-sm py-2 px-2.5 min-w-[52px]"
              >
                <span className="font-mono text-[1.375rem] font-bold text-pk-piste">
                  {String(u.val).padStart(2, "0")}
                </span>
                <span className="font-mono text-[0.5625rem] uppercase tracking-[0.15em] text-pk-titane mt-0.5">
                  {u.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`mb-5 rounded-sm border px-3 py-3 ${
              isLive
                ? "border-pk-red/35 bg-pk-red/10"
                : isFinished
                  ? "border-white/[0.1] bg-white/[0.04]"
                  : "border-pk-amber/25 bg-pk-amber/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isLive ? "bg-pk-red animate-[pulse-dot_2s_ease-in-out_infinite]" : "bg-pk-titane"
                }`}
              />
              <span
                className={`font-mono text-[0.75rem] uppercase tracking-[0.16em] ${
                  isLive ? "text-pk-red" : "text-pk-piste"
                }`}
              >
                {isCancelled ? "Race cancelled" : isLive ? "Race in progress" : "Race finished"}
              </span>
            </div>
            {isLive && raceEndLabel && (
              <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-pk-titane">
                Estimated finish {raceEndLabel} locale
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        {race.can_predict !== false && (
          <div className="flex items-center gap-2">
            {hasPrediction ? (
              <button onClick={onPredict} className="btn-pk-outline text-[0.8125rem] px-4">
                <Clock {...iconSmall} size={14} strokeWidth={2} />
                Edit my predictions
              </button>
            ) : (
              <BorderGlowButton
                onClick={onPredict}
                className="text-[0.8125rem] px-4"
                data-testid="make-predictions-btn"
              >
                <ArrowRight {...iconSmall} size={14} strokeWidth={2} />
                Pickstiquer
              </BorderGlowButton>
            )}
            <button onClick={onViewDetails} className="btn-pk-outline text-[0.75rem] px-3">
              Infos
            </button>
          </div>
        )}
        {race.can_predict === false && (
          <p className="font-mono text-[0.6875rem] text-pk-titane text-center">
            Predictions are closed for this race
          </p>
        )}
      </div>
    </div>
  );
}
