/**
 * PredictionForm — Step grid, selection info, bonus panel, driver picker.
 * Broadcast Premium: pk-* step cards, pk-red/amber/info active states.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Flag, Zap, Gamepad2, Trophy, Medal } from "lucide-react";
import { useTranslation } from "react-i18next";
import DriverPicker from "./DriverPicker";
import type { Driver } from "./DriverPicker";
import SelectionInfo from "./SelectionInfo";
import BonusPanel from "./BonusPanel";
import { haptic } from "@/lib/haptics";
import { fadeUp } from "@/lib/motion";

/**
 * Selection steps grid, selection info, bonus panel, and driver picker.
 *
 * All prediction state is lifted to PredictionsPage — this component
 * receives values + setters via props.
 */

interface PredictionFormProps {
  activeTab: string;
  selectionMode: string;
  setSelectionMode: (mode: string) => void;
  drivers: Driver[];
  sprintQualiPole: string | null;
  sprintQualiTop10: string[];
  sprintRaceWinner: string | null;
  sprintRaceTop10: string[];
  sprintSafetyCar: boolean | null;
  setSprintSafetyCar: (v: boolean | null) => void;
  sprintDnfDrivers: string[];
  setSprintDnfDrivers: (v: string[]) => void;
  sprintNoDnf: boolean;
  setSprintNoDnf: (v: boolean) => void;
  sprintFastestLap: string | null;
  sprintFirstCorner: string | null;
  qualiPole: string | null;
  qualiTop10: string[];
  raceWinner: string | null;
  raceTop10: string[];
  safetyCar: boolean | null;
  setSafetyCar: (v: boolean | null) => void;
  dnfDrivers: string[];
  setDnfDrivers: (v: string[]) => void;
  noDnf: boolean;
  setNoDnf: (v: boolean) => void;
  fastestLapDriver: string | null;
  firstCornerLeader: string | null;
  isSprintBonusCompletee: boolean;
  isMainBonusCompletee: boolean;
  minigamesCompletee: boolean;
  handleDriverSelect: (driverId: string) => void;
  isDriverSelected: (driverId: string) => boolean;
}

type StepDescriptor = {
  key: string;
  label: string;
  sublabel: string;
  icon: typeof Flag;
  done: boolean;
  count: number;
  max: number;
  isBonus?: boolean;
  isMinigames?: boolean;
};

function stepHelp(mode: string, activeTab: string, t: (key: string) => string) {
  const sprint = activeTab === "sprint";
  if (mode.includes("pole")) return t("predictions.form.help.pole");
  if (mode.includes("winner")) return t("predictions.form.help.winner");
  if (mode.includes("top10")) return t("predictions.form.help.top10");
  if (mode.includes("fastest_lap")) return t("predictions.form.help.fastest_lap");
  if (mode.includes("first_corner")) return t("predictions.form.help.first_corner");
  if (mode.includes("dnf")) return t("predictions.form.help.dnf");
  if (mode.includes("bonus"))
    return sprint ? t("predictions.form.help.sprint_bonus") : t("predictions.form.help.race_bonus");
  return t("predictions.form.help.default");
}

function stepTone(step: StepDescriptor, isActive: boolean, activeTab: string) {
  if (step.done) {
    return {
      bg: "bg-pk-emerald/[0.08]",
      border: "border-pk-emerald/30",
      icon: "text-pk-emerald",
      label: "text-pk-emerald",
    };
  }
  if (isActive) {
    return activeTab === "sprint"
      ? {
          bg: "bg-pk-amber/[0.1]",
          border: "border-pk-amber/40",
          icon: "text-pk-amber",
          label: "text-white",
        }
      : {
          bg: "bg-pk-red-subtle",
          border: "border-pk-red/30",
          icon: "text-pk-red",
          label: "text-white",
        };
  }
  if (step.isMinigames || step.isBonus) {
    return {
      bg: "bg-pk-info/[0.06]",
      border: "border-pk-info/30",
      icon: "text-pk-info",
      label: "text-pk-info",
    };
  }
  return {
    bg: "bg-white/[0.04]",
    border: "border-white/[0.08]",
    icon: "text-pk-titane",
    label: "text-pk-titane",
  };
}

