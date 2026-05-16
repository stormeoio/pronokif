import { useNavigate } from "react-router-dom";
import { Trophy, ChevronRight } from "lucide-react";
import { getTeamColor, getRankStyle, getRankIcon, DRIVER_ID_MAP } from "./championshipUtils";

export default function DriverStandings({ driversStandings }) {
  const navigate = useNavigate();

  if (driversStandings.length === 0) {
    return (
      <div className="card-arcade p-8 text-center">
        <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="font-body text-gray-400">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {driversStandings.map((entry) => {
        const driver = entry.Driver;
        const constructor = entry.Constructors?.[0];
        const teamColor = getTeamColor(constructor?.constructorId);
        const mappedDriverId = DRIVER_ID_MAP[driver.driverId] || driver.familyName?.toLowerCase();

        return (
          <div
            key={driver.driverId}
            onClick={() => navigate(`/driver/${mappedDriverId}`)}
            className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${getRankStyle(entry.position)}`}
            style={{ borderLeftWidth: "4px", borderLeftColor: teamColor }}
            data-testid={`driver-row-${driver.driverId}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                {getRankIcon(entry.position)}
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-data text-lg text-white"
                style={{ backgroundColor: teamColor }}
              >
                {driver.permanentNumber || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-white truncate">
                  {driver.givenName}{" "}
                  <span className="text-cyan-400">{driver.familyName?.toUpperCase()}</span>
                </p>
                <p className="font-body text-xs text-gray-500 truncate">
                  {constructor?.name || "Unknown Team"}
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className={`font-data text-xl ${parseInt(entry.position) <= 3 ? "text-yellow-400" : "text-white"}`}>
                    {entry.points}
                  </p>
                  <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            {parseInt(entry.wins) > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="font-body text-[10px] text-yellow-400">
                  {entry.wins} victoire{parseInt(entry.wins) > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
