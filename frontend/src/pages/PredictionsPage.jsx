import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Clock, AlertCircle,
  Trophy, Medal, Zap, AlertTriangle, Timer, Target, Users, X
} from "lucide-react";

// Team colors mapping
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

export default function PredictionsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [race, setRace] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPrediction, setExistingPrediction] = useState(null);
  
  // Main predictions state - Now Top 10
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop10, setQualiTop10] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop10, setRaceTop10] = useState([]);
  
  // Sprint predictions (for sprint weekends)
  const [sprintQualiTop10, setSprintQualiTop10] = useState([]);
  const [sprintRaceTop10, setSprintRaceTop10] = useState([]);
  
  // Bonus bets state
  const [safetyCar, setSafetyCar] = useState(false);
  const [dnfDrivers, setDnfDrivers] = useState([]); // Changed from boolean to array
  const [fastestLapDriver, setFastestLapDriver] = useState(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState(null); // NEW
  
  // Current selection mode
  const [selectionMode, setSelectionMode] = useState("quali_pole");

  const fetchData = useCallback(async () => {
    try {
      const [raceRes, driversRes] = await Promise.all([
        raceId ? apiClient.get(`/races/${raceId}`) : apiClient.get("/races/next"),
        apiClient.get("/drivers")
      ]);

      setRace(raceRes.data);
      setDrivers(driversRes.data);

      // Fetch existing prediction
      try {
        const predRes = await apiClient.get(`/predictions/race/${raceRes.data.id}`);
        if (predRes.data) {
          setExistingPrediction(predRes.data);
          setQualiPole(predRes.data.quali_pole);
          setQualiTop10(predRes.data.quali_top10 || []);
          setRaceWinner(predRes.data.race_winner);
          setRaceTop10(predRes.data.race_top10 || []);
          // Sprint predictions
          setSprintQualiTop10(predRes.data.sprint_quali_top10 || []);
          setSprintRaceTop10(predRes.data.sprint_race_top10 || []);
          // Bonus bets
          if (predRes.data.bonus_bets) {
            setSafetyCar(predRes.data.bonus_bets.safety_car || false);
            setDnfDrivers(predRes.data.bonus_bets.dnf_drivers || []);
            setFastestLapDriver(predRes.data.bonus_bets.fastest_lap_driver || null);
            setFirstCornerLeader(predRes.data.bonus_bets.first_corner_leader || null);
          }
        }
      } catch {
        // No existing prediction
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        if (qualiTop10.length < 10) setSelectionMode("quali_top10");
        break;
        
      case "quali_top10":
        if (qualiTop10.includes(driverId)) {
          setQualiTop10(qualiTop10.filter(d => d !== driverId));
        } else if (qualiTop10.length < 10) {
          const newTop10 = [...qualiTop10, driverId];
          setQualiTop10(newTop10);
          if (newTop10.length === 10) {
            if (race?.is_sprint_weekend && sprintQualiTop10.length < 10) {
              setSelectionMode("sprint_quali_top10");
            } else if (!raceWinner) {
              setSelectionMode("race_winner");
            }
          }
        }
        break;

      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId)) {
          setSprintQualiTop10(sprintQualiTop10.filter(d => d !== driverId));
        } else if (sprintQualiTop10.length < 10) {
          const newTop10 = [...sprintQualiTop10, driverId];
          setSprintQualiTop10(newTop10);
          if (newTop10.length === 10 && sprintRaceTop10.length < 10) {
            setSelectionMode("sprint_race_top10");
          }
        }
        break;

      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId)) {
          setSprintRaceTop10(sprintRaceTop10.filter(d => d !== driverId));
        } else if (sprintRaceTop10.length < 10) {
          const newTop10 = [...sprintRaceTop10, driverId];
          setSprintRaceTop10(newTop10);
          if (newTop10.length === 10 && !raceWinner) {
            setSelectionMode("race_winner");
          }
        }
        break;
        
      case "race_winner":
        setRaceWinner(driverId);
        if (raceTop10.length < 10) setSelectionMode("race_top10");
        break;
        
      case "race_top10":
        if (raceTop10.includes(driverId)) {
          setRaceTop10(raceTop10.filter(d => d !== driverId));
        } else if (raceTop10.length < 10) {
          const newTop10 = [...raceTop10, driverId];
          setRaceTop10(newTop10);
          if (newTop10.length === 10) setSelectionMode("bonus");
        }
        break;
        
      case "fastest_lap":
        setFastestLapDriver(driverId === fastestLapDriver ? null : driverId);
        break;

      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId);
        break;

      case "dnf_select":
        if (dnfDrivers.includes(driverId)) {
          setDnfDrivers(dnfDrivers.filter(d => d !== driverId));
        } else if (dnfDrivers.length < 5) { // Max 5 DNF predictions
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
      case "fastest_lap": return fastestLapDriver === driverId;
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

  // Check if all required predictions are complete
  const isSprintComplete = !race?.is_sprint_weekend || (sprintQualiTop10.length === 10 && sprintRaceTop10.length === 10);
  const isComplete = qualiPole && qualiTop10.length === 10 && raceWinner && raceTop10.length === 10 && isSprintComplete;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error("Complete tous les pronostics obligatoires");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        race_id: race.id,
        quali_pole: qualiPole,
        quali_top10: qualiTop10,
        race_winner: raceWinner,
        race_top10: raceTop10,
        bonus_bets: {
          safety_car: safetyCar,
          dnf_drivers: dnfDrivers,
          fastest_lap_driver: fastestLapDriver,
          first_corner_leader: firstCornerLeader
        }
      };

      // Add sprint predictions if it's a sprint weekend
      if (race.is_sprint_weekend) {
        payload.sprint_quali_top10 = sprintQualiTop10;
        payload.sprint_race_top10 = sprintRaceTop10;
      }

      await apiClient.post("/predictions", payload);
      toast.success("Pronostics enregistrés !");
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isPredictionOpen = race?.status === "upcoming";

  // Define all selection steps
  const getSelectionSteps = () => {
    const steps = [
      { key: "quali_pole", label: "Pole", sublabel: "Qualif", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
      { key: "quali_top10", label: "Top 10", sublabel: "Qualif", icon: Medal, done: qualiTop10.length === 10, count: qualiTop10.length, max: 10 },
    ];

    // Add sprint steps if it's a sprint weekend
    if (race?.is_sprint_weekend) {
      steps.push(
        { key: "sprint_quali_top10", label: "Sprint Q", sublabel: "Sprint", icon: Zap, done: sprintQualiTop10.length === 10, count: sprintQualiTop10.length, max: 10, isSprint: true },
        { key: "sprint_race_top10", label: "Sprint R", sublabel: "Sprint", icon: Zap, done: sprintRaceTop10.length === 10, count: sprintRaceTop10.length, max: 10, isSprint: true }
      );
    }

    steps.push(
      { key: "race_winner", label: "Winner", sublabel: "Course", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
      { key: "race_top10", label: "Top 10", sublabel: "Course", icon: Medal, done: raceTop10.length === 10, count: raceTop10.length, max: 10 },
      { key: "bonus", label: "Bonus", sublabel: "Paris", icon: Zap, done: true, count: 0, max: 0, isBonus: true }
    );

    return steps;
  };

  const selectionSteps = getSelectionSteps();

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-gaming rounded" />
          <div className="h-32 skeleton-gaming rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(10)].map((_, i) => <div key={i} className="h-20 skeleton-gaming rounded-md" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <Card className="game-card max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="font-body text-gray-300">Aucune course disponible</p>
            <Button onClick={() => navigate("/")} className="mt-4 btn-gaming-blue">Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showBonus = selectionMode === "bonus" || selectionMode === "fastest_lap" || selectionMode === "first_corner" || selectionMode === "dnf_select";
  const showDriverGrid = !["bonus"].includes(selectionMode);

  return (
    <div className="min-h-screen" data-testid="predictions-page" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-orange-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white" data-testid="back-btn">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-orange-500">
                {race.name.replace(" Grand Prix", "")}
              </h1>
              <div className="flex items-center gap-2">
                {isPredictionOpen && (
                  <p className="font-body text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-500" />
                    Clôture: {new Date(race.predictions_close_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {race.is_sprint_weekend && (
                  <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-xs font-heading uppercase">
                    Sprint Weekend
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Predictions closed warning */}
        {!isPredictionOpen && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 mb-4">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <p className="font-body text-yellow-500 text-sm">Les pronostics sont fermés</p>
            </CardContent>
          </Card>
        )}

        {/* Selection Steps */}
        <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
          {selectionSteps.map((step) => {
            const Icon = step.icon;
            const isActive = selectionMode === step.key || (step.key === "bonus" && ["bonus", "fastest_lap", "first_corner", "dnf_select"].includes(selectionMode));
            
            return (
              <button
                key={step.key}
                onClick={() => isPredictionOpen && setSelectionMode(step.key)}
                disabled={!isPredictionOpen}
                className={`flex-1 min-w-[60px] p-2 rounded-lg border-2 transition-all ${
                  isActive 
                    ? step.isBonus 
                      ? 'border-yellow-500 bg-yellow-500/20 glow-yellow' 
                      : step.isSprint
                        ? 'border-purple-500 bg-purple-500/20 glow-purple'
                        : 'border-orange-500 bg-orange-500/20 glow-orange' 
                    : step.done 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-gray-700 bg-gray-900/50'
                }`}
                data-testid={`step-${step.key}`}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1 ${
                  isActive ? step.isBonus ? 'text-yellow-500' : step.isSprint ? 'text-purple-500' : 'text-orange-500' : step.done ? 'text-green-500' : 'text-gray-500'
                }`} />
                <p className={`font-heading text-[8px] uppercase tracking-wide ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {!step.isBonus && (
                  <p className="font-data text-[9px] text-gray-500">{step.count}/{step.max}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Bonus Bets Section */}
        {selectionMode === "bonus" && (
          <div className="space-y-4 mb-6">
            <h3 className="font-heading text-lg uppercase tracking-tight text-yellow-500 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Paris Bonus (+points)
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Safety Car */}
              <button
                onClick={() => isPredictionOpen && setSafetyCar(!safetyCar)}
                disabled={!isPredictionOpen}
                className={`bonus-bet-card p-4 rounded-lg text-left transition-all ${safetyCar ? 'selected' : ''}`}
                data-testid="safety-car-toggle"
              >
                <AlertTriangle className={`w-6 h-6 mb-2 ${safetyCar ? 'text-yellow-500' : 'text-gray-500'}`} />
                <p className="font-heading text-sm uppercase text-white">Safety Car</p>
                <p className="font-body text-xs text-gray-400">Y aura-t-il un SC ?</p>
                <p className="font-data text-xs text-yellow-500 mt-1">+3 pts si correct</p>
              </button>

              {/* DNF Drivers */}
              <button
                onClick={() => isPredictionOpen && setSelectionMode("dnf_select")}
                disabled={!isPredictionOpen}
                className={`bonus-bet-card p-4 rounded-lg text-left transition-all ${dnfDrivers.length > 0 ? 'selected' : ''}`}
                data-testid="dnf-select-btn"
              >
                <Users className={`w-6 h-6 mb-2 ${dnfDrivers.length > 0 ? 'text-yellow-500' : 'text-gray-500'}`} />
                <p className="font-heading text-sm uppercase text-white">DNF Pilotes</p>
                <p className="font-body text-xs text-gray-400">{dnfDrivers.length > 0 ? `${dnfDrivers.length} sélectionné(s)` : 'Qui abandonnera ?'}</p>
                <p className="font-data text-xs text-yellow-500 mt-1">+2 pts par pilote correct</p>
              </button>
            </div>

            {/* Fastest Lap */}
            <div className="bonus-bet-card p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-heading text-sm uppercase text-white">Meilleur Tour</p>
                    <p className="font-body text-xs text-gray-400">Qui fera le fastest lap ?</p>
                  </div>
                </div>
                <p className="font-data text-xs text-yellow-500">+5 pts si correct</p>
              </div>
              <Button
                onClick={() => isPredictionOpen && setSelectionMode("fastest_lap")}
                disabled={!isPredictionOpen}
                className={`w-full ${fastestLapDriver ? 'btn-gaming' : 'btn-gaming-blue'}`}
                data-testid="fastest-lap-btn"
              >
                {fastestLapDriver ? `${drivers.find(d => d.id === fastestLapDriver)?.name}` : "Choisir un pilote"}
              </Button>
            </div>

            {/* First Corner Leader - NEW */}
            <div className="bonus-bet-card p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-500" />
                  <div>
                    <p className="font-heading text-sm uppercase text-white">Leader 1er Virage</p>
                    <p className="font-body text-xs text-gray-400">Qui sera en tête au T1 ?</p>
                  </div>
                </div>
                <p className="font-data text-xs text-yellow-500">+3 pts si correct</p>
              </div>
              <Button
                onClick={() => isPredictionOpen && setSelectionMode("first_corner")}
                disabled={!isPredictionOpen}
                className={`w-full ${firstCornerLeader ? 'btn-gaming' : 'btn-gaming-blue'}`}
                data-testid="first-corner-btn"
              >
                {firstCornerLeader ? `${drivers.find(d => d.id === firstCornerLeader)?.name}` : "Choisir un pilote"}
              </Button>
            </div>
          </div>
        )}

        {/* DNF Selection Mode */}
        {selectionMode === "dnf_select" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-lg uppercase tracking-tight text-yellow-500 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Pilotes DNF
                </h3>
                <p className="font-body text-xs text-gray-400">Sélectionne jusqu'à 5 pilotes qui abandonneront</p>
              </div>
              <Button
                onClick={() => setSelectionMode("bonus")}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                Retour
              </Button>
            </div>
            
            {/* Selected DNF drivers */}
            {dnfDrivers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {dnfDrivers.map(driverId => {
                  const driver = drivers.find(d => d.id === driverId);
                  return (
                    <div 
                      key={driverId}
                      className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full"
                    >
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

        {/* Current Selection Info */}
        {!showBonus && (
          <Card className="game-card mb-4">
            <CardContent className="p-4">
              <p className="font-heading text-sm uppercase tracking-wide text-cyan-400 mb-1">
                {selectionSteps.find(s => s.key === selectionMode)?.sublabel}
              </p>
              <p className="font-body text-gray-300">
                {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
                {selectionMode === "quali_top10" && `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
                {selectionMode === "sprint_quali_top10" && `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
                {selectionMode === "sprint_race_top10" && `Sélectionne le Top 10 de la course sprint (${sprintRaceTop10.length}/10)`}
                {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
                {selectionMode === "race_top10" && `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
                {selectionMode === "fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour"}
                {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
                {selectionMode === "dnf_select" && `Sélectionne les pilotes qui abandonneront (${dnfDrivers.length}/5)`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Drivers Grid */}
        {showDriverGrid && (
          <div className="grid grid-cols-2 gap-3">
            {drivers.map((driver) => {
              const selected = isDriverSelected(driver.id);
              const position = getDriverPosition(driver.id);
              const teamColor = TEAM_COLORS[driver.team] || "#666";

              return (
                <button
                  key={driver.id}
                  onClick={() => isPredictionOpen && handleDriverSelect(driver.id)}
                  disabled={!isPredictionOpen}
                  className={`driver-card-gaming relative p-4 rounded-lg border-l-4 transition-all text-left ${selected ? 'selected' : ''}`}
                  style={{ borderLeftColor: teamColor }}
                  data-testid={`driver-${driver.id}`}
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
      </div>

      {/* Submit Button */}
      {isPredictionOpen && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || saving}
              className={`w-full h-14 font-heading uppercase tracking-wider transition-all ${
                isComplete ? 'btn-gaming' : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
              }`}
              data-testid="submit-predictions-btn"
            >
              <Check className="w-5 h-5 mr-2" />
              {saving ? "Enregistrement..." : existingPrediction ? "Mettre à jour" : "Valider mes pronos"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
