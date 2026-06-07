/**
 * SeasonProgress — Race selector + detailed results for each GP.
 * Broadcast Premium: pk-surface cards, chip tabs, shimmer loading.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { JOLPICA_API, OPENF1_API, isRaceCompleteed } from "./championshipUtils";
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
import { getRaceThumbnail } from "@/lib/raceThumbnails";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer } from "@/lib/motion";

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
  const { t } = useTranslation();
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
            (m: { circuit_short_name?: string; meeting_name?: string; meeting_key?: number }) =>
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
                      .filter((p: { position: number; driver_number?: number }) => p.position === 1)
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
                      .filter((p: { position: number; driver_number?: number }) => p.position === 1)
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
        // OpenF1 API optional — silently fall back to Ergast-only data
      }

      const raceResultsList = raceData?.MRData?.RaceTable?.Races?.[0]?.Results || [];
      const fastestLapResult = raceResultsList.find(
        (r: {
          FastestLap?: { rank?: string; Time?: { time?: string } };
          Driver?: unknown;
          Constructor?: unknown;
        }) => r.FastestLap?.rank === "1",
      );
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
      toast.error(t("championship.season_progress.load_error"));
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
    <div className="space-y-3">
      {/* Race Selector */}
      <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
        <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {t("championship.season_progress.select_gp")}
        </h3>
        <motion.div
          className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-none"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {raceSchedule.map((race) => {
            const completed = isRaceCompleteed(race);
            const isSelected = selectedRace?.round === race.round;
            const raceThumbnail = getRaceThumbnail(race);

            return (
              <motion.button
                key={race.round}
                onClick={() => {
                  if (completed) {
                    haptic("light");
                    setSelectedRace(race);
                  }
                }}
                disabled={!completed}
                className={`w-full p-2.5 rounded-lg border transition-colors text-left flex items-center justify-between ${
                  isSelected
                    ? "bg-pk-red-subtle border-pk-red/30"
                    : completed
                      ? "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]"
                      : "bg-white/[0.01] border-white/[0.04] opacity-40 cursor-not-allowed"
                }`}
                variants={fadeUp}
                data-testid={`season-race-${race.round}`}
              >
                <div className="flex items-center gap-2.5">
                  {raceThumbnail ? (
                    <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-pk-anthracite">
                      <img
                        src={raceThumbnail}
                        alt={`${race.raceName}`}
                        className={`h-full w-full object-cover ${completed ? "" : "opacity-40 saturate-50"}`}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="absolute left-0.5 top-0.5 rounded-sm bg-black/70 px-1 py-0.5 font-data text-[0.5rem] text-white">
                        {race.round}
                      </span>
                    </div>
                  ) : (
                    <span className="font-data text-sm text-pk-titane w-6 text-center">
                      {race.round}
                    </span>
                  )}
                  <div>
                    <p className="font-display text-xs">{race.raceName}</p>
                    <p className="font-data text-[0.5rem] text-pk-titane">
                      {new Date(race.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                      {!!race.Sprint && <span className="ml-1.5 text-purple-400">Sprint</span>}
                    </p>
                  </div>
                </div>
                {completed ? (
                  <ChevronRight
                    className={`w-4 h-4 ${isSelected ? "text-pk-red" : "text-pk-titane"}`}
                  />
                ) : (
                  <span className="font-data text-[0.5rem] text-pk-titane">
                    {t("championship.season_progress.upcoming")}
                  </span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Selected Race Results */}
      <AnimatePresence mode="wait">
        {selectedRace && (
          <motion.div
            key={selectedRace.round}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm">{selectedRace.raceName}</h3>
              {loadingResults && <Loader2 className="w-4 h-4 text-pk-red animate-spin" />}
            </div>

            {loadingResults ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 text-pk-red animate-spin mx-auto mb-2" />
                <p className="text-xs text-pk-titane">
                  {t("championship.season_progress.loading")}
                </p>
              </div>
            ) : raceResults ? (
              <>
                {/* Results Sub-tabs */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {[
                    { key: "race", labelKey: "championship.season_progress.tabs.race" },
                    { key: "qualifying", labelKey: "championship.season_progress.tabs.qualifying" },
                    ...(raceResults.hasSprint
                      ? [{ key: "sprint", labelKey: "championship.season_progress.tabs.sprint" }]
                      : []),
                    { key: "practice", labelKey: "championship.season_progress.tabs.practice" },
                    { key: "extras", labelKey: "championship.season_progress.tabs.bonus" },
                  ].map(({ key, labelKey }) => (
                    <button
                      key={key}
                      onClick={() => {
                        haptic("light");
                        setResultsTab(key);
                      }}
                      className={`font-data text-[0.5625rem] px-3 py-1.5 rounded-full border transition-colors ${
                        resultsTab === key
                          ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                          : "bg-white/[0.04] border-white/[0.08] text-pk-titane hover:text-pk-piste"
                      }`}
                      data-testid={`results-subtab-${key}`}
                    >
                      {t(labelKey)}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={resultsTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    {resultsTab === "race" && <RaceResultsList results={raceResults.race} />}
                    {resultsTab === "qualifying" && (
                      <QualifyingResultsList results={raceResults.qualifying} />
                    )}
                    {resultsTab === "sprint" && raceResults.hasSprint && (
                      <SprintResultsList results={raceResults.sprint} />
                    )}
                    {resultsTab === "practice" && (
                      <PracticeResultsList practice={raceResults.practice} />
                    )}
                    {resultsTab === "extras" && <ExtrasPanel raceResults={raceResults} />}
                  </motion.div>
                </AnimatePresence>
              </>
            ) : (
              <p className="text-xs text-pk-titane text-center py-4">
                {t("championship.season_progress.empty")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
