import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Trophy, Shield, Calendar,
  AlertTriangle, Timer, Save, Loader2, Target, Users, X, Zap, RefreshCw
} from "lucide-react";

const TEAM_COLORS = {
  "Red Bull Racing": "#3671C6",
  "Ferrari": "#F91536",
  "McLaren": "#FF8000",
  "Mercedes": "#27F4D2",
  "Aston Martin": "#229971",
  "Alpine": "#0093CC",
  "Williams": "#64C4FF",
  "RB": "#6692FF",
  "Sauber": "#52E252",
  "Haas": "#B6BABD",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Results state - Now Top 10
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop10, setQualiTop10] = useState([]);
  const [sprintQualiTop10, setSprintQualiTop10] = useState([]);
  const [sprintRaceTop10, setSprintRaceTop10] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop10, setRaceTop10] = useState([]);
  
  // Bonus results
  const [safetyCar, setSafetyCar] = useState(false);
  const [dnfDrivers, setDnfDrivers] = useState([]);
  const [fastestLap, setFastestLap] = useState(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState(null);
  
  const [selectionMode, setSelectionMode] = useState("quali_pole");

  const fetchData = useCallback(async () => {
    try {
      const [racesRes, driversRes] = await Promise.all([
        apiClient.get("/admin/races"),
        apiClient.get("/drivers")
      ]);
      
      setRaces(racesRes.data);
      setDrivers(driversRes.data);
      setIsAdmin(true);
      
      // Select first race without results that is past
      const pastRaceWithoutResults = racesRes.data.find(r => r.is_past && !r.has_results);
      if (pastRaceWithoutResults) {
        await selectRace(pastRaceWithoutResults);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        setIsAdmin(false);
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectRace = async (race) => {
    setSelectedRace(race);
    resetForm();
    
    // Load existing results if any
    if (race.has_results) {
      try {
        const res = await apiClient.get(`/admin/results/${race.id}`);
        if (res.data?.results) {
          const r = res.data.results;
          setQualiPole(r.quali_pole);
          setQualiTop10(r.quali_top10 || []);
          setSprintQualiTop10(r.sprint_quali_top10 || []);
          setSprintRaceTop10(r.sprint_race_top10 || []);
          setRaceWinner(r.race_winner);
          setRaceTop10(r.race_top10 || []);
          setSafetyCar(r.bonus?.safety_car || false);
          setDnfDrivers(r.bonus?.dnf_drivers || []);
          setFastestLap(r.bonus?.fastest_lap || null);
          setFirstCornerLeader(r.bonus?.first_corner_leader || null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const resetForm = () => {
    setQualiPole(null);
    setQualiTop10([]);
    setSprintQualiTop10([]);
    setSprintRaceTop10([]);
    setRaceWinner(null);
    setRaceTop10([]);
    setSafetyCar(false);
    setDnfDrivers([]);
    setFastestLap(null);
    setFirstCornerLeader(null);
    setSelectionMode("quali_pole");
  };

  const handleDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        break;
      case "quali_top10":
        if (qualiTop10.includes(driverId)) {
          setQualiTop10(qualiTop10.filter(d => d !== driverId));
        } else if (qualiTop10.length < 10) {
          setQualiTop10([...qualiTop10, driverId]);
        }
        break;
      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId)) {
          setSprintQualiTop10(sprintQualiTop10.filter(d => d !== driverId));
        } else if (sprintQualiTop10.length < 10) {
          setSprintQualiTop10([...sprintQualiTop10, driverId]);
        }
        break;
      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId)) {
          setSprintRaceTop10(sprintRaceTop10.filter(d => d !== driverId));
        } else if (sprintRaceTop10.length < 10) {
          setSprintRaceTop10([...sprintRaceTop10, driverId]);
        }
        break;
      case "race_winner":
        setRaceWinner(driverId);
        break;
      case "race_top10":
        if (raceTop10.includes(driverId)) {
          setRaceTop10(raceTop10.filter(d => d !== driverId));
        } else if (raceTop10.length < 10) {
          setRaceTop10([...raceTop10, driverId]);
        }
        break;
      case "fastest_lap":
        setFastestLap(driverId === fastestLap ? null : driverId);
        break;
      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId);
        break;
      case "dnf_select":
        if (dnfDrivers.includes(driverId)) {
          setDnfDrivers(dnfDrivers.filter(d => d !== driverId));
        } else {
          setDnfDrivers([...dnfDrivers, driverId]);
        }
        break;
      default:
        break;
    }
  };

  const isDriverSelected = (driverId) => {
    switch (selectionMode) {
      case "quali_pole": return qualiPole === driverId;
      case "quali_top10": return qualiTop10.includes(driverId);
      case "sprint_quali_top10": return sprintQualiTop10.includes(driverId);
      case "sprint_race_top10": return sprintRaceTop10.includes(driverId);
      case "race_winner": return raceWinner === driverId;
      case "race_top10": return raceTop10.includes(driverId);
      case "fastest_lap": return fastestLap === driverId;
      case "first_corner": return firstCornerLeader === driverId;
      case "dnf_select": return dnfDrivers.includes(driverId);
      default: return false;
    }
  };

  const getDriverPosition = (driverId) => {
    if (selectionMode === "quali_top10") return qualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_quali_top10") return sprintQualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_race_top10") return sprintRaceTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "race_top10") return raceTop10.indexOf(driverId) + 1 || null;
    return null;
  };

  const isSprintComplete = !selectedRace?.is_sprint || (sprintQualiTop10.length === 10 && sprintRaceTop10.length === 10);
  const isComplete = qualiPole && qualiTop10.length === 10 && raceWinner && raceTop10.length === 10 && isSprintComplete;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error("Complete tous les résultats obligatoires");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        quali_pole: qualiPole,
        quali_top10: qualiTop10,
        race_winner: raceWinner,
        race_top10: raceTop10,
        safety_car: safetyCar,
        dnf_drivers: dnfDrivers,
        fastest_lap: fastestLap,
        first_corner_leader: firstCornerLeader
      };

      // Add sprint results if sprint weekend
      if (selectedRace.is_sprint) {
        payload.sprint_quali_top10 = sprintQualiTop10;
        payload.sprint_race_top10 = sprintRaceTop10;
      }

      await apiClient.post(`/admin/results/${selectedRace.id}`, payload);
      toast.success("Résultats enregistrés ! Les points ont été calculés.");
      
      // Refresh races
      const racesRes = await apiClient.get("/admin/races");
      setRaces(racesRes.data);
      
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncOpenF1 = async () => {
    if (!selectedRace) return;
    
    setSyncing(true);
    try {
      const res = await apiClient.post(`/admin/sync-results/${selectedRace.id}`);
      
      if (res.data.status === "success") {
        const fetched = res.data.fetched_data;
        if (fetched.race_winner) setRaceWinner(fetched.race_winner);
        if (fetched.race_top10?.length) setRaceTop10(fetched.race_top10);
        toast.success("Données récupérées depuis OpenF1 ! Vérifiez et complétez les champs manquants.");
      } else {
        toast.warning(res.data.message || "Données non disponibles, saisie manuelle requise.");
      }
    } catch (error) {
      toast.error("Erreur lors de la synchronisation avec OpenF1");
    } finally {
      setSyncing(false);
    }
  };

  // Selection steps
  const getSelectionSteps = () => {
    const steps = [
      { key: "quali_pole", label: "Pole", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
      { key: "quali_top10", label: "Top 10 Q", icon: Trophy, done: qualiTop10.length === 10, count: qualiTop10.length, max: 10 },
    ];

    if (selectedRace?.is_sprint) {
      steps.push(
        { key: "sprint_quali_top10", label: "Sprint Q", icon: Zap, done: sprintQualiTop10.length === 10, count: sprintQualiTop10.length, max: 10, isSprint: true },
        { key: "sprint_race_top10", label: "Sprint R", icon: Zap, done: sprintRaceTop10.length === 10, count: sprintRaceTop10.length, max: 10, isSprint: true }
      );
    }

    steps.push(
      { key: "race_winner", label: "Winner", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
      { key: "race_top10", label: "Top 10 R", icon: Trophy, done: raceTop10.length === 10, count: raceTop10.length, max: 10 },
      { key: "bonus", label: "Bonus", icon: Zap, done: true, count: 0, max: 0, isBonus: true }
    );

    return steps;
  };

  const selectionSteps = getSelectionSteps();
  const showBonus = ["bonus", "fastest_lap", "first_corner", "dnf_select"].includes(selectionMode);

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <Card className="game-card">
            <CardContent className="p-8 text-center">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="font-heading text-2xl uppercase text-white mb-2">Accès Refusé</h2>
              <p className="font-body text-gray-400 mb-6">
                Seuls les créateurs de ligue peuvent accéder à cette page.
              </p>
              <Button onClick={() => navigate("/")} className="btn-gaming">
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="admin-page" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-orange-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-orange-500 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Administration
              </h1>
              <p className="font-body text-xs text-gray-400">Entrer les résultats officiels</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Race Selector */}
        <Card className="game-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Sélectionner une course
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {races.filter(r => r.is_past).map((race) => (
                <Button
                  key={race.id}
                  variant={selectedRace?.id === race.id ? "default" : "outline"}
                  onClick={() => selectRace(race)}
                  className={`flex-shrink-0 text-xs ${
                    selectedRace?.id === race.id 
                      ? 'btn-gaming' 
                      : race.has_results 
                        ? 'border-green-500/50 text-green-400' 
                        : 'border-gray-700'
                  }`}
                >
                  {race.name.replace(" Grand Prix", "")}
                  {race.has_results && <Check className="w-3 h-3 ml-1" />}
                  {race.is_sprint && <Zap className="w-3 h-3 ml-1 text-purple-400" />}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedRace && (
          <>
            {/* Race Info */}
            <Card className="game-card mb-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-lg uppercase text-white flex items-center gap-2">
                      {selectedRace.name}
                      {selectedRace.is_sprint && (
                        <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-xs font-heading uppercase">
                          Sprint
                        </span>
                      )}
                    </h2>
                    <p className="font-body text-sm text-gray-400">{selectedRace.date}</p>
                    {selectedRace.has_results && (
                      <p className="font-body text-xs text-green-400 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Résultats déjà enregistrés (modification possible)
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
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span className="ml-1 text-xs">OpenF1</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selection Steps */}
            <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
              {selectionSteps.map((step) => {
                const Icon = step.icon;
                const isActive = selectionMode === step.key || (step.key === "bonus" && showBonus);
                
                return (
                  <button
                    key={step.key}
                    onClick={() => setSelectionMode(step.key)}
                    className={`flex-1 min-w-[55px] p-2 rounded-lg border-2 transition-all ${
                      isActive 
                        ? step.isBonus 
                          ? 'border-yellow-500 bg-yellow-500/20 glow-yellow' 
                          : step.isSprint
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-orange-500 bg-orange-500/20 glow-orange' 
                        : step.done && !step.isBonus
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-gray-700 bg-gray-900/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${
                      isActive ? step.isBonus ? 'text-yellow-500' : step.isSprint ? 'text-purple-500' : 'text-orange-500' : step.done && !step.isBonus ? 'text-green-500' : 'text-gray-500'
                    }`} />
                    <p className={`font-heading text-[8px] uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {!step.isBonus && (
                      <p className="font-data text-[9px] text-gray-500">{step.count}/{step.max}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bonus Options */}
            {selectionMode === "bonus" && (
              <div className="space-y-4 mb-6">
                <h3 className="font-heading text-lg uppercase text-yellow-500 flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Options Bonus
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Safety Car */}
                  <div className={`bonus-bet-card p-4 rounded-lg ${safetyCar ? 'selected' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <Label className="font-body text-white text-sm">Safety Car</Label>
                      </div>
                      <Switch checked={safetyCar} onCheckedChange={setSafetyCar} />
                    </div>
                  </div>

                  {/* DNF Drivers */}
                  <button
                    onClick={() => setSelectionMode("dnf_select")}
                    className={`bonus-bet-card p-4 rounded-lg text-left ${dnfDrivers.length > 0 ? 'selected' : ''}`}
                  >
                    <Users className={`w-5 h-5 mb-1 ${dnfDrivers.length > 0 ? 'text-yellow-500' : 'text-gray-500'}`} />
                    <p className="font-body text-sm text-white">DNF Pilotes</p>
                    <p className="font-data text-xs text-gray-400">{dnfDrivers.length} sélectionné(s)</p>
                  </button>
                </div>

                {/* Fastest Lap */}
                <div className="bonus-bet-card p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-purple-500" />
                      <span className="font-body text-white text-sm">Meilleur Tour</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectionMode("fastest_lap")}
                    className={`w-full ${fastestLap ? 'btn-gaming' : 'btn-gaming-blue'}`}
                  >
                    {fastestLap ? drivers.find(d => d.id === fastestLap)?.name : "Choisir un pilote"}
                  </Button>
                </div>

                {/* First Corner Leader */}
                <div className="bonus-bet-card p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-cyan-500" />
                      <span className="font-body text-white text-sm">Leader 1er Virage</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectionMode("first_corner")}
                    className={`w-full ${firstCornerLeader ? 'btn-gaming' : 'btn-gaming-blue'}`}
                  >
                    {firstCornerLeader ? drivers.find(d => d.id === firstCornerLeader)?.name : "Choisir un pilote"}
                  </Button>
                </div>
              </div>
            )}

            {/* DNF Selection Mode */}
            {selectionMode === "dnf_select" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-lg uppercase text-red-500 flex items-center gap-2">
                      <Users className="w-5 h-5" /> Pilotes DNF
                    </h3>
                    <p className="font-body text-xs text-gray-400">Sélectionne les pilotes qui ont abandonné</p>
                  </div>
                  <Button onClick={() => setSelectionMode("bonus")} variant="outline" size="sm" className="border-gray-600">
                    Retour
                  </Button>
                </div>
                
                {dnfDrivers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dnfDrivers.map(driverId => {
                      const driver = drivers.find(d => d.id === driverId);
                      return (
                        <div key={driverId} className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
                          <span className="font-body text-sm text-red-400">{driver?.name}</span>
                          <button onClick={() => setDnfDrivers(dnfDrivers.filter(d => d !== driverId))}>
                            <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selection Info */}
            {!showBonus && (
              <Card className="game-card mb-4">
                <CardContent className="p-4">
                  <p className="font-body text-gray-300">
                    {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
                    {selectionMode === "quali_top10" && `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
                    {selectionMode === "sprint_quali_top10" && `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
                    {selectionMode === "sprint_race_top10" && `Sélectionne le Top 10 de la course sprint (${sprintRaceTop10.length}/10)`}
                    {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
                    {selectionMode === "race_top10" && `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
                    {selectionMode === "fastest_lap" && "Sélectionne le pilote qui a fait le meilleur tour"}
                    {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Drivers Grid */}
            {!["bonus"].includes(selectionMode) && (
              <div className="grid grid-cols-2 gap-3">
                {drivers.map((driver) => {
                  const selected = isDriverSelected(driver.id);
                  const position = getDriverPosition(driver.id);
                  const teamColor = TEAM_COLORS[driver.team] || "#666";

                  return (
                    <button
                      key={driver.id}
                      onClick={() => handleDriverSelect(driver.id)}
                      className={`driver-card-gaming relative p-4 rounded-lg border-l-4 transition-all text-left ${selected ? 'selected' : ''}`}
                      style={{ borderLeftColor: teamColor }}
                    >
                      {position && (
                        <div className={`absolute top-2 right-2 w-7 h-7 rounded flex items-center justify-center border ${
                          position <= 3 
                            ? position === 1 ? 'position-1-gaming' : position === 2 ? 'position-2-gaming' : 'position-3-gaming'
                            : 'bg-gradient-to-b from-orange-500 to-orange-700 border-orange-400'
                        }`}>
                          <span className={`font-heading text-sm ${position <= 3 && position !== 3 ? 'text-black' : 'text-white'}`}>{position}</span>
                        </div>
                      )}
                      {selected && !position && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-b from-green-500 to-green-700 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-lg flex items-center justify-center font-heading text-lg border-2"
                          style={{ backgroundColor: teamColor + '30', borderColor: teamColor, color: teamColor }}
                        >
                          {driver.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-sm uppercase tracking-tight text-white truncate">
                            {driver.name}
                          </p>
                          <p className="font-body text-xs text-gray-500 truncate">{driver.team}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Submit Button */}
      {selectedRace && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || saving}
              className={`w-full h-14 font-heading uppercase tracking-wider transition-all ${
                isComplete ? 'btn-gaming' : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
              }`}
              data-testid="submit-results-btn"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enregistrement...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" />Enregistrer les résultats</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
