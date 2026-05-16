import { ChevronRight, History, Trophy } from "lucide-react";

interface PointsHistoryProps {
  pointsHistory: Record<string, any>;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
}

export default function PointsHistory({
  pointsHistory,
  showHistory,
  setShowHistory,
}: PointsHistoryProps) {
  return (
    <div className="card-arcade overflow-hidden">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        data-testid="toggle-points-history"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <span className="font-body text-white font-semibold block">Historique des points</span>
            <span className="font-body text-xs text-gray-400">
              {pointsHistory.summary?.races_with_results || 0} courses avec résultats
            </span>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-500 transition-transform ${showHistory ? "rotate-90" : ""}`}
        />
      </button>

      {showHistory && (
        <div className="border-t border-gray-700/50">
          {pointsHistory.history?.length === 0 ? (
            <div className="p-6 text-center">
              <History className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="font-body text-gray-400 text-sm">Aucun historique disponible</p>
              <p className="font-body text-gray-500 text-xs">
                Fais des pronostics pour voir ton historique
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/30 max-h-96 overflow-y-auto">
              {pointsHistory.history?.map((race: any) => (
                <RaceHistoryItem key={race.race_id} race={race} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RaceHistoryItem({ race }: { race: Record<string, any> }) {
  return (
    <div className="p-4">
      {/* Race Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-heading text-sm text-white uppercase">
            {race.race_name?.replace(" Grand Prix", "")}
          </h4>
          {race.is_sprint_weekend && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-heading">
              SPRINT
            </span>
          )}
        </div>
        <div className="text-right">
          {race.has_results ? (
            <span className="font-data text-xl text-green-400">+{race.total_points} pts</span>
          ) : (
            <span className="font-body text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              En attente
            </span>
          )}
        </div>
      </div>

      {/* Points Breakdown */}
      {race.has_results && race.points_breakdown && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <BreakdownItem label="Pole" points={race.points_breakdown.quali_pole.points} />
            <BreakdownItem label="Top 10 Quali" points={race.points_breakdown.quali_top10.points} />
            <BreakdownItem label="Vainqueur" points={race.points_breakdown.race_winner.points} />
            <BreakdownItem label="Top 10 Course" points={race.points_breakdown.race_top10.points} />
          </div>

          {race.is_sprint_weekend && race.sprint_breakdown && (
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <div className="flex justify-between bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                <span className="text-yellow-400/70">Sprint Quali</span>
                <span
                  className={
                    race.sprint_breakdown.sprint_quali_top10.points > 0
                      ? "text-yellow-400"
                      : "text-gray-600"
                  }
                >
                  +{race.sprint_breakdown.sprint_quali_top10.points}
                </span>
              </div>
              <div className="flex justify-between bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                <span className="text-yellow-400/70">Sprint Course</span>
                <span
                  className={
                    race.sprint_breakdown.sprint_race_top10.points > 0
                      ? "text-yellow-400"
                      : "text-gray-600"
                  }
                >
                  +{race.sprint_breakdown.sprint_race_top10.points}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between bg-purple-500/10 p-2 rounded border border-purple-500/20 text-xs">
            <span className="text-purple-400/70">Bonus (SC, DNF, Tour, T1)</span>
            <span
              className={
                race.points_breakdown.bonus.points > 0 ? "text-purple-400" : "text-gray-600"
              }
            >
              +{race.points_breakdown.bonus.points}
            </span>
          </div>

          {race.details && race.details.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700/30">
              <div className="flex flex-wrap gap-1">
                {race.details.map((detail: any, i: any) => (
                  <span
                    key={i}
                    className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownItem({ label, points }: { label: string; points: number }) {
  return (
    <div className="flex justify-between bg-gray-800/50 p-2 rounded">
      <span className="text-gray-400">{label}</span>
      <span className={points > 0 ? "text-green-400" : "text-gray-600"}>+{points}</span>
    </div>
  );
}
