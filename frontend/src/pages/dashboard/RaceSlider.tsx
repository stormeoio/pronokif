/**
 * RaceSlider — Dashboard race card with countdown, navigation, CTA.
 * Broadcast Premium: pk-surface card, pk-red CTA, pk-amber sprint badge.
 */
import React, { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flag,
  Clock,
  ChevronRight,
  Zap,
  Target,
  Calendar,
  MapPin,
  ChevronLeft,
  Info,
} from "lucide-react";
import SocialProofBadge from "../../components/SocialProofBadge";
import OnboardingTooltip from "../../components/OnboardingTooltip";
import { getRaceThumbnail } from "@/lib/raceThumbnails";
import { haptic } from "@/lib/haptics";

const RaceCountdownOrb = lazy(() => import("../../components/three/RaceCountdownOrb"));

// GP Background images
const GP_BACKGROUNDS = {
  monaco:
    "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png",
  default:
    "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png",
};

function getGPBackground(raceName: string | undefined): string {
  const name = raceName?.toLowerCase() || "";
  if (name.includes("monaco")) return GP_BACKGROUNDS.monaco;
  return GP_BACKGROUNDS.default;
}

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface Race {
  id: string | number;
  name: string;
  circuit: string;
  date: string;
  predictions_close_at: string;
  sprint_predictions_close_at?: string;
  is_sprint_weekend?: boolean;
  can_predict?: boolean;
  can_predict_sprint?: boolean;
  thumbnail_url?: string | null;
}

interface Prediction {
  id: string | number;
  [key: string]: unknown;
}

interface RaceSliderProps {
  upcomingRaces: Race[];
  currentRaceIndex: number;
  setCurrentRaceIndex: React.Dispatch<React.SetStateAction<number>>;
  currentRace: Race | undefined;
  currentPrediction: Prediction | null;
  countdown: CountdownValues;
  sprintCountdown: CountdownValues;
}

