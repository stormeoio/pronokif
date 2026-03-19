import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { 
  Flag, Trophy, RefreshCw, Loader2, Medal, Award, Crown, Car,
  Calendar, Clock, ChevronDown, ChevronRight, Zap, Timer, Target
} from "lucide-react";

// APIs
const JOLPICA_API = "https://api.jolpi.ca/ergast/f1";
const OPENF1_API = "https://api.openf1.org/v1";

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("drivers"); // drivers, constructors, results
  const [driversStandings, setDriversStandings] = useState([]);
  const [constructorsStandings, setConstructorsStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [season, setSeason] = useState(new Date().getFullYear());
  
  // Race results state
  const [raceSchedule, setRaceSchedule] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [raceResults, setRaceResults] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsTab, setResultsTab] = useState("race"); // race, qualifying, practice, sprint

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

  const fetchStandings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [driversRes, constructorsRes, scheduleRes] = await Promise.all([
        fetch(`${JOLPICA_API}/current/driverstandings.json`),
        fetch(`${JOLPICA_API}/current/constructorstandings.json`),
        fetch(`${JOLPICA_API}/current.json`)
      ]);

      if (!driversRes.ok || !constructorsRes.ok) {
        throw new Error("API error");
      }

      const driversData = await driversRes.json();
      const constructorsData = await constructorsRes.json();
      const scheduleData = await scheduleRes.json();

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

      // Parse race schedule
      const races = scheduleData?.MRData?.RaceTable?.Races || [];
      setRaceSchedule(races);

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

  const fetchRaceResults = useCallback(async (race) => {
    setLoadingResults(true);
    setRaceResults(null);
    
    try {
      const round = race.round;
      const season = race.season;
      
      // Fetch race results, qualifying, and sprint in parallel from Jolpica
      const [raceRes, qualifyingRes, sprintRes] = await Promise.all([
        fetch(`${JOLPICA_API}/${season}/${round}/results.json`),
        fetch(`${JOLPICA_API}/${season}/${round}/qualifying.json`),
        fetch(`${JOLPICA_API}/${season}/${round}/sprint.json`).catch(() => null)
      ]);

      const raceData = raceRes.ok ? await raceRes.json() : null;
      const qualifyingData = qualifyingRes.ok ? await qualifyingRes.json() : null;
      const sprintData = sprintRes?.ok ? await sprintRes.json() : null;

      // Try to get practice sessions from OpenF1
      let practiceData = { fp1: [], fp2: [], fp3: [] };
      let fastestLap = null;
      let firstCornerLeader = null;
      let sprintFirstCornerLeader = null;
      
      try {
        // Find the meeting in OpenF1
        const meetingsRes = await fetch(`${OPENF1_API}/meetings?year=${season}`);
        if (meetingsRes.ok) {
          const meetings = await meetingsRes.json();
          // Find matching meeting by circuit or date
          const circuitName = race.Circuit?.circuitId?.toLowerCase() || "";
          const meeting = meetings.find(m => 
            m.circuit_short_name?.toLowerCase().includes(circuitName) ||
            m.meeting_name?.toLowerCase().includes(race.raceName?.toLowerCase().replace(" grand prix", ""))
          );
          
          if (meeting) {
            // Get sessions for this meeting
            const sessionsRes = await fetch(`${OPENF1_API}/sessions?meeting_key=${meeting.meeting_key}`);
            if (sessionsRes.ok) {
              const sessions = await sessionsRes.json();
              
              // Get practice sessions
              for (const session of sessions) {
                if (session.session_name?.includes("Practice")) {
                  const lapsRes = await fetch(`${OPENF1_API}/laps?session_key=${session.session_key}`);
                  if (lapsRes.ok) {
                    const laps = await lapsRes.json();
                    // Get best lap per driver
                    const bestLaps = {};
                    laps.forEach(lap => {
                      if (lap.lap_duration && (!bestLaps[lap.driver_number] || lap.lap_duration < bestLaps[lap.driver_number].lap_duration)) {
                        bestLaps[lap.driver_number] = lap;
                      }
                    });
                    const sortedLaps = Object.values(bestLaps).sort((a, b) => a.lap_duration - b.lap_duration);
                    
                    if (session.session_name === "Practice 1") practiceData.fp1 = sortedLaps;
                    else if (session.session_name === "Practice 2") practiceData.fp2 = sortedLaps;
                    else if (session.session_name === "Practice 3") practiceData.fp3 = sortedLaps;
                  }
                }
                
                // Get race positions for first corner leader
                if (session.session_name === "Race") {
                  const positionsRes = await fetch(`${OPENF1_API}/position?session_key=${session.session_key}`);
                  if (positionsRes.ok) {
                    const positions = await positionsRes.json();
                    // Find first position change after start (approximate first corner)
                    const firstPositions = positions.filter(p => p.position === 1).slice(0, 5);
                    if (firstPositions.length > 1) {
                      firstCornerLeader = firstPositions[1]?.driver_number || firstPositions[0]?.driver_number;
                    }
                  }
                }
                
                // Get sprint positions for first corner leader
                if (session.session_name === "Sprint") {
                  const positionsRes = await fetch(`${OPENF1_API}/position?session_key=${session.session_key}`);
                  if (positionsRes.ok) {
                    const positions = await positionsRes.json();
                    const firstPositions = positions.filter(p => p.position === 1).slice(0, 5);
                    if (firstPositions.length > 1) {
                      sprintFirstCornerLeader = firstPositions[1]?.driver_number || firstPositions[0]?.driver_number;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (openF1Error) {
        console.log("OpenF1 data not available:", openF1Error);
      }

      // Extract fastest lap from race results
      const raceResultsList = raceData?.MRData?.RaceTable?.Races?.[0]?.Results || [];
      const fastestLapResult = raceResultsList.find(r => r.FastestLap?.rank === "1");
      if (fastestLapResult) {
        fastestLap = {
          driver: fastestLapResult.Driver,
          constructor: fastestLapResult.Constructor,
          time: fastestLapResult.FastestLap?.Time?.time,
          lap: fastestLapResult.FastestLap?.lap
        };
      }

      setRaceResults({
        race: raceData?.MRData?.RaceTable?.Races?.[0]?.Results || [],
        qualifying: qualifyingData?.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [],
        sprint: sprintData?.MRData?.RaceTable?.Races?.[0]?.SprintResults || [],
        sprintQualifying: [], // Ergast doesn't have sprint qualifying
        practice: practiceData,
        fastestLap,
        firstCornerLeader,
        sprintFirstCornerLeader,
        hasSprint: race.Sprint !== undefined || (sprintData?.MRData?.RaceTable?.Races?.[0]?.SprintResults?.length > 0)
      });
      
    } catch (e) {
      console.error("Error fetching race results:", e);
      toast.error("Erreur lors du chargement des résultats");
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  useEffect(() => {
    if (selectedRace) {
      fetchRaceResults(selectedRace);
    }
  }, [selectedRace, fetchRaceResults]);

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

  const formatLapTime = (seconds) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
  };

  const isRaceCompleted = (race) => {
    const raceDate = new Date(race.date);
    return raceDate < new Date();
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

      {/* Main Tab Toggle */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg mb-4">
          <button
            onClick={() => setActiveTab("drivers")}
            className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "drivers" 
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            data-testid="tab-drivers"
          >
            <Trophy className="w-3.5 h-3.5" />
            Pilotes
          </button>
          <button
            onClick={() => setActiveTab("constructors")}
            className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "constructors" 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            data-testid="tab-constructors"
          >
            <Car className="w-3.5 h-3.5" />
            Écuries
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "results" 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            data-testid="tab-results"
          >
            <Calendar className="w-3.5 h-3.5" />
            Résultats
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
                
                // Map driverId to our driver data IDs
                const driverIdMap = {
                  "norris": "norris", "piastri": "piastri", "russell": "russell",
                  "leclerc": "leclerc", "hamilton": "hamilton", "verstappen": "verstappen",
                  "sainz": "sainz", "albon": "albon", "lawson": "lawson",
                  "alonso": "alonso", "stroll": "stroll", "ocon": "ocon",
                  "bearman": "bearman", "gasly": "gasly", "colapinto": "colapinto",
                  "hulkenberg": "hulkenberg", "bortoleto": "bortoleto", "perez": "perez",
                  "bottas": "bottas", "antonelli": "antonelli", "hadjar": "hadjar",
                  "lindblad": "lindblad", "max_verstappen": "verstappen",
                };
                const mappedDriverId = driverIdMap[driver.driverId] || driver.familyName?.toLowerCase();
                
                return (
                  <div 
                    key={driver.driverId}
                    onClick={() => navigate(`/driver/${mappedDriverId}`)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${getRankStyle(entry.position)}`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: teamColor }}
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
                          {driver.givenName} <span className="text-cyan-400">{driver.familyName?.toUpperCase()}</span>
                        </p>
                        <p className="font-body text-xs text-gray-500 truncate">
                          {constructor?.name || "Unknown Team"}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className={`font-data text-xl ${parseInt(entry.position) <= 3 ? 'text-yellow-400' : 'text-white'}`}>
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
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(entry.position)}
                      </div>
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: teamColor }}
                      >
                        <Car className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-base text-white">
                          {constructor?.name}
                        </p>
                        <p className="font-body text-xs text-gray-500">
                          {constructor?.nationality}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-data text-2xl ${parseInt(entry.position) <= 3 ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.points}
                        </p>
                        <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
                      </div>
                    </div>
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

        {/* Race Results Tab */}
        {activeTab === "results" && (
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
                            {new Date(race.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            {race.Sprint && <span className="ml-2 text-purple-400">Sprint</span>}
                          </p>
                        </div>
                      </div>
                      {completed ? (
                        <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-green-400' : 'text-gray-500'}`} />
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
                      <button
                        onClick={() => setResultsTab("race")}
                        className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all ${
                          resultsTab === "race" ? "bg-red-500 text-white" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        Course
                      </button>
                      <button
                        onClick={() => setResultsTab("qualifying")}
                        className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all ${
                          resultsTab === "qualifying" ? "bg-yellow-500 text-white" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        Qualifications
                      </button>
                      {raceResults.hasSprint && (
                        <>
                          <button
                            onClick={() => setResultsTab("sprint")}
                            className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all ${
                              resultsTab === "sprint" ? "bg-purple-500 text-white" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                            }`}
                          >
                            Sprint
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setResultsTab("practice")}
                        className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all ${
                          resultsTab === "practice" ? "bg-cyan-500 text-white" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        Essais
                      </button>
                      <button
                        onClick={() => setResultsTab("extras")}
                        className={`px-3 py-1.5 rounded-lg font-body text-xs transition-all ${
                          resultsTab === "extras" ? "bg-green-500 text-white" : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        Bonus
                      </button>
                    </div>

                    {/* Race Results */}
                    {resultsTab === "race" && (
                      <div className="space-y-2">
                        <h4 className="font-heading text-xs text-red-400 uppercase mb-2 flex items-center gap-2">
                          <Flag className="w-3 h-3" /> Classement Course
                        </h4>
                        {raceResults.race.length === 0 ? (
                          <p className="font-body text-sm text-gray-500 text-center py-4">Résultats non disponibles</p>
                        ) : (
                          raceResults.race.slice(0, 10).map((result, idx) => (
                            <div 
                              key={result.Driver.driverId}
                              className={`p-2 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
                              style={{ borderLeftWidth: '3px', borderLeftColor: getTeamColor(result.Constructor?.constructorId) }}
                            >
                              <span className="font-data text-sm w-6 text-center">{result.position}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-heading text-xs text-white truncate">
                                  {result.Driver.givenName} {result.Driver.familyName}
                                </p>
                              </div>
                              <span className="font-data text-xs text-cyan-400">{result.points} pts</span>
                              <span className="font-body text-xs text-gray-500">{result.Time?.time || result.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Qualifying Results */}
                    {resultsTab === "qualifying" && (
                      <div className="space-y-2">
                        <h4 className="font-heading text-xs text-yellow-400 uppercase mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Classement Qualifications
                        </h4>
                        {raceResults.qualifying.length === 0 ? (
                          <p className="font-body text-sm text-gray-500 text-center py-4">Résultats non disponibles</p>
                        ) : (
                          raceResults.qualifying.slice(0, 10).map((result, idx) => (
                            <div 
                              key={result.Driver.driverId}
                              className={`p-2 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
                              style={{ borderLeftWidth: '3px', borderLeftColor: getTeamColor(result.Constructor?.constructorId) }}
                            >
                              <span className="font-data text-sm w-6 text-center">{result.position}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-heading text-xs text-white truncate">
                                  {result.Driver.givenName} {result.Driver.familyName}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="font-data text-xs text-yellow-400">{result.Q3 || result.Q2 || result.Q1 || "-"}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Sprint Results */}
                    {resultsTab === "sprint" && raceResults.hasSprint && (
                      <div className="space-y-2">
                        <h4 className="font-heading text-xs text-purple-400 uppercase mb-2 flex items-center gap-2">
                          <Zap className="w-3 h-3" /> Classement Sprint
                        </h4>
                        {raceResults.sprint.length === 0 ? (
                          <p className="font-body text-sm text-gray-500 text-center py-4">Résultats non disponibles</p>
                        ) : (
                          raceResults.sprint.slice(0, 10).map((result, idx) => (
                            <div 
                              key={result.Driver.driverId}
                              className={`p-2 rounded-lg border flex items-center gap-2 ${getRankStyle(result.position)}`}
                              style={{ borderLeftWidth: '3px', borderLeftColor: getTeamColor(result.Constructor?.constructorId) }}
                            >
                              <span className="font-data text-sm w-6 text-center">{result.position}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-heading text-xs text-white truncate">
                                  {result.Driver.givenName} {result.Driver.familyName}
                                </p>
                              </div>
                              <span className="font-data text-xs text-purple-400">{result.points} pts</span>
                              <span className="font-body text-xs text-gray-500">{result.Time?.time || result.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Practice Results */}
                    {resultsTab === "practice" && (
                      <div className="space-y-4">
                        {["fp1", "fp2", "fp3"].map((session, sessionIdx) => {
                          const sessionData = raceResults.practice[session];
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
                                  {sessionData.slice(0, 5).map((lap, idx) => (
                                    <div 
                                      key={`${session}-${lap.driver_number}`}
                                      className="p-2 rounded-lg bg-gray-800/30 border border-gray-700/50 flex items-center gap-2"
                                    >
                                      <span className="font-data text-sm w-6 text-center text-gray-400">{idx + 1}</span>
                                      <span className="font-heading text-xs text-white">#{lap.driver_number}</span>
                                      <span className="flex-1" />
                                      <span className="font-data text-xs text-cyan-400">{formatLapTime(lap.lap_duration)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bonus Info (Fastest Lap, First Corner) */}
                    {resultsTab === "extras" && (
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
                                style={{ backgroundColor: getTeamColor(raceResults.fastestLap.constructor?.constructorId) }}
                              >
                                <Zap className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-heading text-sm text-white">
                                  {raceResults.fastestLap.driver?.givenName} {raceResults.fastestLap.driver?.familyName}
                                </p>
                                <p className="font-body text-xs text-gray-500">
                                  {raceResults.fastestLap.constructor?.name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-data text-lg text-purple-400">{raceResults.fastestLap.time}</p>
                                <p className="font-body text-[10px] text-gray-500">Tour {raceResults.fastestLap.lap}</p>
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
                                <span className="font-data text-lg text-green-400">#{raceResults.firstCornerLeader}</span>
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
                                  <span className="font-data text-lg text-orange-400">#{raceResults.sprintFirstCornerLeader}</span>
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
                    )}
                  </>
                ) : (
                  <p className="font-body text-sm text-gray-500 text-center py-4">
                    Sélectionnez un Grand Prix terminé pour voir les résultats
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* API Attribution */}
        <div className="mt-6 text-center">
          <p className="font-body text-[10px] text-gray-600">
            Données fournies par Jolpica F1 API & OpenF1
          </p>
        </div>
      </div>
    </div>
  );
}
