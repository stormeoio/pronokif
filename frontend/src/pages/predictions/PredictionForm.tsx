/**
 * PredictionForm — Step grid, selection info, bonus panel, driver picker.
 * Broadcast Premium: pk-* step cards, pk-red/amber/info active states.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag, Zap, Gamepad2, Trophy, Medal, CircleDot, ChevronRight } from "lucide-react";
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
  const bonusStep = steps.find((step) => step.isBonus);
  const activeStep =
    steps.find((step) => selectionMode === step.key || (step.isBonus && showBonus)) ??
    ((selectionMode.includes("fastest") ||
      selectionMode.includes("corner") ||
      selectionMode.includes("dnf")) &&
    bonusStep
      ? bonusStep
      : steps[0]);
  const activeStepKey = `${activeTab}:${activeStep.key}`;
  const coreSteps = steps.filter((step) => !step.isBonus && !step.isMinigames);
  const completedCore = coreSteps.filter((step) => step.done).length;
  const completedAll = steps.filter((step) => step.done).length;
  const progress = Math.round((completedCore / coreSteps.length) * 100);
  const nextMissingStep = coreSteps.find((step) => !step.done);
  const isCoreReady = completedCore === coreSteps.length;

  const stageSections = [
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
      modeKey: coreSteps[0]?.key,
      steps: coreSteps.slice(0, 2),
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
      modeKey: coreSteps[2]?.key,
      steps: coreSteps.slice(2, 4),
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
      modeKey: bonusModeKey,
      steps: steps.filter((step) => step.isBonus),
    },
    {
      key: "minigames",
      label: t("predictions.form.stage_minigames"),
      done: minigamesCompletee,
      active: false,
      count: minigamesCompletee ? 1 : 0,
      max: 1,
      modeKey: "",
      steps: [],
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

    const timer = window.setTimeout(() => {
      const scrollIntoView = wizardRef.current?.scrollIntoView;
      if (typeof scrollIntoView === "function") {
        scrollIntoView.call(wizardRef.current, { behavior: "smooth", block: "start" });
      }
    }, 80);

    return () => window.clearTimeout(timer);
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

  const compactDriverName = (driverId: string): string => {
    const name = driverName(driverId);
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    return initials || name;
  };

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
  const slotGridClass = slotCount === 1 ? "grid-cols-1" : "grid-cols-5";

  // -- Render -------------------------------------------------------------
  return (
    <>
      <motion.section
        ref={wizardRef}
        className="relative overflow-hidden rounded-md border border-white/[0.08] bg-pk-surface shadow-[0_12px_32px_rgba(0,0,0,0.18)]"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        data-testid="prediction-wizard"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pk-red via-pk-red to-transparent" />
        <div className="relative border-b border-white/[0.08] bg-[radial-gradient(circle_at_12%_0%,rgba(225,6,0,0.12),transparent_30%)] px-3 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="font-data text-[0.5rem] uppercase tracking-[0.16em] text-pk-red">
                {t("predictions.form.guided_path")}
              </p>
              <h2 className="font-heading text-[0.95rem] uppercase leading-tight text-white">
                {t("predictions.form.build_ticket")}
              </h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-data text-lg leading-none text-white tabular-nums">{progress}%</p>
              <p className="mt-1 font-data text-[0.5rem] uppercase tracking-[0.12em] text-pk-titane">
                {completedCore}/{coreSteps.length} {t("predictions.form.essential")}
              </p>
            </div>
          </div>
          <div className="h-1 overflow-hidden rounded-sm bg-white/[0.05]">
            <div
              className="h-full rounded-sm bg-gradient-to-r from-pk-red to-[#ff463f] transition-all duration-pk-medium"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="p-3">
          <div
            className="space-y-1.5"
            role="list"
            aria-label={t("predictions.form.quick_steps_label")}
            data-testid="prediction-step-accordion"
          >
            {stageSections.map((stage, index) => {
              const expanded = stage.active;
              const isLast = index === stageSections.length - 1;

              return (
                <div key={stage.key} className="relative" role="listitem">
                  {!isLast && (
                    <span
                      className={`absolute bottom-[-0.375rem] left-[1.0625rem] top-9 w-px ${
                        stage.done ? "bg-pk-emerald/35" : "bg-white/[0.08]"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`relative overflow-hidden rounded-md border transition-colors ${
                      expanded
                        ? "border-pk-red/30 bg-white/[0.035] shadow-[inset_2px_0_0_rgba(225,6,0,0.55)]"
                        : stage.done
                          ? "border-pk-emerald/25 bg-pk-emerald/[0.04]"
                          : "border-white/[0.08] bg-black/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        haptic("selection");
                        if (stage.key === "minigames") {
                          navigate("/minigames");
                          return;
                        }
                        if (stage.modeKey) setSelectionMode(stage.modeKey);
                      }}
                      aria-current={expanded ? "step" : undefined}
                      aria-expanded={expanded}
                      className="flex min-h-[44px] w-full items-center gap-2.5 px-2.5 py-2 text-left"
                      data-testid={`stage-${stage.key}`}
                    >
                      <span
                        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-data text-[0.625rem] ${
                          stage.done
                            ? "border-pk-emerald/40 bg-pk-emerald/10 text-pk-emerald"
                            : expanded
                              ? "border-pk-red/45 bg-pk-red-subtle text-pk-red"
                              : "border-white/[0.1] bg-pk-surface text-pk-titane"
                        }`}
                      >
                        {stage.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[0.72rem] uppercase leading-none text-white">
                          {stage.label}
                        </p>
                        <p
                          className={`mt-1 font-data text-[0.52rem] uppercase leading-none ${
                            stage.done ? "text-pk-emerald" : "text-pk-titane"
                          }`}
                        >
                          {stage.count}/{stage.max}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        strokeWidth={1.8}
                        className={`shrink-0 text-pk-titane transition-transform duration-pk-short ${
                          expanded ? "rotate-90 text-pk-red" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div
                            className="space-y-1.5 border-t border-white/[0.08] px-2.5 py-2"
                            role="tablist"
                            aria-label={stage.label}
                          >
                            {stage.steps.map((step) => {
                              const Icon = step.icon;
                              const isActive =
                                selectionMode === step.key || !!(step.isBonus && showBonus);
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
                                  className={`flex min-h-[36px] w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition-all hover:border-white/[0.16] ${tone.bg} ${tone.border}`}
                                  data-testid={`step-${step.key}`}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Icon className={`h-3.5 w-3.5 shrink-0 ${tone.icon}`} />
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`truncate font-display text-[0.6rem] uppercase ${tone.label}`}
                                    >
                                      {step.label}
                                    </p>
                                    <p className="truncate font-data text-[0.48rem] uppercase text-pk-titane">
                                      {step.sublabel}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-sm bg-black/20 px-1.5 py-0.5 font-data text-[0.54rem] text-pk-titane">
                                    {step.isBonus
                                      ? step.done
                                        ? "3/3"
                                        : t("predictions.form.todo")
                                      : `${step.count}/${step.max}`}
                                  </span>
                                </motion.button>
                              );
                            })}

                            <div className="rounded-sm border border-white/[0.08] bg-black/20 px-2.5 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="flex items-center gap-1.5 font-data text-[0.48rem] uppercase tracking-[0.14em] text-pk-titane">
                                    <CircleDot
                                      size={11}
                                      strokeWidth={1.8}
                                      className="text-pk-red"
                                    />
                                    {t("predictions.form.active_step")}
                                  </p>
                                  <p className="mt-1 truncate font-body text-[0.72rem] leading-4 text-pk-titane">
                                    {stepHelp(selectionMode, activeTab, t)}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-sm border px-2 py-1 font-data text-[0.54rem] uppercase ${
                                    activeStep.done
                                      ? "border-pk-emerald/30 bg-pk-emerald/10 text-pk-emerald"
                                      : "border-pk-red/30 bg-pk-red-subtle text-pk-red"
                                  }`}
                                >
                                  {activeStep.done
                                    ? t("predictions.form.validated")
                                    : activeStep.isBonus
                                      ? t("predictions.form.todo")
                                      : `${activeStep.count}/${activeStep.max || 1}`}
                                </span>
                              </div>

                              {showSlots && (
                                <div className={`mt-2 grid ${slotGridClass} gap-1.5`}>
                                  {Array.from({ length: slotCount }).map((_, slotIndex) => {
                                    const driverId =
                                      orderedSelection[slotIndex] ??
                                      (slotCount === 1 ? singleSelection : null);
                                    return (
                                      <div
                                        key={`${selectionMode}-${slotIndex}`}
                                        className={`min-h-[34px] rounded-sm border px-2 py-1.5 transition-colors ${
                                          driverId
                                            ? "border-pk-red/25 bg-pk-red-subtle"
                                            : "border-white/[0.08] bg-black/20"
                                        }`}
                                      >
                                        <p className="font-data text-[0.5rem] leading-none text-pk-titane">
                                          {selectionMode.includes("dnf")
                                            ? `DNF ${slotIndex + 1}`
                                            : `P${slotIndex + 1}`}
                                        </p>
                                        <p className="mt-1 truncate font-data text-[0.625rem] uppercase leading-none text-white">
                                          {driverId
                                            ? slotCount === 1
                                              ? driverName(driverId)
                                              : compactDriverName(driverId)
                                            : t("predictions.form.free_slot")}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 rounded-md border border-white/[0.08] bg-black/20 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-data text-[0.5rem] uppercase tracking-[0.14em] text-pk-titane">
                  {t("predictions.form.ticket_status")}
                </p>
                <p className="mt-0.5 truncate font-body text-[0.72rem] text-gray-300">
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
            {!isCoreReady && nextMissingStep && (
              <button
                type="button"
                onClick={() => setSelectionMode(nextMissingStep.key)}
                className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-sm border border-pk-red/25 bg-pk-red-subtle font-display text-[0.7rem] uppercase text-pk-red transition-colors hover:border-pk-red/45"
                data-testid="next-missing-step-btn"
              >
                {t("predictions.form.continue_to_next")}
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </motion.section>

      {/* Selection Info */}
      <SelectionInfo
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
