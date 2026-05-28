/**
 * PredictionForm — Step grid, selection info, bonus panel, driver picker.
 * Broadcast Premium: pk-* step cards, pk-red/amber/info active states.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Flag, Zap, Gamepad2, Trophy, Medal } from "lucide-react";
import DriverPicker from "./DriverPicker";
import type { Driver } from "./DriverPicker";
import SelectionInfo from "./SelectionInfo";
import BonusPanel from "./BonusPanel";
import { haptic } from "@/lib/haptics";
import { staggerContainer, fadeUp } from "@/lib/motion";

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

  // -- Steps definition ---------------------------------------------------
  const getSprintSteps = () => [
    {
      key: "sprint_quali_pole",
      label: "Pole",
      sublabel: "Sprint Q",
      icon: Flag,
      done: !!sprintQualiPole,
      count: sprintQualiPole ? 1 : 0,
      max: 1,
    },
    {
      key: "sprint_quali_top10",
      label: "Top 10",
      sublabel: "Sprint Q",
      icon: Medal,
      done: sprintQualiTop10.length === 10,
      count: sprintQualiTop10.length,
      max: 10,
    },
    {
      key: "sprint_race_winner",
      label: "Vainqueur",
      sublabel: "Sprint",
      icon: Trophy,
      done: !!sprintRaceWinner,
      count: sprintRaceWinner ? 1 : 0,
      max: 1,
    },
    {
      key: "sprint_race_top10",
      label: "Top 10",
      sublabel: "Sprint",
      icon: Medal,
      done: sprintRaceTop10.length === 10,
      count: sprintRaceTop10.length,
      max: 10,
    },
    {
      key: "sprint_bonus",
      label: "Bonus",
      sublabel: "Sprint",
      icon: Zap,
      done: isSprintBonusCompletee,
      count: 0,
      max: 0,
      isBonus: true,
    },
    {
      key: "minigames",
      label: "Jeux",
      sublabel: "Mini",
      icon: Gamepad2,
      done: minigamesCompletee,
      count: 0,
      max: 0,
      isMinigames: true,
    },
  ];

  const getMainSteps = () => [
    {
      key: "quali_pole",
      label: "Pole",
      sublabel: "Qualif",
      icon: Flag,
      done: !!qualiPole,
      count: qualiPole ? 1 : 0,
      max: 1,
    },
    {
      key: "quali_top10",
      label: "Top 10",
      sublabel: "Qualif",
      icon: Medal,
      done: qualiTop10.length === 10,
      count: qualiTop10.length,
      max: 10,
    },
    {
      key: "race_winner",
      label: "Vainqueur",
      sublabel: "Course",
      icon: Trophy,
      done: !!raceWinner,
      count: raceWinner ? 1 : 0,
      max: 1,
    },
    {
      key: "race_top10",
      label: "Top 10",
      sublabel: "Course",
      icon: Medal,
      done: raceTop10.length === 10,
      count: raceTop10.length,
      max: 10,
    },
    {
      key: "bonus",
      label: "Bonus",
      sublabel: "Paris",
      icon: Zap,
      done: isMainBonusCompletee,
      count: 0,
      max: 0,
      isBonus: true,
    },
    {
      key: "minigames",
      label: "Jeux",
      sublabel: "Mini",
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

  // -- Render -------------------------------------------------------------
  return (
    <>
      {/* Step Navigation Grid */}
      <motion.div
        className="grid grid-cols-3 gap-2"
        role="tablist"
        aria-label="Étapes du pronostic"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = selectionMode === step.key || (step.isBonus && showBonus);

          const handleStepClick = () => {
            haptic("selection");
            if (step.isMinigames) {
              navigate("/minigames");
            } else if (step.isBonus) {
              setSelectionMode(bonusModeKey);
            } else {
              setSelectionMode(step.key);
            }
          };

          let bgClass: string, borderClass: string, iconClass: string, labelClass: string;

          if (step.isMinigames || step.isBonus) {
            if (step.done) {
              bgClass = "bg-pk-emerald/[0.08]";
              borderClass = "border-pk-emerald/30";
              iconClass = "text-pk-emerald";
              labelClass = "text-pk-emerald";
            } else {
              bgClass = "bg-pk-info/[0.06]";
              borderClass = "border-pk-info/30";
              iconClass = "text-pk-info";
              labelClass = "text-pk-info";
            }
          } else if (isActive) {
            bgClass = activeTab === "sprint" ? "bg-pk-amber/[0.1]" : "bg-pk-red-subtle";
            borderClass = activeTab === "sprint" ? "border-pk-amber/40" : "border-pk-red/30";
            iconClass = activeTab === "sprint" ? "text-pk-amber" : "text-pk-red";
            labelClass = "text-white";
          } else if (step.done) {
            bgClass = "bg-pk-emerald/[0.06]";
            borderClass = "border-pk-emerald/20";
            iconClass = "text-pk-emerald";
            labelClass = "text-pk-emerald";
          } else {
            bgClass = "bg-white/[0.04]";
            borderClass = "border-white/[0.08]";
            iconClass = "text-pk-titane";
            labelClass = "text-pk-titane";
          }

          return (
            <motion.button
              key={step.key}
              role="tab"
              aria-selected={isActive}
              aria-label={`${step.label} ${step.sublabel}`}
              onClick={handleStepClick}
              className={`flex flex-col items-center p-2 rounded-lg transition-all border ${bgClass} ${borderClass}`}
              data-testid={`step-${step.key}`}
              variants={fadeUp}
              whileTap={{ scale: 0.92 }}
            >
              <Icon className={`w-5 h-5 mb-1 ${iconClass}`} />
              <span className={`font-display text-[0.5625rem] ${labelClass}`}>{step.label}</span>
              <span className="font-data text-[0.5rem] text-pk-titane">{step.sublabel}</span>
              {!step.isBonus && !step.isMinigames && (
                <span
                  className={`font-data text-xs mt-1 ${step.done ? "text-pk-emerald" : "text-pk-titane"}`}
                >
                  {step.count}/{step.max}
                </span>
              )}
              {(step.isBonus || step.isMinigames) && (
                <span
                  className={`font-data text-[0.5625rem] mt-1 ${step.done ? "text-pk-emerald" : "text-pk-info"}`}
                >
                  {step.done ? <Check className="w-3 h-3" /> : "->"}
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

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
            className="w-full h-11 rounded-lg bg-pk-info/[0.1] border border-pk-info/30 text-pk-info font-display text-sm hover:bg-pk-info/[0.15] transition-colors flex items-center justify-center gap-2 active:scale-[0.97]"
            data-testid="back-to-bonus-btn"
          >
            <Check className="w-4 h-4" />
            Valider et retour aux bonus
          </button>
        </div>
      )}
    </>
  );
}
