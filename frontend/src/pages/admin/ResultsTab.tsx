import { motion } from "framer-motion";
import { Check, Flag, Trophy, Calendar, Save, Loader2, Zap, RefreshCw, Medal } from "lucide-react";
import { BonusPanel, DnfPanel, DriverGrid } from "./ResultsSubComponents";
import { useResultsState, type SelectionMode } from "./hooks/useResultsState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Race {
  id: number | string;
  name: string;
  date: string;
  is_past: boolean;
  is_sprint: boolean;
  has_results: boolean;
  [key: string]: unknown;
}

interface Driver {
  id: string | number;
  name: string;
  team: string;
  number: number;
}

interface ResultsTabProps {
  races: Race[];
  setRaces: () => void;
  drivers: Driver[];
}

export default function ResultsTab({ races, setRaces, drivers }: ResultsTabProps) {
  const {
    selectedRace,
    selectRace,
    saving,
    syncing,
    selectionMode,
    setSelectionMode,
    qualiPole,
    qualiTop10,
    sprintQualiPole,
    sprintQualiTop10,
    sprintRaceWinner,
    sprintRaceTop10,
    raceWinner,
    raceTop10,
    safetyCar,
    setSafetyCar,
    dnfDrivers,
    setDnfDrivers,
    fastestLap,
    firstCornerLeader,
    handleDriverSelect,
    isDriverSelected,
    getDriverPosition,
    isCompletee,
    handleSubmit,
    handleSyncOpenF1,
  } = useResultsState({ setRaces });

  // Selection steps
  const getSelectionSteps = () => {
    const steps = [];
    if (selectedRace?.is_sprint) {
      steps.push(
        {
          key: "sprint_quali_pole",
          label: "Pole SQ",
          icon: Flag,
          done: !!sprintQualiPole,
          count: sprintQualiPole ? 1 : 0,
          max: 1,
          isSprint: true,
        },
        {
          key: "sprint_quali_top10",
          label: "Top10 SQ",
          icon: Medal,
          done: sprintQualiTop10.length === 10,
          count: sprintQualiTop10.length,
          max: 10,
          isSprint: true,
        },
        {
          key: "sprint_race_winner",
          label: "Vainq. SR",
          icon: Trophy,
          done: !!sprintRaceWinner,
          count: sprintRaceWinner ? 1 : 0,
          max: 1,
          isSprint: true,
        },
        {
          key: "sprint_race_top10",
          label: "Top10 SR",
          icon: Medal,
          done: sprintRaceTop10.length === 10,
          count: sprintRaceTop10.length,
          max: 10,
          isSprint: true,
        },
      );
    }
    steps.push(
      {
        key: "quali_pole",
        label: "Pole",
        icon: Flag,
        done: !!qualiPole,
        count: qualiPole ? 1 : 0,
        max: 1,
      },
      {
        key: "quali_top10",
        label: "Top 10 Q",
        icon: Trophy,
        done: qualiTop10.length === 10,
        count: qualiTop10.length,
        max: 10,
      },
      {
        key: "race_winner",
        label: "Winner",
        icon: Trophy,
        done: !!raceWinner,
        count: raceWinner ? 1 : 0,
        max: 1,
      },
      {
        key: "race_top10",
        label: "Top 10 R",
        icon: Trophy,
        done: raceTop10.length === 10,
        count: raceTop10.length,
        max: 10,
      },
      { key: "bonus", label: "Bonus", icon: Zap, done: true, count: 0, max: 0, isBonus: true },
    );
    return steps;
  };

  const selectionSteps = getSelectionSteps();
  const showBonus = ["bonus", "fastest_lap", "first_corner", "dnf_select"].includes(
    selectionMode as string,
  );

  return (
    <>
      {/* Race Selector */}
      <div className="card-arcade mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600/20 to-transparent px-4 py-3 border-b border-gray-700/50">
          <h3 className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Select a race
          </h3>
        </div>
        <div className="p-3">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {races
              .filter((r) => r.is_past)
              .map((race) => (
                <Button
                  key={race.id}
                  variant={selectedRace?.id === race.id ? "default" : "outline"}
                  onClick={() => selectRace(race)}
                  className={`flex-shrink-0 text-xs ${
                    selectedRace?.id === race.id
                      ? "btn-racing"
                      : race.has_results
                        ? "border-green-500/50 text-green-400"
                        : "border-gray-700 text-gray-300"
                  }`}
                >
                  {race.name.replace(" Grand Prix", "")}
                  {race.has_results && <Check className="w-3 h-3 ml-1" />}
                  {race.is_sprint && <Zap className="w-3 h-3 ml-1 text-purple-400" />}
                </Button>
              ))}
          </div>
        </div>
      </div>

      {selectedRace && (
        <>
          {/* Race Info */}
          <Card className="game-card mb-4">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading text-lg uppercase text-white flex items-center gap-2">
                    {selectedRace.name as string}
                    {selectedRace.is_sprint && (
                      <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-xs font-heading uppercase">
                        Sprint
                      </span>
                    )}
                  </h2>
                  <p className="font-body text-sm text-gray-400">{selectedRace.date as string}</p>
                  {selectedRace.has_results && (
                    <p className="font-body text-xs text-green-400 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Resultats deja enregistres (modification
                      possible)
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleSyncOpenF1}
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-1 text-xs">OpenF1</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selection Steps */}
          <motion.div
            className="flex gap-1 mb-6 overflow-x-auto no-scrollbar"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {selectionSteps.map((step) => {
              const Icon = step.icon;
              const isActive = selectionMode === step.key || (step.key === "bonus" && showBonus);
              return (
                <motion.button
                  key={step.key}
                  onClick={() => setSelectionMode(step.key as SelectionMode)}
                  className={`flex-1 min-w-[55px] p-2 rounded-lg border-2 transition-all ${
                    isActive
                      ? step.isBonus
                        ? "border-yellow-500 bg-yellow-500/20 glow-yellow"
                        : step.isSprint
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-orange-500 bg-orange-500/20 glow-orange"
                      : step.done && !step.isBonus
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-gray-700 bg-gray-900/50"
                  }`}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8 },
                    visible: { opacity: 1, scale: 1 },
                  }}
                  whileTap={{ scale: 0.85 }}
                >
                  <Icon
                    className={`w-4 h-4 mx-auto mb-1 ${
                      isActive
                        ? step.isBonus
                          ? "text-yellow-500"
                          : step.isSprint
                            ? "text-purple-500"
                            : "text-orange-500"
                        : step.done && !step.isBonus
                          ? "text-green-500"
                          : "text-gray-500"
                    }`}
                  />
                  <p
                    className={`font-heading text-[8px] uppercase ${isActive ? "text-white" : "text-gray-400"}`}
                  >
                    {step.label}
                  </p>
                  {!step.isBonus && (
                    <p className="font-data text-[9px] text-gray-500">
                      {step.count}/{step.max}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {(selectionMode as string) === "bonus" && (
            <BonusPanel
              safetyCar={safetyCar}
              setSafetyCar={setSafetyCar}
              dnfDrivers={dnfDrivers}
              setDnfDrivers={setDnfDrivers}
              fastestLap={fastestLap}
              firstCornerLeader={firstCornerLeader}
              drivers={drivers}
              setSelectionMode={(mode) => setSelectionMode(mode as SelectionMode)}
            />
          )}

          {selectionMode === "dnf_select" && (
            <DnfPanel
              dnfDrivers={dnfDrivers}
              setDnfDrivers={setDnfDrivers}
              drivers={drivers}
              setSelectionMode={(mode) => setSelectionMode(mode as SelectionMode)}
            />
          )}

          {!showBonus && (
            <Card className="game-card mb-4">
              <CardContent className="p-4">
                <p className="font-body text-gray-300">
                  {selectionMode === "quali_pole" && "Select the pole sitter"}
                  {selectionMode === "quali_top10" &&
                    `Selectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
                  {selectionMode === "sprint_quali_pole" &&
                    "Select the pole sitter des qualifs sprint"}
                  {selectionMode === "sprint_quali_top10" &&
                    `Selectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
                  {selectionMode === "sprint_race_winner" && "Select the Sprint Race winner"}
                  {selectionMode === "sprint_race_top10" &&
                    `Select the Sprint Race Top 10 (${sprintRaceTop10.length}/10)`}
                  {selectionMode === "race_winner" && "Select the race winner"}
                  {selectionMode === "race_top10" &&
                    `Select the race Top 10 (${raceTop10.length}/10)`}
                  {selectionMode === "fastest_lap" && "Select the driver who set the fastest lap"}
                  {selectionMode === "first_corner" && "Selectionne le leader au premier virage"}
                </p>
              </CardContent>
            </Card>
          )}

          {!["bonus"].includes(selectionMode) && (
            <DriverGrid
              drivers={drivers}
              isDriverSelected={(id) => isDriverSelected(String(id))}
              getDriverPosition={(id) => getDriverPosition(String(id))}
              handleDriverSelect={(id) => handleDriverSelect(String(id))}
            />
          )}
        </>
      )}

      {selectedRace && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!isCompletee || saving}
              className={`w-full h-14 font-heading uppercase tracking-wider transition-all ${
                isCompletee ? "btn-gaming" : "bg-gray-800 text-gray-500 border-2 border-gray-700"
              }`}
              data-testid="submit-results-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save results
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
