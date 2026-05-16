import { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { JOLPICA_API, OPENF1_API, isRaceCompleted } from "./championshipUtils";
import {
  RaceResultsList,
  QualifyingResultsList,
  SprintResultsList,
  PracticeResultsList,
  ExtrasPanel,
  type RaceResult,
  type QualifyingResult,
  type PracticeData,
  type RaceResultsData,
} from "./RaceResultPanels";

interface Race {
  round: string;
  season: string;
  raceName: string;
  date: string;
  Sprint?: unknown;
  Circuit?: { circuitId: string };
}

interface RaceResults extends RaceResultsData {
  race: RaceResult[];
  qualifying: QualifyingResult[];
  sprint: RaceResult[];
  sprintQualifying: Array<Record<string, unknown>>;
  practice: PracticeData;
}

interface SeasonProgressProps {
  raceSchedule: Race[];
}

export default function SeasonProgress({ raceSchedule }: SeasonProgressProps) {
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResults | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsTab, setResultsTab] = useState("race");

  const fetchRaceResults = useCallback(async (race: Race) => {
    setLoadingResults(true);
    setRaceResults(null);

    try {
      const round = race.round;
      const season = race.season;

      const [raceRes, qualifyingRes, sprintRes] = await Promise.all([
        fetch(`${JOLPICA_API}/${season}/${round}/results.json`),
        fetch(`${JOLPICA_API}/${season}/${round}/qualifying.json`),
        fetch(`${JOLPICA_API}/${season}/${round}/sprint.json`).catch(() => null),
      ]);

      const raceData = raceRes.ok ? await raceRes.json() : null;
      const qualifyingData = qualifyingRes.ok ? await qualifyingRes.json() : null;
      const sprintData = sprintRes?.ok ? await sprintRes.json() : null;

      const practiceData: PracticeData = { fp1: [], fp2: [], fp3: [] };
      let fastestLap: RaceResults["fastestLap"] = null;
      let firstCornerLeader: number | null = null;
      let sprintFirstCornerLeader: number | null = null;

      try {
        const meetingsRes = await fetch(`${OPENF1_API}/meetings?year=${season}`);
        if (meetingsRes.ok) {
          const meetings = await meetingsRes.json();
          const circuitName = race.Circuit?.circuitId?.toLowerCase() || "";
          const meeting = meetings.find(
            (m: any) =>
              m.circuit_short_name?.toLowerCase().includes(circuitName) ||
              m.meeting_name
                ?.toLowerCase()
                .includes(race.raceName?.toLowerCase().replace(" grand prix", "")),
          );

          if (meeting) {
            const sessionsRes = await fetch(
              `${OPENF1_API}/sessions?meeting_key=${meeting.meeting_key}`,
            );
            if (sessionsRes.ok) {
              const sessions = await sessionsRes.json();

              for (const session of sessions) {
                if (session.session_name?.includes("Practice")) {
                  const lapsRes = await fetch(
                    `${OPENF1_API}/laps?session_key=${session.session_key}`,
                  );
                  if (lapsRes.ok) {
                    const laps = await lapsRes.json();
                    const bestLaps: Record<
                      number,
                      { driver_number: number; lap_duration: number }
                    > = {};
                    laps.forEach((lap: { driver_number: number; lap_duration: number }) => {
                      if (
                        lap.lap_duration &&
                        (!bestLaps[lap.driver_number] ||
                          lap.lap_duration < bestLaps[lap.driver_number]!.lap_duration)
                      ) {
                        bestLaps[lap.driver_number] = lap;
                      }
                    });
                    const sortedLaps = Object.values(bestLaps).sort(
                      (a: { lap_duration: number }, b: { lap_duration: number }) =>
                        a.lap_duration - b.lap_duration,
                    );

                    if (session.session_name === "Practice 1") practiceData.fp1 = sortedLaps;
                    else if (session.session_name === "Practice 2") practiceData.fp2 = sortedLaps;
                    else if (session.session_name === "Practice 3") practiceData.fp3 = sortedLaps;
                  }
                }

                if (session.session_name === "Race") {
                  const positionsRes = await fetch(
                    `${OPENF1_API}/position?session_key=${session.session_key}`,
                  );
                  if (positionsRes.ok) {
                    const positions = await positionsRes.json();
                    const firstPositions = positions
                      .filter((p: any) => p.position === 1)
                      .slice(0, 5);
                    if (firstPositions.length > 1) {
                      firstCornerLeader =
                        firstPositions[1]?.driver_number || firstPositions[0]?.driver_number;
                    }
                  }
                }

                if (session.session_name === "Sprint") {
                  const positionsRes = await fetch(
                    `${OPENF1_API}/position?session_key=${session.session_key}`,
                  );
                  if (positionsRes.ok) {
                    const positions = await positionsRes.json();
                    const firstPositions = positions
                      .filter((p: any) => p.position === 1)
                      .slice(0, 5);
                    if (firstPositions.length > 1) {
                      sprintFirstCornerLeader =
                        firstPositions[1]?.driver_number || firstPositions[0]?.driver_number;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (openF1Error: unknown) {
        console.log("OpenF1 data not available:", openF1Error);
      }

      const raceResultsList = raceData?.MRData?.RaceTable?.Races?.[0]?.Results || [];
      const fastestLapResult = raceResultsList.find((r: any) => r.FastestLap?.rank === "1");
      if (fastestLapResult) {
        fastestLap = {
          driver: fastestLapResult.Driver,
          constructor: fastestLapResult.Constructor,
          time: fastestLapResult.FastestLap?.Time?.time,
          lap: fastestLapResult.FastestLap?.lap,
        };
      }

      setRaceResults({
        race: raceData?.MRData?.RaceTable?.Races?.[0]?.Results || [],
        qualifying: qualifyingData?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [],
        sprint: sprintData?.MRData?.RaceTable?.Races?.[0]?.SprintResults || [],
        sprintQualifying: [],
        practice: practiceData,
        fastestLap,
        firstCornerLeader,
        sprintFirstCornerLeader,
        hasSprint:
          race.Sprint !== undefined ||
          sprintData?.MRData?.RaceTable?.Races?.[0]?.SprintResults?.length > 0,
      });
    } catch (e: unknown) {
      console.error("Error fetching race results:", e);
      toast.error("Erreur lors du chargement des résultats");
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRace) {
      fetchRaceResults(selectedRace);
    }
  }, [selectedRace, fetchRaceResults]);

  return (
    <div className="space-y-4">
      {/* Race Selector */}
      <div className="card-arcade p-4">
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Sélectionner un Grand Prix
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {raceSchedule.map((race) => {
            const completed = isRaceCompleted(race);
            const isSelected = selectedRace?.round === race.round;

            return (
              <button
                key={race.round}
                onClick={() => completed && setSelectedRace(race)}
                disabled={!completed}
                className={`w-full p-3 rounded-lg border transition-all text-left flex items-center justify-between ${
                  isSelected
                    ? "bg-green-500/20 border-green-500/50"
                    : completed
                      ? "bg-gray-800/30 border-gray-700/50 hover:border-cyan-500/50 hover:bg-cyan-500/5"
                      : "bg-gray-800/10 border-gray-800/30 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-data text-lg text-gray-500 w-8">{race.round}</span>
                  <div>
                    <p className="font-heading text-sm text-white">{race.raceName}</p>
                    <p className="font-body text-xs text-gray-500">
                      {new Date(race.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                      {!!race.Sprint && <span className="ml-2 text-purple-400">Sprint</span>}
                    </p>
                  </div>
                </div>
                {completed ? (
                  <ChevronRight
                    className={`w-5 h-5 ${isSelected ? "text-green-400" : "text-gray-500"}`}
                  />
                ) : (
                  <span className="font-body text-xs text-gray-600">À venir</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Race Results */}
      {selectedRace && (
        <div className="card-arcade p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base text-white">{selectedRace.raceName}</h3>
            {loadingResults && <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />}
          </div>

          {loadingResults ? (
            <div className="py-8 text-center">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-2" />
              <p className="font-body text-sm text-gray-400">Chargement des résultats...</p>
            </div>
          ) : raceResults ? (
            <>
              {/* Results Sub-tabs */}
              <div className="flex flex-wrap gap-1 mb-4">
                {[
                  { key: "race", label: "Course", color: "red" },
                  { key: "qualifying", label: "Qualifications", color: "yellow" },
                  ...(raceResults.hasSprint
                    ? [{ key: "sprint", label: "Sprint", color: "purple" }]
                    : []),
                  { key: "practice", label: "Essais", color: "cyan" },
                  { key: "extras", label: "Bonus", color: "green" },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setResultsTab(key)}
                    className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all ${
                      resultsTab === key
                        ? `bg-${color}-500 text-white`
                        : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {resultsTab === "race" && <RaceResultsList results={raceResults.race} />}
              {resultsTab === "qualifying" && (
                <QualifyingResultsList results={raceResults.qualifying} />
              )}
              {resultsTab === "sprint" && raceResults.hasSprint && (
                <SprintResultsList results={raceResults.sprint} />
              )}
              {resultsTab === "practice" && <PracticeResultsList practice={raceResults.practice} />}
              {resultsTab === "extras" && <ExtrasPanel raceResults={raceResults} />}
            </>
          ) : (
            <p className="font-body text-sm text-gray-500 text-center py-4">
              Sélectionnez un Grand Prix terminé pour voir les résultats
            </p>
          )}
        </div>
      )}
    </div>
  );
}