export default function RaceSlider({
  upcomingRaces,
  currentRaceIndex,
  setCurrentRaceIndex,
  currentRace,
  currentPrediction,
  countdown,
  sprintCountdown,
}: RaceSliderProps) {
  const navigate = useNavigate();

  const handlePrevRace = () => {
    if (currentRaceIndex > 0) {
      haptic("light");
      setCurrentRaceIndex((prev) => prev - 1);
    }
  };
  const handleNextRace = () => {
    if (currentRaceIndex < upcomingRaces.length - 1) {
      haptic("light");
      setCurrentRaceIndex((prev) => prev + 1);
    }
  };

  if (!upcomingRaces.length || !currentRace) return null;
  const raceThumbnail = getRaceThumbnail(currentRace);

  return (
    <div
      className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
      data-testid="race-slider"
    >
      {/* Slider Navigation Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06]">
        <button
          onClick={handlePrevRace}
          disabled={currentRaceIndex === 0}
          className={`p-1.5 rounded-lg transition-all ${
            currentRaceIndex === 0
              ? "text-pk-titane/30 cursor-not-allowed"
              : "text-pk-piste hover:bg-white/[0.06] active:scale-95"
          }`}
          data-testid="prev-race-btn"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {upcomingRaces.slice(0, 12).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                haptic("light");
                setCurrentRaceIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentRaceIndex
                  ? "bg-pk-red w-3"
                  : "bg-white/[0.15] w-1.5 hover:bg-white/[0.25]"
              }`}
              data-testid={`race-dot-${i}`}
            />
          ))}
          {upcomingRaces.length > 12 && (
            <span className="font-data text-[0.5rem] text-pk-titane ml-1">
              +{upcomingRaces.length - 12}
            </span>
          )}
        </div>
        <button
          onClick={handleNextRace}
          disabled={currentRaceIndex === upcomingRaces.length - 1}
          className={`p-1.5 rounded-lg transition-all ${
            currentRaceIndex === upcomingRaces.length - 1
              ? "text-pk-titane/30 cursor-not-allowed"
              : "text-pk-piste hover:bg-white/[0.06] active:scale-95"
          }`}
          data-testid="next-race-btn"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* GP Background */}
      <div
        className="relative h-40 bg-cover bg-center cursor-pointer group"
        style={{ backgroundImage: `url(${raceThumbnail || getGPBackground(currentRace.name)})` }}
        onClick={() => navigate(`/race/${currentRace.id}`)}
        data-testid="race-card-clickable"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-pk-surface group-hover:from-black/30 transition-all" />

        {/* Info button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/race/${currentRace.id}`);
          }}
          className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 text-white font-data text-[0.5625rem] hover:bg-white/20 transition-all z-10"
          data-testid="view-details-btn"
        >
          <Info className="w-3 h-3" /> Infos / Horaires
        </button>

        {/* Sprint badge */}
        {currentRace.is_sprint_weekend && (
          <div className="absolute top-12 right-3 bg-pk-amber text-pk-carbon font-display text-xs px-3 py-1 rounded-full shadow-glow-gold">
            SPRINT
          </div>
        )}

        {/* Race counter */}
        <div className="absolute top-3 left-3 bg-pk-carbon/60 backdrop-blur-sm text-white font-data text-[0.5625rem] px-2 py-1 rounded-full">
          {currentRaceIndex + 1}/{upcomingRaces.length}
        </div>

        {/* Race info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-data text-[0.5rem] text-pk-red uppercase tracking-widest mb-1 drop-shadow-lg">
            {currentRaceIndex === 0 ? "Prochain Grand Prix" : "Upcoming"}
          </p>
          <h2 className="font-display text-2xl text-white uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {currentRace.name.replace(" Grand Prix", "")}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="font-data text-[0.5625rem] text-white/80 flex items-center gap-1 drop-shadow-lg">
              <MapPin className="w-3 h-3 text-pk-red" /> {currentRace.circuit}
            </span>
            <span className="font-data text-[0.5625rem] text-white/80 flex items-center gap-1 drop-shadow-lg">
              <Calendar className="w-3 h-3 text-pk-info" />{" "}
              {new Date(currentRace.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Countdown Section */}
      {currentRace.is_sprint_weekend ? (
        <div className="p-4 border-t border-white/[0.06] space-y-4">
          <CountdownRow
            label="Sprint Race"
            icon={<Zap className="w-4 h-4" />}
            subLabel="(closes 15 min before SQ1)"
            countdown={sprintCountdown}
            variant="sprint"
          />
          <CountdownRow
            label="Main Race"
            icon={<Flag className="w-4 h-4" />}
            subLabel="(closes 15 min before Q1)"
            countdown={countdown}
            variant="main"
          />
        </div>
      ) : currentRace.can_predict ? (
        <div className="p-3 border-t border-white/[0.06] flex items-center gap-3">
          <Suspense fallback={null}>
            <RaceCountdownOrb
              urgency={Math.max(0, Math.min(1, 1 - (countdown.days * 24 + countdown.hours) / 48))}
              className="flex-shrink-0"
            />
          </Suspense>
          <div className="flex-1">
            <CountdownRow
              label="Closes 15 min before Q1"
              icon={<Clock className="w-4 h-4" />}
              countdown={countdown}
              variant="main"
            />
          </div>
        </div>
      ) : null}

      {!currentRace.can_predict && !currentRace.is_sprint_weekend && (
        <div className="p-4 border-t border-white/[0.06] bg-pk-amber/[0.06]">
          <p className="text-sm text-center text-pk-amber">Predictions are closed for this race</p>
        </div>
      )}

      {/* Social Proof */}
      {!currentPrediction && currentRace.can_predict && (
        <div className="px-4 pt-2">
          <SocialProofBadge raceId={currentRace.id} />
        </div>
      )}

      {/* Prediction Status & CTA */}
      <div className="p-4">
        {currentPrediction ? (
          <div className="flex items-center justify-between bg-pk-emerald/[0.06] border border-pk-emerald/20 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pk-emerald/20 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-pk-emerald" />
              </div>
              <div>
                <span className="font-display text-xs text-pk-emerald">Predictions saved!</span>
                <p className="font-data text-[0.5rem] text-pk-titane">Good luck for this GP</p>
              </div>
            </div>
            {currentRace.can_predict && (
              <button
                onClick={() => {
                  haptic("light");
                  navigate(`/predictions/${currentRace.id}`);
                }}
                className="px-4 py-2 rounded-lg bg-pk-amber text-pk-carbon font-display text-xs active:scale-[0.97] transition-transform"
                data-testid="edit-prediction-btn"
              >
                Edit
              </button>
            )}
          </div>
        ) : currentRace.can_predict ? (
          <div className="relative">
            <OnboardingTooltip
              stepId="first-prediction"
              message="Start by picking the Top 10 of the next race! You earn XP for every pick."
              position="top"
              emoji=""
            />
            <button
              onClick={() => {
                haptic("medium");
                navigate(`/predictions/${currentRace.id}`);
              }}
              className="w-full h-12 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
              data-testid="make-predictions-btn"
            >
              <Target className="w-5 h-5" /> FAIRE MES PRONOS
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-pk-titane">Predictions closed</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- CountdownRow ------------------------------------------------------- */

interface CountdownRowProps {
  label: string;
  icon: React.ReactNode;
  subLabel?: string;
  countdown: CountdownValues;
  variant: "sprint" | "main";
}

function CountdownRow({ label, icon, subLabel, countdown, variant }: CountdownRowProps) {
  const totalMinutes = countdown.days * 24 * 60 + countdown.hours * 60 + countdown.minutes;
  const isUrgent = totalMinutes < 60 && totalMinutes > 0;
  const isCritical = totalMinutes < 15 && totalMinutes > 0;

  const colorClass = isCritical
    ? "text-pk-red"
    : isUrgent
      ? "text-pk-amber"
      : variant === "sprint"
        ? "text-pk-amber"
        : "text-pk-info";

  const digitBg = isCritical
    ? "bg-pk-red/[0.1] border-pk-red/30"
    : isUrgent
      ? "bg-pk-amber/[0.08] border-pk-amber/20"
      : variant === "sprint"
        ? "bg-pk-amber/[0.06] border-pk-amber/20"
        : "bg-white/[0.04] border-white/[0.08]";

  const digitColor = isCritical
    ? "text-pk-red"
    : isUrgent
      ? "text-pk-amber"
      : variant === "sprint"
        ? "text-pk-amber"
        : "text-pk-piste";

  return (
    <div className={isCritical ? "animate-live-pulse" : ""}>
      <p
        className={`font-data text-[0.5625rem] text-center ${colorClass} uppercase mb-2 tracking-wider flex items-center justify-center gap-2`}
      >
        {icon} {label}
        {subLabel && <span className="text-pk-titane text-[0.5rem]">{subLabel}</span>}
        {isUrgent && (
          <span className="ml-1 font-data text-[0.5rem] bg-pk-red/20 text-pk-red px-1.5 py-0.5 rounded-full animate-live-pulse">
            URGENT
          </span>
        )}
      </p>
      <div className="flex justify-center gap-2">
        {[
          { value: countdown.days, label: "J" },
          { value: countdown.hours, label: "H" },
          { value: countdown.minutes, label: "M" },
          { value: countdown.seconds, label: "S" },
        ].map((item, i) => (
          <div
            key={i}
            className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg border ${digitBg}`}
          >
            <span className={`font-data text-lg font-bold ${digitColor}`}>
              {String(item.value).padStart(2, "0")}
            </span>
            <span className="font-data text-[0.4375rem] text-pk-titane tracking-wider">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
