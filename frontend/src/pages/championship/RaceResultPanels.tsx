/**
 * Sub-panels rendered inside SeasonProgress for each results tab.
 */
import { Clock, Flag, Target, Timer, Zap } from "lucide-react";
import { getTeamColor, getRankStyle, formatLapTime } from "./championshipUtils";

interface RaceResult {
  position: string;
  points: string;
  status: string;
  Driver: { driverId: string; givenName: string; familyName: string };
  Constructor?: { constructorId: string; name: string };
  Time?: { time: string };
  FastestLap?: { rank: string; lap: string; Time?: { time: string } };
}

interface QualifyingResult {
  position: string;
  Driver: { driverId: string; givenName: string; familyName: string };
  Constructor?: { constructorId: string };
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

interface LapEntry {
  driver_number: number;
  lap_duration: number;
}

interface PracticeData {
  fp1: LapEntry[];
  fp2: LapEntry[];
  fp3: LapEntry[];
}

interface RaceResultsData {
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

export function RaceResultsList({ results }: { results: RaceResult[] }) {
  return (
    <div className="space-y-2">
      <h4 className="font-heading text-xs text-red-400 uppercase mb-2 flex items-center gap-2">
        <Flag className="w-3 h-3" /> Classement Course
      </h4>
      {results.length === 0 ? (
        <p className="font-body text-sm text-gray-500 text-center py-4">
          Résultats non disponibles
        </p>
      ) : (
        results.slice(0, 10).map((result) => (
          <div
            key={result.Driver.driverId}
            className={`p-2 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: getTeamColor(result.Constructor?.constructorId),
            }}
          >
            <span className="font-data text-sm w-6 text-center">{result.position}</span>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xs text-white truncate">
                {result.Driver.givenName} {result.Driver.familyName}
              </p>
            </div>
            <span className="font-data text-xs text-cyan-400">{result.points} pts</span>
            <span className="font-body text-xs text-gray-500">
              {result.Time?.time || result.status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function QualifyingResultsList({ results }: { results: QualifyingResult[] }) {
  return (
    <div className="space-y-2">
      <h4 className="font-heading text-xs text-yellow-400 uppercase mb-2 flex items-center gap-2">
        <Clock className="w-3 h-3" /> Classement Qualifications
      </h4>
      {results.length === 0 ? (
        <p className="font-body text-sm text-gray-500 text-center py-4">
          Résultats non disponibles
        </p>
      ) : (
        results.slice(0, 10).map((result) => (
          <div
            key={result.Driver.driverId}
            className={`p-2 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: getTeamColor(result.Constructor?.constructorId),
            }}
          >
            <span className="font-data text-sm w-6 text-center">{result.position}</span>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xs text-white truncate">
                {result.Driver.givenName} {result.Driver.familyName}
              </p>
            </div>
            <div className="text-right">
              <span className="font-data text-xs text-yellow-400">
                {result.Q3 || result.Q2 || result.Q1 || "-"}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function SprintResultsList({ results }: { results: RaceResult[] }) {
  return (
    <div className="space-y-2">
      <h4 className="font-heading text-xs text-purple-400 uppercase mb-2 flex items-center gap-2">
        <Zap className="w-3 h-3" /> Classement Sprint
      </h4>
      {results.length === 0 ? (
        <p className="font-body text-sm text-gray-500 text-center py-4">
          Résultats non disponibles
        </p>
      ) : (
        results.slice(0, 10).map((result) => (
          <div
            key={result.Driver.driverId}
            className={`p-2 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: getTeamColor(result.Constructor?.constructorId),
            }}
          >
            <span className="font-data text-sm w-6 text-center">{result.position}</span>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xs text-white truncate">
                {result.Driver.givenName} {result.Driver.familyName}
              </p>
            </div>
            <span className="font-data text-xs text-purple-400">{result.points} pts</span>
            <span className="font-body text-xs text-gray-500">
              {result.Time?.time || result.status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export function PracticeResultsList({ practice }: { practice: PracticeData }) {
  return (
    <div className="space-y-4">
      {(["fp1", "fp2", "fp3"] as const).map((session, sessionIdx) => {
        const sessionData = practice[session];
        const sessionName = `Essais Libres ${sessionIdx + 1}`;

        return (
          <div key={session}>
            <h4 className="font-heading text-xs text-cyan-400 uppercase mb-2 flex items-center gap-2">
              <Timer className="w-3 h-3" /> {sessionName}
            </h4>
            {!sessionData || sessionData.length === 0 ? (
              <p className="font-body text-xs text-gray-500 py-2">Données non disponibles</p>
            ) : (
              <div className="space-y-1">
                {sessionData.slice(0, 5).map((lap: any, idx: any) => (
                  <div
                    key={`${session}-${lap.driver_number}`}
                    className="p-2 rounded-lg bg-gray-800/30 border border-gray-700/50 flex items-center gap-2"
                  >
                    <span className="font-data text-sm w-6 text-center text-gray-400">
                      {idx + 1}
                    </span>
                    <span className="font-heading text-xs text-white">#{lap.driver_number}</span>
                    <span className="flex-1" />
                    <span className="font-data text-xs text-cyan-400">
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

export function ExtrasPanel({ raceResults }: { raceResults: RaceResultsData }) {
  return (
    <div className="space-y-4">
      {/* Fastest Lap */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <h4 className="font-heading text-xs text-purple-400 uppercase mb-3 flex items-center gap-2">
          <Zap className="w-3 h-3" /> Meilleur Tour en Course
        </h4>
        {raceResults.fastestLap ? (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: getTeamColor(raceResults.fastestLap.constructor?.constructorId),
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm text-white">
                {raceResults.fastestLap.driver?.givenName}{" "}
                {raceResults.fastestLap.driver?.familyName}
              </p>
              <p className="font-body text-xs text-gray-500">
                {raceResults.fastestLap.constructor?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-data text-lg text-purple-400">{raceResults.fastestLap.time}</p>
              <p className="font-body text-[10px] text-gray-500">
                Tour {raceResults.fastestLap.lap}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-body text-sm text-gray-500">Données non disponibles</p>
        )}
      </div>

      {/* First Corner Leader - Race */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <h4 className="font-heading text-xs text-green-400 uppercase mb-3 flex items-center gap-2">
          <Target className="w-3 h-3" /> Leader au 1er Virage (Course)
        </h4>
        {raceResults.firstCornerLeader ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <span className="font-data text-lg text-green-400">
                #{raceResults.firstCornerLeader}
              </span>
            </div>
            <p className="font-body text-sm text-gray-400">
              Pilote #{raceResults.firstCornerLeader} menait au premier virage
            </p>
          </div>
        ) : (
          <p className="font-body text-sm text-gray-500">Données non disponibles via API</p>
        )}
      </div>

      {/* First Corner Leader - Sprint */}
      {raceResults.hasSprint && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <h4 className="font-heading text-xs text-orange-400 uppercase mb-3 flex items-center gap-2">
            <Target className="w-3 h-3" /> Leader au 1er Virage (Sprint)
          </h4>
          {raceResults.sprintFirstCornerLeader ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <span className="font-data text-lg text-orange-400">
                  #{raceResults.sprintFirstCornerLeader}
                </span>
              </div>
              <p className="font-body text-sm text-gray-400">
                Pilote #{raceResults.sprintFirstCornerLeader} menait au premier virage
              </p>
            </div>
          ) : (
            <p className="font-body text-sm text-gray-500">Données non disponibles via API</p>
          )}
        </div>
      )}
    </div>
  );
}