export default function PredictionForm({
  activeTab,
  selectionMode,
  setSelectionMode,
  drivers,
  sprintQualiPole,
  sprintQualiTop10,
  sprintRaceWinner,
  sprintRaceTop10,
  sprintSafetyCar,
  setSprintSafetyCar,
  sprintDnfDrivers,
  setSprintDnfDrivers,
  sprintNoDnf,
  setSprintNoDnf,
  sprintFastestLap,
  sprintFirstCorner,
  qualiPole,
  qualiTop10,
  raceWinner,
  raceTop10,
  safetyCar,
  setSafetyCar,
  dnfDrivers,
  setDnfDrivers,
  noDnf,
  setNoDnf,
  fastestLapDriver,
  firstCornerLeader,
  isSprintBonusCompletee,
  isMainBonusCompletee,
  minigamesCompletee,
  handleDriverSelect,
  isDriverSelected,
}: PredictionFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const wizardRef = useRef<HTMLElement | null>(null);
  const previousActiveStepKey = useRef<string | null>(null);
  const isStepScrollReady = useRef(false);

  // -- Steps definition ---------------------------------------------------
  const getSprintSteps = (): StepDescriptor[] => [
    {
      key: "sprint_quali_pole",
      label: t("predictions.form.steps.pole"),
      sublabel: t("predictions.form.steps.sprint_q"),
      icon: Flag,
      done: !!sprintQualiPole,
      count: sprintQualiPole ? 1 : 0,
      max: 1,
    },
    {
      key: "sprint_quali_top10",
      label: t("predictions.form.steps.top10"),
      sublabel: t("predictions.form.steps.sprint_q"),
      icon: Medal,
      done: sprintQualiTop10.length === 10,
      count: sprintQualiTop10.length,
      max: 10,
    },
    {
      key: "sprint_race_winner",
      label: t("predictions.form.steps.winner"),
      sublabel: t("predictions.form.steps.sprint"),
      icon: Trophy,
      done: !!sprintRaceWinner,
      count: sprintRaceWinner ? 1 : 0,
      max: 1,
    },
    {
      key: "sprint_race_top10",
      label: t("predictions.form.steps.top10"),
      sublabel: t("predictions.form.steps.sprint"),
      icon: Medal,
      done: sprintRaceTop10.length === 10,
      count: sprintRaceTop10.length,
      max: 10,
    },
    {
      key: "sprint_bonus",
      label: t("predictions.form.steps.bonus"),
      sublabel: t("predictions.form.steps.sprint"),
      icon: Zap,
      done: isSprintBonusCompletee,
      count: 0,
      max: 0,
      isBonus: true,
    },
    {
      key: "minigames",
      label: t("predictions.form.steps.games"),
      sublabel: t("predictions.form.steps.mini"),
      icon: Gamepad2,
      done: minigamesCompletee,
      count: 0,
      max: 0,
      isMinigames: true,
    },
  ];

  const getMainSteps = (): StepDescriptor[] => [
    {
      key: "quali_pole",
      label: t("predictions.form.steps.pole"),
      sublabel: t("predictions.form.steps.qualif"),
      icon: Flag,
      done: !!qualiPole,
      count: qualiPole ? 1 : 0,
      max: 1,
    },
    {
      key: "quali_top10",
      label: t("predictions.form.steps.top10"),
      sublabel: t("predictions.form.steps.qualif"),
      icon: Medal,
      done: qualiTop10.length === 10,
      count: qualiTop10.length,
      max: 10,
    },
    {
      key: "race_winner",
      label: t("predictions.form.steps.winner"),
      sublabel: t("predictions.form.steps.race"),
      icon: Trophy,
      done: !!raceWinner,
      count: raceWinner ? 1 : 0,
      max: 1,
    },
    {
      key: "race_top10",
      label: t("predictions.form.steps.top10"),
      sublabel: t("predictions.form.steps.race"),
      icon: Medal,
      done: raceTop10.length === 10,
      count: raceTop10.length,
      max: 10,
    },
    {
      key: "bonus",
      label: t("predictions.form.steps.bonus"),
      sublabel: t("predictions.form.steps.bets"),
      icon: Zap,
      done: isMainBonusCompletee,
      count: 0,
      max: 0,
      isBonus: true,
    },
    {
      key: "minigames",
      label: t("predictions.form.steps.games"),
      sublabel: t("predictions.form.steps.mini"),
      icon: Gamepad2,
      done: minigamesCompletee,
      count: 0,
      max: 0,
      isMinigames: true,
    },
  ];

  const steps = activeTab === "sprint" ? getSprintSteps() : getMainSteps();
  const showBonus =
    activeTab === "sprint" ? selectionMode === "sprint_bonus" : selectionMode === "bonus";
  const bonusModeKey = activeTab === "sprint" ? "sprint_bonus" : "bonus";
  const activeStep =
    steps.find((step) => selectionMode === step.key || (step.isBonus && showBonus)) ?? steps[0];
  const activeStepKey = `${activeTab}:${activeStep.key}`;
  const coreSteps = steps.filter((step) => !step.isBonus && !step.isMinigames);
  const completedCore = coreSteps.filter((step) => step.done).length;
  const completedAll = steps.filter((step) => step.done).length;
  const progress = Math.round((completedCore / coreSteps.length) * 100);
  const quickSteps = steps.filter((step) => !step.isMinigames);
  const nextMissingStep = coreSteps.find((step) => !step.done);
  const isCoreReady = completedCore === coreSteps.length;

  const stageGroups = [
    {
      key: "qualifying",
      label:
        activeTab === "sprint"
          ? t("predictions.form.stage_sprint_q")
          : t("predictions.form.stage_qualifying"),
      done: coreSteps[0]?.done && coreSteps[1]?.done,
      active: selectionMode.includes("quali"),
      count: (coreSteps[0]?.done ? 1 : 0) + (coreSteps[1]?.done ? 1 : 0),
      max: 2,
    },
    {
      key: "race",
      label:
        activeTab === "sprint"
          ? t("predictions.form.stage_sprint")
          : t("predictions.form.stage_race"),
      done: coreSteps[2]?.done && coreSteps[3]?.done,
      active: selectionMode.includes("race") || selectionMode === "race_winner",
      count: (coreSteps[2]?.done ? 1 : 0) + (coreSteps[3]?.done ? 1 : 0),
      max: 2,
    },
    {
      key: "bonus",
      label: t("predictions.form.stage_bonus"),
      done: activeTab === "sprint" ? isSprintBonusCompletee : isMainBonusCompletee,
      active:
        showBonus ||
        selectionMode.includes("fastest") ||
        selectionMode.includes("corner") ||
        selectionMode.includes("dnf"),
      count:
        activeTab === "sprint" ? (isSprintBonusCompletee ? 1 : 0) : isMainBonusCompletee ? 1 : 0,
      max: 1,
    },
    {
      key: "minigames",
      label: t("predictions.form.stage_minigames"),
      done: minigamesCompletee,
      active: false,
      count: minigamesCompletee ? 1 : 0,
      max: 1,
    },
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      isStepScrollReady.current = true;
    }, 300);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (previousActiveStepKey.current === null) {
      previousActiveStepKey.current = activeStepKey;
      return;
    }
    if (previousActiveStepKey.current === activeStepKey) {
      return;
    }

    previousActiveStepKey.current = activeStepKey;
    if (!isStepScrollReady.current) {
      return;
    }

    const scrollIntoView = wizardRef.current?.scrollIntoView;
    if (typeof scrollIntoView === "function") {
      scrollIntoView.call(wizardRef.current, { behavior: "smooth", block: "start" });
    }
  }, [activeStepKey]);

  // -- Position helper for DriverPicker -----------------------------------
  const getPosition = (driverId: string): number | null => {
    if (activeTab === "sprint") {
      if (selectionMode === "sprint_quali_top10") {
        const idx = sprintQualiTop10.indexOf(driverId);
        return idx >= 0 ? idx + 1 : null;
      }
      if (selectionMode === "sprint_race_top10") {
        const idx = sprintRaceTop10.indexOf(driverId);
        return idx >= 0 ? idx + 1 : null;
      }
    } else {
      if (selectionMode === "quali_top10") {
        const idx = qualiTop10.indexOf(driverId);
        return idx >= 0 ? idx + 1 : null;
      }
      if (selectionMode === "race_top10") {
        const idx = raceTop10.indexOf(driverId);
        return idx >= 0 ? idx + 1 : null;
      }
    }
    return null;
  };

  const driverName = (driverId: string | null): string =>
    drivers.find((driver) => driver.id === driverId)?.name ?? t("predictions.form.to_choose");

  const currentOrderedSelection = (): string[] => {
    switch (selectionMode) {
      case "sprint_quali_top10":
        return sprintQualiTop10;
      case "sprint_race_top10":
        return sprintRaceTop10;
      case "quali_top10":
        return qualiTop10;
      case "race_top10":
        return raceTop10;
      case "sprint_dnf_select":
        return sprintDnfDrivers;
      case "dnf_select":
        return dnfDrivers;
      default:
        return [];
    }
  };

  const currentSingleSelection = (): string | null => {
    switch (selectionMode) {
      case "sprint_quali_pole":
        return sprintQualiPole;
      case "sprint_race_winner":
        return sprintRaceWinner;
      case "sprint_fastest_lap":
        return sprintFastestLap;
      case "sprint_first_corner":
        return sprintFirstCorner;
      case "quali_pole":
        return qualiPole;
      case "race_winner":
        return raceWinner;
      case "fastest_lap":
        return fastestLapDriver;
      case "first_corner":
        return firstCornerLeader;
      default:
        return null;
    }
  };

  const orderedSelection = currentOrderedSelection();
  const singleSelection = currentSingleSelection();
  const showSlots =
    selectionMode.includes("top10") ||
    selectionMode.includes("dnf") ||
    (!!singleSelection && !showBonus);
  const slotCount = selectionMode.includes("dnf") ? 5 : selectionMode.includes("top10") ? 10 : 1;
  const slotGridClass = slotCount === 1 ? "grid-cols-1" : "grid-cols-2";

  // -- Render -------------------------------------------------------------
  return (
    <>
      <motion.section
        ref={wizardRef}
        className="card-arcade overflow-hidden border-l-4 border-pk-red"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <div className="border-b border-white/[0.08] p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-red">
                {t("predictions.form.guided_path")}
              </p>
              <h2 className="font-heading text-lg uppercase text-white">
                {t("predictions.form.build_ticket")}
              </h2>
            </div>
            <div className="text-right">
              <p className="font-data text-2xl text-white tabular-nums">{progress}%</p>
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                {completedCore}/{coreSteps.length} {t("predictions.form.essential")}
              </p>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-sm bg-white/[0.05]">
            <div
              className="h-full rounded-sm bg-pk-red transition-all duration-pk-medium"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-white/[0.08] sm:grid-cols-4">
          {stageGroups.map((stage, index) => (
            <button
              key={stage.key}
              type="button"
              onClick={() => {
                if (stage.key === "qualifying") setSelectionMode(coreSteps[0].key);
                if (stage.key === "race") setSelectionMode(coreSteps[2].key);
                if (stage.key === "bonus") setSelectionMode(bonusModeKey);
                if (stage.key === "minigames") navigate("/minigames");
              }}
              aria-current={stage.active ? "step" : undefined}
              className={`group relative min-h-[78px] border-b border-r border-white/[0.06] px-3 py-3 text-left transition-colors last:border-r-0 sm:border-b-0 ${
                stage.active ? "bg-white/[0.055]" : "bg-transparent hover:bg-white/[0.025]"
              }`}
              data-testid={`stage-${stage.key}`}
            >
              <span
                className={`mb-2 flex h-6 w-6 items-center justify-center rounded-sm border font-data text-[10px] ${
                  stage.done
                    ? "border-pk-emerald/40 bg-pk-emerald/10 text-pk-emerald"
                    : stage.active
                      ? "border-pk-red/40 bg-pk-red-subtle text-pk-red"
                      : "border-white/[0.08] text-pk-titane"
                }`}
              >
                {stage.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <p className="truncate font-display text-[0.66rem] uppercase leading-none text-white">
                {stage.label}
              </p>
              <p className="font-data text-[0.55rem] text-pk-titane">
                {stage.count}/{stage.max}
              </p>
              {stage.active && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-sm bg-pk-red" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="rounded-md border border-white/[0.08] bg-white/[0.035] p-3 shadow-[inset_3px_0_0_rgba(225,6,0,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                  {t("predictions.form.active_step")}
                </p>
                <h3 className="mt-1 font-heading text-xl uppercase text-white">
                  {activeStep.label}
                  <span className="ml-2 text-pk-titane">{activeStep.sublabel}</span>
                </h3>
                <p className="mt-2 font-body text-xs leading-5 text-pk-titane">
                  {stepHelp(selectionMode, activeTab, t)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-sm border px-2 py-1 font-data text-[10px] uppercase ${
                  activeStep.done
                    ? "border-pk-emerald/30 bg-pk-emerald/10 text-pk-emerald"
                    : "border-pk-red/30 bg-pk-red-subtle text-pk-red"
                }`}
              >
                {activeStep.done
                  ? t("predictions.form.validated")
                  : `${activeStep.count}/${activeStep.max || 1}`}
              </span>
            </div>

            {showSlots && (
              <div className={`mt-3 grid ${slotGridClass} gap-2`}>
                {Array.from({ length: slotCount }).map((_, index) => {
                  const driverId =
                    orderedSelection[index] ?? (slotCount === 1 ? singleSelection : null);
                  return (
                    <div
                      key={`${selectionMode}-${index}`}
                      className={`min-h-[46px] rounded-sm border px-2.5 py-2 ${
                        driverId
                          ? "border-pk-red/25 bg-pk-red-subtle"
                          : "border-white/[0.08] bg-black/20"
                      }`}
                    >
                      <p className="font-data text-[10px] text-pk-titane">
                        {selectionMode.includes("dnf") ? `DNF ${index + 1}` : `P${index + 1}`}
                      </p>
                      <p className="truncate font-body text-xs text-white">
                        {driverId ? driverName(driverId) : t("predictions.form.free_slot")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="mt-3 grid grid-cols-2 gap-2"
            role="tablist"
            aria-label={t("predictions.form.quick_steps_label")}
          >
            {quickSteps.map((step) => {
              const Icon = step.icon;
              const isActive = selectionMode === step.key || !!(step.isBonus && showBonus);
              const tone = stepTone(step, isActive, activeTab);

              return (
                <motion.button
                  key={step.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${step.label} ${step.sublabel}`}
                  onClick={() => {
                    haptic("selection");
                    setSelectionMode(step.isBonus ? bonusModeKey : step.key);
                  }}
                  className={`flex min-h-[78px] items-center gap-3 rounded-md border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/[0.16] ${tone.bg} ${tone.border}`}
                  data-testid={`step-${step.key}`}
                  variants={fadeUp}
                  whileTap={{ scale: 0.96 }}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${tone.icon}`} />
                  <div className="min-w-0">
                    <p className={`font-display text-[0.7rem] uppercase ${tone.label}`}>
                      {step.label}
                    </p>
                    <p className="font-data text-[0.55rem] uppercase text-pk-titane">
                      {step.sublabel}
                    </p>
                    {!step.isBonus && (
                      <p className="mt-1 font-data text-xs text-pk-titane">
                        {step.count}/{step.max}
                      </p>
                    )}
                    {step.isBonus && (
                      <p className="mt-1 font-data text-xs text-pk-titane">
                        {step.done ? "3/3" : t("predictions.form.todo")}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
            <button
              type="button"
              onClick={() => navigate("/minigames")}
              className={`flex min-h-[78px] items-center gap-3 rounded-md border p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/[0.16] ${
                minigamesCompletee
                  ? "border-pk-emerald/30 bg-pk-emerald/[0.08]"
                  : "border-pk-info/30 bg-pk-info/[0.06]"
              }`}
              data-testid="step-minigames"
            >
              <Gamepad2
                className={`h-5 w-5 shrink-0 ${
                  minigamesCompletee ? "text-pk-emerald" : "text-pk-info"
                }`}
              />
              <div>
                <p
                  className={`font-display text-[0.7rem] uppercase ${
                    minigamesCompletee ? "text-pk-emerald" : "text-pk-info"
                  }`}
                >
                  {t("predictions.form.games")}
                </p>
                <p className="font-data text-[0.55rem] uppercase text-pk-titane">
                  {t("predictions.form.mini")}
                </p>
                <p className="mt-1 font-data text-xs text-pk-titane">
                  {minigamesCompletee ? t("predictions.form.done") : t("predictions.form.optional")}
                </p>
              </div>
            </button>
          </div>

          <div className="mt-3 rounded-md border border-white/[0.08] bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                  {t("predictions.form.ticket_status")}
                </p>
                <p className="mt-1 font-body text-xs text-gray-300">
                  {isCoreReady
                    ? t("predictions.form.ticket_ready")
                    : nextMissingStep
                      ? t("predictions.form.next_target", {
                          label: nextMissingStep.label,
                          sublabel: nextMissingStep.sublabel,
                        })
                      : t("predictions.form.keep_going")}
                </p>
              </div>
              <span className="rounded-sm border border-white/[0.08] px-2 py-1 font-data text-xs text-white">
                {completedAll}/{steps.length}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Selection Info */}
      <SelectionInfo
        activeTab={activeTab}
        selectionMode={selectionMode}
        sprintQualiTop10={sprintQualiTop10}
        sprintRaceTop10={sprintRaceTop10}
        sprintDnfDrivers={sprintDnfDrivers}
        qualiTop10={qualiTop10}
        raceTop10={raceTop10}
        dnfDrivers={dnfDrivers}
      />

      {/* Bonus Section or Driver Grid */}
      {showBonus ? (
        <BonusPanel
          activeTab={activeTab}
          drivers={drivers}
          setSelectionMode={setSelectionMode}
          safetyCar={activeTab === "sprint" ? sprintSafetyCar : safetyCar}
          setSafetyCar={activeTab === "sprint" ? setSprintSafetyCar : setSafetyCar}
          fastestLap={activeTab === "sprint" ? sprintFastestLap : fastestLapDriver}
          firstCorner={activeTab === "sprint" ? sprintFirstCorner : firstCornerLeader}
          noDnf={activeTab === "sprint" ? sprintNoDnf : noDnf}
          setNoDnf={activeTab === "sprint" ? setSprintNoDnf : setNoDnf}
          dnfDrivers={activeTab === "sprint" ? sprintDnfDrivers : dnfDrivers}
          setDnfDrivers={activeTab === "sprint" ? setSprintDnfDrivers : setDnfDrivers}
        />
      ) : (
        <DriverPicker
          drivers={drivers}
          isDriverSelected={isDriverSelected}
          onDriverSelect={handleDriverSelect}
          getPosition={getPosition}
        />
      )}

      {/* Back to Bonus from DNF selection */}
      {(selectionMode === "dnf_select" || selectionMode === "sprint_dnf_select") && (
        <div className="mt-4">
          <button
            onClick={() => setSelectionMode(bonusModeKey)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] font-display text-sm text-pk-piste transition-colors hover:border-pk-red/30 hover:bg-pk-red-subtle active:scale-[0.97]"
            data-testid="back-to-bonus-btn"
          >
            <Check className="w-4 h-4" />
            {t("predictions.form.validate_back_bonus")}
          </button>
        </div>
      )}
    </>
  );
}
