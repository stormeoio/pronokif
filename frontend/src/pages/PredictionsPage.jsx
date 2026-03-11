import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Clock, AlertCircle,
  Trophy, Medal
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
  
  // Current selection mode
  const [selectionMode, setSelectionMode] = useState("quali_pole"); // quali_pole, quali_top3, race_winner, race_top3

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
        // Auto-advance to next step
        if (!qualiTop3.length) {
          setSelectionMode("quali_top3");
        }
        break;
        
      case "quali_top3":
        if (qualiTop3.includes(driverId)) {
          setQualiTop3(qualiTop3.filter(d => d !== driverId));
        } else if (qualiTop3.length < 3) {
          const newTop3 = [...qualiTop3, driverId];
          setQualiTop3(newTop3);
          if (newTop3.length === 3 && !raceWinner) {
            setSelectionMode("race_winner");
          }
        }
        break;
        
      case "race_winner":
        setRaceWinner(driverId);
        if (!raceTop3.length) {
          setSelectionMode("race_top3");
        }
        break;
        
      case "race_top3":
        if (raceTop3.includes(driverId)) {
          setRaceTop3(raceTop3.filter(d => d !== driverId));
        } else if (raceTop3.length < 3) {
          setRaceTop3([...raceTop3, driverId]);
        }
        break;
    }
  };

  const isDriverSelected = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        return qualiPole === driverId;
      case "quali_top3":
        return qualiTop3.includes(driverId);
      case "race_winner":
        return raceWinner === driverId;
      case "race_top3":
        return raceTop3.includes(driverId);
      default:
        return false;
    }
  };

  const getDriverPosition = (driverId) => {
    if (selectionMode === "quali_top3") {
      const pos = qualiTop3.indexOf(driverId);
      return pos >= 0 ? pos + 1 : null;
    }
    if (selectionMode === "race_top3") {
      const pos = raceTop3.indexOf(driverId);
      return pos >= 0 ? pos + 1 : null;
    }
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
        race_top3: raceTop3
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
    { 
      key: "quali_pole", 
      label: "Pole Position", 
      sublabel: "Qualifications",
      icon: Flag, 
      done: !!qualiPole,
      count: qualiPole ? 1 : 0,
      max: 1
    },
    { 
      key: "quali_top3", 
      label: "Top 3 Qualif", 
      sublabel: "Dans l'ordre",
      icon: Medal, 
      done: qualiTop3.length === 3,
      count: qualiTop3.length,
      max: 3
    },
    { 
      key: "race_winner", 
      label: "Vainqueur", 
      sublabel: "Course",
      icon: Trophy, 
      done: !!raceWinner,
      count: raceWinner ? 1 : 0,
      max: 1
    },
    { 
      key: "race_top3", 
      label: "Top 3 Course", 
      sublabel: "Dans l'ordre",
      icon: Medal, 
      done: raceTop3.length === 3,
      count: raceTop3.length,
      max: 3
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-32 skeleton rounded-md" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-card border-white/10 max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="font-body text-zinc-300">Aucune course disponible</p>
            <Button
              onClick={() => navigate("/")}
              className="mt-4"
              variant="outline"
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="predictions-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-zinc-400 hover:text-white"
              data-testid="back-btn"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight italic text-white">
                {race.name}
              </h1>
              {isPredictionOpen && (
                <p className="font-body text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Clôture: {new Date(race.predictions_close_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Predictions closed warning */}
        {!isPredictionOpen && (
          <Card className="bg-amber-500/10 border-amber-500/20 mb-4">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="font-body text-amber-500 text-sm">
                Les pronostics sont fermés pour cette course
              </p>
            </CardContent>
          </Card>
        )}

        {/* Selection Steps */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {selectionSteps.map((step) => {
            const Icon = step.icon;
            const isActive = selectionMode === step.key;
            
            return (
              <button
                key={step.key}
                onClick={() => isPredictionOpen && setSelectionMode(step.key)}
                disabled={!isPredictionOpen}
                className={`p-3 rounded-sm border transition-all ${
                  isActive 
                    ? 'border-primary bg-primary/10 glow-red' 
                    : step.done 
                      ? 'border-emerald-500/30 bg-emerald-500/10' 
                      : 'border-zinc-800 bg-zinc-900/50'
                }`}
                data-testid={`step-${step.key}`}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1 ${
                  isActive ? 'text-primary' : step.done ? 'text-emerald-500' : 'text-zinc-500'
                }`} />
                <p className={`font-body text-[10px] uppercase tracking-wide ${
                  isActive ? 'text-white' : 'text-zinc-400'
                }`}>
                  {step.label}
                </p>
                <p className="font-data text-xs text-zinc-500 mt-1">
                  {step.count}/{step.max}
                </p>
              </button>
            );
          })}
        </div>

        {/* Current Selection Info */}
        <Card className="bg-card border-white/10 mb-4">
          <CardContent className="p-4">
            <p className="font-heading text-sm uppercase tracking-wide text-primary mb-1">
              {selectionSteps.find(s => s.key === selectionMode)?.sublabel}
            </p>
            <p className="font-body text-zinc-300">
              {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
              {selectionMode === "quali_top3" && `Sélectionne le Top 3 des qualifications (${qualiTop3.length}/3)`}
              {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
              {selectionMode === "race_top3" && `Sélectionne le Top 3 de la course (${raceTop3.length}/3)`}
            </p>
          </CardContent>
        </Card>

        {/* Drivers Grid */}
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
                className={`driver-card relative p-4 rounded-sm border-l-4 transition-all text-left ${
                  selected 
                    ? 'selected border-l-primary' 
                    : 'border-l-transparent bg-card border border-zinc-800 hover:border-zinc-700'
                }`}
                style={{ borderLeftColor: selected ? undefined : teamColor }}
                data-testid={`driver-${driver.id}`}
              >
                {/* Position badge */}
                {position && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-sm bg-primary flex items-center justify-center">
                    <span className="font-heading text-xs text-white">{position}</span>
                  </div>
                )}

                {/* Selected check */}
                {selected && !position && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-sm flex items-center justify-center font-heading text-lg"
                    style={{ backgroundColor: teamColor + '20', color: teamColor }}
                  >
                    {driver.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm uppercase tracking-tight text-white truncate">
                      {driver.name}
                    </p>
                    <p className="font-body text-xs text-zinc-500 truncate">
                      {driver.team}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      {isPredictionOpen && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || saving}
              className={`w-full h-14 font-heading uppercase tracking-wider transition-all duration-300 ${
                isComplete 
                  ? 'bg-primary hover:bg-red-600 glow-red' 
                  : 'bg-zinc-800 text-zinc-400'
              }`}
              data-testid="submit-predictions-btn"
            >
              <Check className="w-5 h-5 mr-2" />
              {saving ? "Enregistrement..." : existingPrediction ? "Mettre à jour" : "Valider mes pronostics"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
