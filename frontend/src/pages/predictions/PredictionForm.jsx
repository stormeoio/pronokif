import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Flag,
  Zap,
  AlertTriangle,
  Timer,
  X,
  Gamepad2,
  Trophy,
  Medal,
} from "lucide-react";
import DriverPicker from "./DriverPicker";

/**
 * Selection steps grid, selection info, bonus panel, and driver picker.
 *
 * All prediction state is lifted to PredictionsPage — this component
 * receives values + setters via props.
 */
export default function PredictionForm({
  activeTab,
  selectionMode,
  setSelectionMode,
  drivers,
  // Sprint state
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
  // Main state
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
  // Derived
  isSprintBonusComplete,
  isMainBonusComplete,
  minigamesComplete,
  // Handlers
  handleDriverSelect,
  isDriverSelected,
}) {
  const navigate = useNavigate();

  // ── Steps definition ────────────────────────────────────────────────
  const getSprintSteps = () => [
    { key: "sprint_quali_pole", label: "Pole", sublabel: "Sprint Q", icon: Flag, done: !!sprintQualiPole, count: sprintQualiPole ? 1 : 0, max: 1 },
    { key: "sprint_quali_top10", label: "Top 10", sublabel: "Sprint Q", icon: Medal, done: sprintQualiTop10.length === 10, count: sprintQualiTop10.length, max: 10 },
    { key: "sprint_race_winner", label: "Winner", sublabel: "Sprint", icon: Trophy, done: !!sprintRaceWinner, count: sprintRaceWinner ? 1 : 0, max: 1 },
    { key: "sprint_race_top10", label: "Top 10", sublabel: "Sprint", icon: Medal, done: sprintRaceTop10.length === 10, count: sprintRaceTop10.length, max: 10 },
    { key: "sprint_bonus", label: "Bonus", sublabel: "Sprint", icon: Zap, done: isSprintBonusComplete, count: 0, max: 0, isBonus: true },
    { key: "minigames", label: "Jeux", sublabel: "Mini", icon: Gamepad2, done: minigamesComplete, count: 0, max: 0, isMinigames: true },
  ];

  const getMainSteps = () => [
    { key: "quali_pole", label: "Pole", sublabel: "Qualif", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
    { key: "quali_top10", label: "Top 10", sublabel: "Qualif", icon: Medal, done: qualiTop10.length === 10, count: qualiTop10.length, max: 10 },
    { key: "race_winner", label: "Winner", sublabel: "Course", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
    { key: "race_top10", label: "Top 10", sublabel: "Course", icon: Medal, done: raceTop10.length === 10, count: raceTop10.length, max: 10 },
    { key: "bonus", label: "Bonus", sublabel: "Paris", icon: Zap, done: isMainBonusComplete, count: 0, max: 0, isBonus: true },
    { key: "minigames", label: "Jeux", sublabel: "Mini", icon: Gamepad2, done: minigamesComplete, count: 0, max: 0, isMinigames: true },
  ];

  const steps = activeTab === "sprint" ? getSprintSteps() : getMainSteps();
  const showBonus =
    activeTab === "sprint"
      ? selectionMode === "sprint_bonus"
      : selectionMode === "bonus";
  const bonusModeKey = activeTab === "sprint" ? "sprint_bonus" : "bonus";

  // ── Position helper for DriverPicker ────────────────────────────────
  const getPosition = (driverId) => {
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

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      {/* Step Navigation Grid */}
      <div className="grid grid-cols-3 gap-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = selectionMode === step.key || (step.isBonus && showBonus);

          const handleStepClick = () => {
            if (step.isMinigames) {
              navigate("/minigames");
            } else if (step.isBonus) {
              setSelectionMode(bonusModeKey);
            } else {
              setSelectionMode(step.key);
            }
          };

          let bgClass, borderClass, iconClass, labelClass;

          if (step.isMinigames || step.isBonus) {
            if (step.done) {
              bgClass = "bg-green-500/20";
              borderClass = "border-green-500";
              iconClass = "text-green-400";
              labelClass = "text-green-400";
            } else {
              bgClass = "bg-purple-500/10";
              borderClass = "border-purple-500/50";
              iconClass = "text-purple-400";
              labelClass = "text-purple-400";
            }
          } else if (isActive) {
            bgClass = activeTab === "sprint" ? "bg-yellow-500/20" : "bg-blue-500/20";
            borderClass = activeTab === "sprint" ? "border-yellow-500" : "border-blue-500";
            iconClass = activeTab === "sprint" ? "text-yellow-400" : "text-blue-400";
            labelClass = "text-white";
          } else if (step.done) {
            bgClass = "bg-green-500/10";
            borderClass = "border-green-500/50";
            iconClass = "text-green-400";
            labelClass = "text-green-400";
          } else {
            bgClass = "bg-white/5";
            borderClass = "border-gray-700";
            iconClass = "text-gray-500";
            labelClass = "text-gray-500";
          }

          return (
            <button
              key={step.key}
              onClick={handleStepClick}
              className={`flex flex-col items-center p-2 rounded-xl transition-all border-2 ${bgClass} ${borderClass}`}
              data-testid={`step-${step.key}`}
            >
              <Icon className={`w-5 h-5 mb-1 ${iconClass}`} />
              <span className={`font-heading text-[10px] ${labelClass}`}>{step.label}</span>
              <span className="font-body text-[8px] text-gray-500">{step.sublabel}</span>
              {!step.isBonus && !step.isMinigames && (
                <span className={`font-data text-xs mt-1 ${step.done ? "text-green-400" : "text-gray-400"}`}>
                  {step.count}/{step.max}
                </span>
              )}
              {(step.isBonus || step.isMinigames) && (
                <span className={`font-data text-[9px] mt-1 ${step.done ? "text-green-400" : "text-purple-400"}`}>
                  {step.done ? "✓" : "→"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection Info */}
      <SelectionInfo activeTab={activeTab} selectionMode={selectionMode}
        sprintQualiTop10={sprintQualiTop10} sprintRaceTop10={sprintRaceTop10}
        sprintDnfDrivers={sprintDnfDrivers}
        qualiTop10={qualiTop10} raceTop10={raceTop10} dnfDrivers={dnfDrivers}
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
          <Button
            onClick={() => setSelectionMode(bonusModeKey)}
            className="w-full h-12 bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/30 font-heading"
          >
            <Check className="w-5 h-5 mr-2" />
            Valider et retour aux bonus
          </Button>
        </div>
      )}
    </>
  );
}

// ── Private sub-components ───────────────────────────────────────────

function SelectionInfo({
  activeTab, selectionMode,
  sprintQualiTop10, sprintRaceTop10, sprintDnfDrivers,
  qualiTop10, raceTop10, dnfDrivers,
}) {
  return (
    <Card className="game-card">
      <CardContent className="p-4">
        <p className="font-body text-gray-300 text-sm">
          {activeTab === "sprint" ? (
            <>
              {selectionMode === "sprint_quali_pole" && "Sélectionne le pilote en pole des qualifs sprint"}
              {selectionMode === "sprint_quali_top10" && `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
              {selectionMode === "sprint_race_winner" && "Sélectionne le vainqueur de la course sprint"}
              {selectionMode === "sprint_race_top10" && `Sélectionne le Top 10 de la course sprint (${sprintRaceTop10.length}/10)`}
              {selectionMode === "sprint_bonus" && "Configure tes paris bonus sprint"}
              {selectionMode === "sprint_fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour sprint"}
              {selectionMode === "sprint_first_corner" && "Sélectionne le leader au premier virage du sprint"}
              {selectionMode === "sprint_dnf_select" && `Sélectionne les abandons sprint (${sprintDnfDrivers.length}/5)`}
            </>
          ) : (
            <>
              {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
              {selectionMode === "quali_top10" && `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
              {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
              {selectionMode === "race_top10" && `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
              {selectionMode === "bonus" && "Configure tes paris bonus"}
              {selectionMode === "fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour"}
              {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
              {selectionMode === "dnf_select" && `Sélectionne les abandons (${dnfDrivers.length}/5)`}
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function BonusPanel({
  activeTab, drivers, setSelectionMode,
  safetyCar, setSafetyCar,
  fastestLap, firstCorner,
  noDnf, setNoDnf,
  dnfDrivers, setDnfDrivers,
}) {
  return (
    <div className="space-y-4">
      <Card className="game-card">
        <CardContent className="p-4 space-y-4">
          <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
            <Zap className={activeTab === "sprint" ? "text-yellow-400" : "text-cyan-400"} />
            Paris Bonus {activeTab === "sprint" ? "Sprint" : ""}
          </h3>

          {/* Safety Car */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="font-body text-white">Safety Car</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSafetyCar(true)}
                className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                  safetyCar === true ? "bg-green-500 text-white" : "bg-white/10 text-gray-400"
                }`}
              >OUI</button>
              <button
                onClick={() => setSafetyCar(false)}
                className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                  safetyCar === false ? "bg-red-500 text-white" : "bg-white/10 text-gray-400"
                }`}
              >NON</button>
            </div>
          </div>

          {/* Fastest Lap */}
          <button
            onClick={() => setSelectionMode(activeTab === "sprint" ? "sprint_fastest_lap" : "fastest_lap")}
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-purple-400" />
              <span className="font-body text-white">Meilleur tour</span>
            </div>
            <span className="font-body text-sm text-cyan-400">
              {fastestLap
                ? drivers.find((d) => d.id === fastestLap)?.name || "Sélectionné"
                : "Sélectionner →"}
            </span>
          </button>

          {/* First Corner Leader */}
          <button
            onClick={() => setSelectionMode(activeTab === "sprint" ? "sprint_first_corner" : "first_corner")}
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-green-400" />
              <span className="font-body text-white">Leader T1</span>
            </div>
            <span className="font-body text-sm text-cyan-400">
              {firstCorner
                ? drivers.find((d) => d.id === firstCorner)?.name || "Sélectionné"
                : "Sélectionner →"}
            </span>
          </button>

          {/* DNF */}
          <div className="p-3 bg-white/5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 text-red-400" />
                <span className="font-body text-white">Abandons (DNF)</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNoDnf(true);
                  setDnfDrivers([]);
                }}
                className={`flex-1 px-3 py-2 rounded-lg font-heading text-sm transition-all ${
                  noDnf ? "bg-green-500 text-white" : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                Pas de DNF
              </button>
              <button
                onClick={() => {
                  setNoDnf(false);
                  setSelectionMode(activeTab === "sprint" ? "sprint_dnf_select" : "dnf_select");
                }}
                className={`flex-1 px-3 py-2 rounded-lg font-heading text-sm transition-all ${
                  !noDnf && dnfDrivers.length > 0
                    ? "bg-red-500 text-white"
                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                }`}
              >
                {dnfDrivers.length > 0 ? `${dnfDrivers.length} pilote(s)` : "Sélectionner →"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
