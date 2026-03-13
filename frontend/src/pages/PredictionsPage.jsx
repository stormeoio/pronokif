import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Clock, AlertCircle,
  Trophy, Medal, Zap, AlertTriangle, Timer
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
  
  // Prediction state
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop3, setQualiTop3] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop3, setRaceTop3] = useState([]);
  
  // Bonus bets state
  const [safetyCar, setSafetyCar] = useState(false);
  const [willHaveDNF, setWillHaveDNF] = useState(false);
  const [fastestLapDriver, setFastestLapDriver] = useState(null);
  
  // Current selection mode
  const [selectionMode, setSelectionMode] = useState("quali_pole");

  useEffect(() => {
    fetchData();
  }, [raceId]);

  const fetchData = async () => {
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
          setQualiTop3(predRes.data.quali_top3);
          setRaceWinner(predRes.data.race_winner);
          setRaceTop3(predRes.data.race_top3);
          // Load bonus bets if they exist
          if (predRes.data.bonus_bets) {
            setSafetyCar(predRes.data.bonus_bets.safety_car || false);
            setWillHaveDNF(predRes.data.bonus_bets.will_have_dnf || false);
            setFastestLapDriver(predRes.data.bonus_bets.fastest_lap_driver || null);
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
  };

  const handleDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        if (!qualiTop3.length) setSelectionMode("quali_top3");
        break;
        
      case "quali_top3":
        if (qualiTop3.includes(driverId)) {
          setQualiTop3(qualiTop3.filter(d => d !== driverId));
        } else if (qualiTop3.length < 3) {
          const newTop3 = [...qualiTop3, driverId];
          setQualiTop3(newTop3);
          if (newTop3.length === 3 && !raceWinner) setSelectionMode("race_winner");
        }
        break;
        
      case "race_winner":
        setRaceWinner(driverId);
        if (!raceTop3.length) setSelectionMode("race_top3");
        break;
        
      case "race_top3":
        if (raceTop3.includes(driverId)) {
          setRaceTop3(raceTop3.filter(d => d !== driverId));
        } else if (raceTop3.length < 3) {
          const newTop3 = [...raceTop3, driverId];
          setRaceTop3(newTop3);
          if (newTop3.length === 3) setSelectionMode("bonus");
        }
        break;
        
      case "fastest_lap":
        setFastestLapDriver(driverId === fastestLapDriver ? null : driverId);
        break;
    }
  };

  const isDriverSelected = (driverId) => {
    switch (selectionMode) {
      case "quali_pole": return qualiPole === driverId;
      case "quali_top3": return qualiTop3.includes(driverId);
      case "race_winner": return raceWinner === driverId;
      case "race_top3": return raceTop3.includes(driverId);
      case "fastest_lap": return fastestLapDriver === driverId;
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
      toast.error("Complete tous les pronostics");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/predictions", {
        race_id: race.id,
        quali_pole: qualiPole,
        quali_top3: qualiTop3,
        race_winner: raceWinner,
        race_top3: raceTop3,
        bonus_bets: {
          safety_car: safetyCar,
          will_have_dnf: willHaveDNF,
          fastest_lap_driver: fastestLapDriver
        }
      });

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

  const selectionSteps = [
    { key: "quali_pole", label: "Pole", sublabel: "Qualif", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
    { key: "quali_top3", label: "Top 3", sublabel: "Qualif", icon: Medal, done: qualiTop3.length === 3, count: qualiTop3.length, max: 3 },
    { key: "race_winner", label: "Winner", sublabel: "Course", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
    { key: "race_top3", label: "Top 3", sublabel: "Course", icon: Medal, done: raceTop3.length === 3, count: raceTop3.length, max: 3 },
    { key: "bonus", label: "Bonus", sublabel: "Paris", icon: Zap, done: true, count: 0, max: 0, isBonus: true },
  ];

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

  const showBonus = selectionMode === "bonus" || selectionMode === "fastest_lap";

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
              {isPredictionOpen && (
                <p className="font-body text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-500" />
                  Clôture: {new Date(race.predictions_close_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
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
            const isActive = selectionMode === step.key || (step.key === "bonus" && (selectionMode === "bonus" || selectionMode === "fastest_lap"));
            
            return (
              <button
                key={step.key}
                onClick={() => isPredictionOpen && setSelectionMode(step.key)}
                disabled={!isPredictionOpen}
                className={`flex-1 min-w-[70px] p-2 rounded-lg border-2 transition-all ${
                  isActive 
                    ? step.isBonus 
                      ? 'border-yellow-500 bg-yellow-500/20 glow-yellow' 
                      : 'border-orange-500 bg-orange-500/20 glow-orange' 
                    : step.done 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : 'border-gray-700 bg-gray-900/50'
                }`}
                data-testid={`step-${step.key}`}
              >
                <Icon className={`w-4 h-4 mx-auto mb-1 ${
                  isActive ? step.isBonus ? 'text-yellow-500' : 'text-orange-500' : step.done ? 'text-green-500' : 'text-gray-500'
                }`} />
                <p className={`font-heading text-[9px] uppercase tracking-wide ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {!step.isBonus && (
                  <p className="font-data text-[10px] text-gray-500">{step.count}/{step.max}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Bonus Bets Section */}
        {showBonus && (
          <div className="space-y-4 mb-6">
            <h3 className="font-heading text-lg uppercase tracking-tight text-yellow-500 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Paris Bonus (+points)
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Safety Car */}
              <button
                onClick={() => setSafetyCar(!safetyCar)}
                className={`bonus-bet-card p-4 rounded-lg text-left transition-all ${safetyCar ? 'selected' : ''}`}
              >
                <AlertTriangle className={`w-6 h-6 mb-2 ${safetyCar ? 'text-yellow-500' : 'text-gray-500'}`} />
                <p className="font-heading text-sm uppercase text-white">Safety Car</p>
                <p className="font-body text-xs text-gray-400">Y aura-t-il un SC ?</p>
                <p className="font-data text-xs text-yellow-500 mt-1">+3 pts si correct</p>
              </button>

              {/* DNF */}
              <button
                onClick={() => setWillHaveDNF(!willHaveDNF)}
                className={`bonus-bet-card p-4 rounded-lg text-left transition-all ${willHaveDNF ? 'selected' : ''}`}
              >
                <AlertCircle className={`w-6 h-6 mb-2 ${willHaveDNF ? 'text-yellow-500' : 'text-gray-500'}`} />
                <p className="font-heading text-sm uppercase text-white">Abandon (DNF)</p>
                <p className="font-body text-xs text-gray-400">Y aura-t-il un DNF ?</p>
                <p className="font-data text-xs text-yellow-500 mt-1">+2 pts si correct</p>
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
                onClick={() => setSelectionMode(selectionMode === "fastest_lap" ? "bonus" : "fastest_lap")}
                className={`w-full ${selectionMode === "fastest_lap" ? 'btn-gaming' : 'btn-gaming-blue'}`}
              >
                {fastestLapDriver ? `Sélectionné: ${drivers.find(d => d.id === fastestLapDriver)?.name}` : "Choisir un pilote"}
              </Button>
            </div>
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
                {selectionMode === "quali_top3" && `Sélectionne le Top 3 des qualifications (${qualiTop3.length}/3)`}
                {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
                {selectionMode === "race_top3" && `Sélectionne le Top 3 de la course (${raceTop3.length}/3)`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Drivers Grid */}
        {(selectionMode !== "bonus" || selectionMode === "fastest_lap") && (
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
