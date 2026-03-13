import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Trophy, Shield, Calendar,
  AlertTriangle, AlertCircle, Timer, Save, Loader2
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
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Results state
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop3, setQualiTop3] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop3, setRaceTop3] = useState([]);
  const [safetyCar, setSafetyCar] = useState(false);
  const [hasDNF, setHasDNF] = useState(false);
  const [fastestLap, setFastestLap] = useState(null);
  
  const [selectionMode, setSelectionMode] = useState("quali_pole");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
        selectRace(pastRaceWithoutResults);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        setIsAdmin(false);
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
          setQualiTop3(r.quali_top3 || []);
          setRaceWinner(r.race_winner);
          setRaceTop3(r.race_top3 || []);
          setSafetyCar(r.bonus?.safety_car || false);
          setHasDNF(r.bonus?.has_dnf || false);
          setFastestLap(r.bonus?.fastest_lap || null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const resetForm = () => {
    setQualiPole(null);
    setQualiTop3([]);
    setRaceWinner(null);
    setRaceTop3([]);
    setSafetyCar(false);
    setHasDNF(false);
    setFastestLap(null);
    setSelectionMode("quali_pole");
  };

  const handleDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        break;
      case "quali_top3":
        if (qualiTop3.includes(driverId)) {
          setQualiTop3(qualiTop3.filter(d => d !== driverId));
        } else if (qualiTop3.length < 3) {
          setQualiTop3([...qualiTop3, driverId]);
        }
        break;
      case "race_winner":
        setRaceWinner(driverId);
        break;
      case "race_top3":
        if (raceTop3.includes(driverId)) {
          setRaceTop3(raceTop3.filter(d => d !== driverId));
        } else if (raceTop3.length < 3) {
          setRaceTop3([...raceTop3, driverId]);
        }
        break;
      case "fastest_lap":
        setFastestLap(driverId === fastestLap ? null : driverId);
        break;
    }
  };

  const isDriverSelected = (driverId) => {
    switch (selectionMode) {
      case "quali_pole": return qualiPole === driverId;
      case "quali_top3": return qualiTop3.includes(driverId);
      case "race_winner": return raceWinner === driverId;
      case "race_top3": return raceTop3.includes(driverId);
      case "fastest_lap": return fastestLap === driverId;
      default: return false;
    }
  };

  const getDriverPosition = (driverId) => {
    if (selectionMode === "quali_top3") return qualiTop3.indexOf(driverId) + 1 || null;
    if (selectionMode === "race_top3") return raceTop3.indexOf(driverId) + 1 || null;
    return null;
  };

  const isComplete = qualiPole && qualiTop3.length === 3 && raceWinner && raceTop3.length === 3;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error("Complete tous les résultats obligatoires");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post(`/admin/results/${selectedRace.id}`, {
        quali_pole: qualiPole,
        quali_top3: qualiTop3,
        race_winner: raceWinner,
        race_top3: raceTop3,
        safety_car: safetyCar,
        has_dnf: hasDNF,
        fastest_lap: fastestLap
      });

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

  const selectionSteps = [
    { key: "quali_pole", label: "Pole", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
    { key: "quali_top3", label: "Top 3 Q", icon: Trophy, done: qualiTop3.length === 3, count: qualiTop3.length, max: 3 },
    { key: "race_winner", label: "Winner", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
    { key: "race_top3", label: "Top 3 R", icon: Trophy, done: raceTop3.length === 3, count: raceTop3.length, max: 3 },
    { key: "fastest_lap", label: "FL", icon: Timer, done: true, count: fastestLap ? 1 : 0, max: 1, optional: true },
  ];

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
                <h2 className="font-heading text-lg uppercase text-white">{selectedRace.name}</h2>
                <p className="font-body text-sm text-gray-400">{selectedRace.date}</p>
                {selectedRace.has_results && (
                  <p className="font-body text-xs text-green-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Résultats déjà enregistrés (modification possible)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Selection Steps */}
            <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
              {selectionSteps.map((step) => {
                const Icon = step.icon;
                const isActive = selectionMode === step.key;
                
                return (
                  <button
                    key={step.key}
                    onClick={() => setSelectionMode(step.key)}
                    className={`flex-1 min-w-[60px] p-2 rounded-lg border-2 transition-all ${
                      isActive 
                        ? 'border-orange-500 bg-orange-500/20 glow-orange' 
                        : step.done && !step.optional
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-gray-700 bg-gray-900/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${
                      isActive ? 'text-orange-500' : step.done && !step.optional ? 'text-green-500' : 'text-gray-500'
                    }`} />
                    <p className={`font-heading text-[9px] uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    <p className="font-data text-[10px] text-gray-500">{step.count}/{step.max}</p>
                  </button>
                );
              })}
            </div>

            {/* Bonus Options */}
            {selectionMode === "fastest_lap" && (
              <Card className="game-card mb-4">
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-heading text-sm uppercase text-yellow-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Options Bonus
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <Label className="font-body text-white">Safety Car pendant la course</Label>
                    </div>
                    <Switch checked={safetyCar} onCheckedChange={setSafetyCar} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <Label className="font-body text-white">Au moins un abandon (DNF)</Label>
                    </div>
                    <Switch checked={hasDNF} onCheckedChange={setHasDNF} />
                  </div>
                  
                  <div>
                    <p className="font-body text-sm text-gray-400 mb-2 flex items-center gap-1">
                      <Timer className="w-4 h-4 text-purple-500" />
                      Meilleur tour: {fastestLap ? drivers.find(d => d.id === fastestLap)?.name : "Non sélectionné"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Drivers Grid */}
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
                      <div className="absolute top-2 right-2 w-7 h-7 rounded bg-gradient-to-b from-orange-500 to-orange-700 flex items-center justify-center border border-orange-400">
                        <span className="font-heading text-sm text-white">{position}</span>
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
