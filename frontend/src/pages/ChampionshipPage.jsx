import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { 
  Flag, Users, Trophy, RefreshCw, Loader2, ChevronLeft,
  Medal, Award, Crown, Car
} from "lucide-react";

// Jolpica-F1 API (free, no key required) - successor to Ergast API
const F1_API_BASE = "https://api.jolpi.ca/ergast/f1";

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("drivers"); // drivers, constructors
  const [driversStandings, setDriversStandings] = useState([]);
  const [constructorsStandings, setConstructorsStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [season, setSeason] = useState(new Date().getFullYear());

  const fetchStandings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch both standings in parallel
      const [driversRes, constructorsRes] = await Promise.all([
        fetch(`${F1_API_BASE}/current/driverstandings.json`),
        fetch(`${F1_API_BASE}/current/constructorstandings.json`)
      ]);

      if (!driversRes.ok || !constructorsRes.ok) {
        throw new Error("API error");
      }

      const driversData = await driversRes.json();
      const constructorsData = await constructorsRes.json();

      // Parse drivers standings
      const driversList = driversData?.MRData?.StandingsTable?.StandingsLists?.[0];
      if (driversList) {
        setSeason(driversList.season);
        setDriversStandings(driversList.DriverStandings || []);
      }

      // Parse constructors standings
      const constructorsList = constructorsData?.MRData?.StandingsTable?.StandingsLists?.[0];
      if (constructorsList) {
        setConstructorsStandings(constructorsList.ConstructorStandings || []);
      }

      setLastUpdated(new Date());
      if (isRefresh) toast.success("Classements mis à jour !");
    } catch (e) {
      console.error("Error fetching F1 standings:", e);
      toast.error("Erreur lors du chargement des classements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  const getRankStyle = (position) => {
    const pos = parseInt(position);
    if (pos === 1) return "bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-yellow-500/50";
    if (pos === 2) return "bg-gradient-to-r from-gray-400/30 to-gray-500/10 border-gray-400/50";
    if (pos === 3) return "bg-gradient-to-r from-amber-600/30 to-amber-700/10 border-amber-600/50";
    return "bg-gray-800/30 border-gray-700/50";
  };

  const getRankIcon = (position) => {
    const pos = parseInt(position);
    if (pos === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (pos === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (pos === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="font-data text-gray-500 w-5 text-center">{pos}</span>;
  };

  // Team colors mapping
  const teamColors = {
    "red_bull": "#3671C6",
    "ferrari": "#E80020",
    "mercedes": "#27F4D2",
    "mclaren": "#FF8000",
    "aston_martin": "#229971",
    "alpine": "#0093CC",
    "williams": "#64C4FF",
    "rb": "#6692FF",
    "kick_sauber": "#52E252",
    "sauber": "#52E252",
    "haas": "#B6BABD",
  };

  const getTeamColor = (constructorId) => {
    const id = constructorId?.toLowerCase().replace(/\s+/g, '_');
    return teamColors[id] || "#666666";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-400">Chargement des classements F1...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-red-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-lg uppercase tracking-tight text-white">
                  Championnat F1
                </h1>
                <p className="font-body text-xs text-gray-400">Saison {season}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchStandings(true)}
              disabled={refreshing}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {lastUpdated && (
            <p className="font-body text-[10px] text-gray-500 mt-2">
              Dernière mise à jour: {lastUpdated.toLocaleString('fr-FR')}
            </p>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg mb-4">
          <button
            onClick={() => setActiveTab("drivers")}
            className={`flex-1 py-3 px-4 rounded-lg font-heading text-sm uppercase transition-all flex items-center justify-center gap-2 ${
              activeTab === "drivers" 
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            data-testid="tab-drivers"
          >
            <Trophy className="w-4 h-4" />
            Pilotes
          </button>
          <button
            onClick={() => setActiveTab("constructors")}
            className={`flex-1 py-3 px-4 rounded-lg font-heading text-sm uppercase transition-all flex items-center justify-center gap-2 ${
              activeTab === "constructors" 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            data-testid="tab-constructors"
          >
            <Car className="w-4 h-4" />
            Écuries
          </button>
        </div>

        {/* Drivers Standings */}
        {activeTab === "drivers" && (
          <div className="space-y-2">
            {driversStandings.length === 0 ? (
              <div className="card-arcade p-8 text-center">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-body text-gray-400">Aucune donnée disponible</p>
              </div>
            ) : (
              driversStandings.map((entry) => {
                const driver = entry.Driver;
                const constructor = entry.Constructors?.[0];
                const teamColor = getTeamColor(constructor?.constructorId);
                
                return (
                  <div 
                    key={driver.driverId}
                    className={`p-3 rounded-lg border transition-all ${getRankStyle(entry.position)}`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: teamColor }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(entry.position)}
                      </div>
                      
                      {/* Driver Number */}
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-data text-lg text-white"
                        style={{ backgroundColor: teamColor }}
                      >
                        {driver.permanentNumber || "?"}
                      </div>
                      
                      {/* Driver Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm text-white truncate">
                          {driver.givenName} <span className="text-cyan-400">{driver.familyName?.toUpperCase()}</span>
                        </p>
                        <p className="font-body text-xs text-gray-500 truncate">
                          {constructor?.name || "Unknown Team"}
                        </p>
                      </div>
                      
                      {/* Points */}
                      <div className="text-right">
                        <p className={`font-data text-xl ${parseInt(entry.position) <= 3 ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.points}
                        </p>
                        <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
                      </div>
                    </div>
                    
                    {/* Wins indicator */}
                    {parseInt(entry.wins) > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="font-body text-[10px] text-yellow-400">
                          {entry.wins} victoire{parseInt(entry.wins) > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Constructors Standings */}
        {activeTab === "constructors" && (
          <div className="space-y-2">
            {constructorsStandings.length === 0 ? (
              <div className="card-arcade p-8 text-center">
                <Car className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-body text-gray-400">Aucune donnée disponible</p>
              </div>
            ) : (
              constructorsStandings.map((entry) => {
                const constructor = entry.Constructor;
                const teamColor = getTeamColor(constructor?.constructorId);
                
                return (
                  <div 
                    key={constructor.constructorId}
                    className={`p-4 rounded-lg border transition-all ${getRankStyle(entry.position)}`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: teamColor }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(entry.position)}
                      </div>
                      
                      {/* Team Color Bar */}
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: teamColor }}
                      >
                        <Car className="w-6 h-6 text-white" />
                      </div>
                      
                      {/* Constructor Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-base text-white">
                          {constructor?.name}
                        </p>
                        <p className="font-body text-xs text-gray-500">
                          {constructor?.nationality}
                        </p>
                      </div>
                      
                      {/* Points */}
                      <div className="text-right">
                        <p className={`font-data text-2xl ${parseInt(entry.position) <= 3 ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.points}
                        </p>
                        <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
                      </div>
                    </div>
                    
                    {/* Wins indicator */}
                    {parseInt(entry.wins) > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="font-body text-[10px] text-yellow-400">
                          {entry.wins} victoire{parseInt(entry.wins) > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {/* API Attribution */}
        <div className="mt-6 text-center">
          <p className="font-body text-[10px] text-gray-600">
            Données fournies par Jolpica F1 API
          </p>
        </div>
      </div>
    </div>
  );
}
