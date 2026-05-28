/**
 * Sub-panels rendered inside SeasonProgress for each results tab.
 * Broadcast Premium: pk-* cards, team-color borders, stagger animations.
 */
import { motion } from "framer-motion";
import { Clock, Flag, Target, Timer, Zap } from "lucide-react";
import { getTeamColor, getRankStyle, formatLapTime } from "./championshipUtils";
import { staggerContainer, fadeUp } from "@/lib/motion";

export interface RaceResult {
  position: string;
  points: string;
  status: string;
  Driver: { driverId: string; givenName: string; familyName: string };
  Constructor?: { constructorId: string; name: string };
  Time?: { time: string };
  FastestLap?: { rank: string; lap: string; Time?: { time: string } };
}

export interface QualifyingResult {
  position: string;
  Driver: { driverId: string; givenName: string; familyName: string };
  Constructor?: { constructorId: string };
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface LapEntry {
  driver_number: number;
  lap_duration: number;
}

export interface PracticeData {
  fp1: LapEntry[];
  fp2: LapEntry[];
  fp3: LapEntry[];
}

export interface RaceResultsData {
  fastestLap: {
    driver?: { givenName: string; familyName: string };
    constructor?: { constructorId: string; name: string };
    time: string;
    lap: string;
  } | null;
  firstCornerLeader: number | null;
  sprintFirstCornerLeader: number | null;
  hasSprint: boolean;
}

/* ── Race Results ─────────────────────────────────────── */

export function RaceResultsList({ results }: { results: RaceResult[] }) {
  return (
    <motion.div
      className="space-y-1.5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <h4 className="font-data text-[0.5625rem] text-pk-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Flag className="w-3 h-3" /> Race Standings
      </h4>
      {results.length === 0 ? (
        <p className="text-xs text-pk-titane text-center py-4">Resultats non disponibles</p>
      ) : (
        results.slice(0, 10).map((result) => (
          <motion.div
            key={result.Driver.driverId}
            className={`p-2.5 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
            variants={fadeUp}
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: getTeamColor(result.Constructor?.constructorId),
            }}
          >
            <span className="font-data text-sm w-6 text-center">{result.position}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs truncate">
                {result.Driver.givenName} {result.Driver.familyName}
              </p>
            </div>
            <span className="font-data text-[0.5625rem] text-pk-red">{result.points} pts</span>
            <span className="font-data text-[0.5625rem] text-pk-titane">
              {result.Time?.time || result.status}
            </span>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

/* ── Qualifying Results ───────────────────────────────── */

export function QualifyingResultsList({ results }: { results: QualifyingResult[] }) {
  return (
    <motion.div
      className="space-y-1.5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <h4 className="font-data text-[0.5625rem] text-pk-amber uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Clock className="w-3 h-3" /> Qualifying Standings
      </h4>
      {results.length === 0 ? (
        <p className="text-xs text-pk-titane text-center py-4">Resultats non disponibles</p>
      ) : (
        results.slice(0, 10).map((result) => (
          <motion.div
            key={result.Driver.driverId}
            className={`p-2.5 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
            variants={fadeUp}
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: getTeamColor(result.Constructor?.constructorId),
            }}
          >
            <span className="font-data text-sm w-6 text-center">{result.position}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs truncate">
                {result.Driver.givenName} {result.Driver.familyName}
              </p>
            </div>
            <span className="font-data text-[0.5625rem] text-pk-amber">
              {result.Q3 || result.Q2 || result.Q1 || "-"}
            </span>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

/* ── Sprint Results ───────────────────────────────────── */

export function SprintResultsList({ results }: { results: RaceResult[] }) {
  return (
    <motion.div
      className="space-y-1.5"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <h4 className="font-data text-[0.5625rem] text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Zap className="w-3 h-3" /> Sprint Standings
      </h4>
      {results.length === 0 ? (
        <p className="text-xs text-pk-titane text-center py-4">Resultats non disponibles</p>
      ) : (
        results.slice(0, 10).map((result) => (
          <motion.div
            key={result.Driver.driverId}
            className={`p-2.5 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
            variants={fadeUp}
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: getTeamColor(result.Constructor?.constructorId),
            }}
          >
            <span className="font-data text-sm w-6 text-center">{result.position}</span>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xs truncate">
                {result.Driver.givenName} {result.Driver.familyName}
              </p>
            </div>
            <span className="font-data text-[0.5625rem] text-purple-400">{result.points} pts</span>
            <span className="font-data text-[0.5625rem] text-pk-titane">
              {result.Time?.time || result.status}
            </span>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

/* ── Practice Results ─────────────────────────────────── */

export function PracticeResultsList({ practice }: { practice: PracticeData }) {
  return (
    <div className="space-y-4">
      {(["fp1", "fp2", "fp3"] as const).map((session, sessionIdx) => {
        const sessionData = practice[session];
        const sessionName = `Essais Libres ${sessionIdx + 1}`;

        return (
          <div key={session}>
            <h4 className="font-data text-[0.5625rem] text-pk-info uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Timer className="w-3 h-3" /> {sessionName}
            </h4>
            {!sessionData || sessionData.length === 0 ? (
              <p className="text-xs text-pk-titane py-2">Data unavailable</p>
            ) : (
              <div className="space-y-1">
                {sessionData
                  .slice(0, 5)
                  .map((lap: { driver_number: number; lap_duration: number }, idx: number) => (
                    <div
                      key={`${session}-${lap.driver_number}`}
                      className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.08] flex items-center gap-2"
                    >
                      <span className="font-data text-sm w-6 text-center text-pk-titane">
                        {idx + 1}
                      </span>
                      <span className="font-display text-xs">#{lap.driver_number}</span>
                      <span className="flex-1" />
                      <span className="font-data text-[0.5625rem] text-pk-info">
                        {formatLapTime(lap.lap_duration)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Extras Panel ─────────────────────────────────────── */

export function ExtrasPanel({ raceResults }: { raceResults: RaceResultsData }) {
  return (
    <div className="space-y-3">
      {/* Fastest Lap */}
      <div className="bg-purple-500/[0.06] border border-purple-500/20 rounded-lg p-4">
        <h4 className="font-data text-[0.5625rem] text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> Fastest Lap in Race
        </h4>
        {raceResults.fastestLap ? (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: getTeamColor(raceResults.fastestLap.constructor?.constructorId),
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm">
                {raceResults.fastestLap.driver?.givenName}{" "}
                {raceResults.fastestLap.driver?.familyName}
              </p>
              <p className="font-data text-[0.5625rem] text-pk-titane">
                {raceResults.fastestLap.constructor?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-data text-base text-purple-400">{raceResults.fastestLap.time}</p>
              <p className="font-data text-[0.5rem] text-pk-titane">
                Lap {raceResults.fastestLap.lap}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-pk-titane">Data unavailable</p>
        )}
      </div>

      {/* First Corner Leader - Race */}
      <div className="bg-pk-emerald/[0.06] border border-pk-emerald/20 rounded-lg p-4">
        <h4 className="font-data text-[0.5625rem] text-pk-emerald uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Target className="w-3 h-3" /> Leader at Turn 1 (Race)
        </h4>
        {raceResults.firstCornerLeader ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pk-emerald/[0.15] flex items-center justify-center">
              <span className="font-data text-base text-pk-emerald">
                #{raceResults.firstCornerLeader}
              </span>
            </div>
            <p className="text-xs text-pk-piste/70">
              Driver #{raceResults.firstCornerLeader} led at the first corner
            </p>
          </div>
        ) : (
          <p className="text-xs text-pk-titane">Data unavailable via API</p>
        )}
      </div>

      {/* First Corner Leader - Sprint */}
      {raceResults.hasSprint && (
        <div className="bg-pk-amber/[0.06] border border-pk-amber/20 rounded-lg p-4">
          <h4 className="font-data text-[0.5625rem] text-pk-amber uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Target className="w-3 h-3" /> Leader at Turn 1 (Sprint)
          </h4>
          {raceResults.sprintFirstCornerLeader ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pk-amber/[0.15] flex items-center justify-center">
                <span className="font-data text-base text-pk-amber">
                  #{raceResults.sprintFirstCornerLeader}
                </span>
              </div>
              <p className="text-xs text-pk-piste/70">
                Driver #{raceResults.sprintFirstCornerLeader} led at the first corner
              </p>
            </div>
          ) : (
            <p className="text-xs text-pk-titane">Data unavailable via API</p>
          )}
        </div>
      )}
    </div>
  );
}
