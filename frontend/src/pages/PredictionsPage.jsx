import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Clock, AlertCircle,
  Trophy, Medal, Zap, AlertTriangle, Timer, Target, Users, X, Gamepad2, Trash2
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
  
  // Tab for sprint weekends: "sprint" or "main"
  const [activeTab, setActiveTab] = useState("sprint");
  
  // Sprint predictions
  const [sprintQualiPole, setSprintQualiPole] = useState(null);
  const [sprintQualiTop10, setSprintQualiTop10] = useState([]);
  const [sprintRaceWinner, setSprintRaceWinner] = useState(null);
  const [sprintRaceTop10, setSprintRaceTop10] = useState([]);
  const [sprintSafetyCar, setSprintSafetyCar] = useState(null); // null = not selected, true/false = selected
  const [sprintDnfDrivers, setSprintDnfDrivers] = useState([]);
  const [sprintNoDnf, setSprintNoDnf] = useState(false);
  const [sprintFastestLap, setSprintFastestLap] = useState(null);
  const [sprintFirstCorner, setSprintFirstCorner] = useState(null);
  
  // Main race predictions
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop10, setQualiTop10] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop10, setRaceTop10] = useState([]);
  const [safetyCar, setSafetyCar] = useState(null); // null = not selected, true/false = selected
  const [dnfDrivers, setDnfDrivers] = useState([]);
  const [noDnf, setNoDnf] = useState(false);
  const [fastestLapDriver, setFastestLapDriver] = useState(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState(null);
  
  // Current selection mode
  const [selectionMode, setSelectionMode] = useState("quali_pole");
  
  // Mini-games completion state
  const [minigamesComplete, setMinigamesComplete] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeletePredictions = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/predictions/race/${raceId}`);
      toast.success("Pronostics supprimés !");
      
      // Reset all states
      setExistingPrediction(null);
      setQualiPole(null);
      setQualiTop10([]);
      setRaceWinner(null);
      setRaceTop10([]);
      setSafetyCar(null);
      setDnfDrivers([]);
      setNoDnf(false);
      setFastestLapDriver(null);
      setFirstCornerLeader(null);
      setSprintQualiPole(null);
      setSprintQualiTop10([]);
      setSprintRaceWinner(null);
      setSprintRaceTop10([]);
      setSprintSafetyCar(null);
      setSprintDnfDrivers([]);
      setSprintNoDnf(false);
      setSprintFastestLap(null);
      setSprintFirstCorner(null);
      
      // Reset selection mode
      if (race?.is_sprint_weekend) {
        setSelectionMode("sprint_quali_pole");
      } else {
        setSelectionMode("quali_pole");
      }
      
      setShowDeleteConfirm(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [raceRes, driversRes] = await Promise.all([
        apiClient.get(`/races/${raceId}`),
        apiClient.get("/drivers")
      ]);
      setRace(raceRes.data);
      setDrivers(driversRes.data);
      
      // Check mini-games completion (3 competition attempts each)
      try {
        const [reactionRes, batakRes] = await Promise.all([
          apiClient.get("/minigames/reaction/scores").catch(() => ({ data: [] })),
          apiClient.get("/minigames/batak/scores").catch(() => ({ data: [] }))
        ]);
        const reactionCompetitionAttempts = reactionRes.data.filter(s => s.mode === "competition").length;
        const batakCompetitionAttempts = batakRes.data.filter(s => s.mode === "competition").length;
        setMinigamesComplete(reactionCompetitionAttempts >= 3 && batakCompetitionAttempts >= 3);
      } catch {
        setMinigamesComplete(false);
      }
      
      // Load existing predictions
      try {
        const predRes = await apiClient.get(`/predictions/race/${raceId}`);
        if (predRes.data) {
          setExistingPrediction(predRes.data);
          // Main race
          setQualiPole(predRes.data.quali_pole || null);
          setQualiTop10(predRes.data.quali_top10 || []);
          setRaceWinner(predRes.data.race_winner || null);
          setRaceTop10(predRes.data.race_top10 || []);
          if (predRes.data.bonus_bets) {
            setSafetyCar(predRes.data.bonus_bets.safety_car ?? null);
            setDnfDrivers(predRes.data.bonus_bets.dnf_drivers || []);
            setNoDnf(predRes.data.bonus_bets.no_dnf || false);
            setFastestLapDriver(predRes.data.bonus_bets.fastest_lap_driver || null);
            setFirstCornerLeader(predRes.data.bonus_bets.first_corner_leader || null);
          }
          // Sprint
          setSprintQualiPole(predRes.data.sprint_quali_pole || null);
          setSprintQualiTop10(predRes.data.sprint_quali_top10 || []);
          setSprintRaceWinner(predRes.data.sprint_race_winner || null);
          setSprintRaceTop10(predRes.data.sprint_race_top10 || []);
          if (predRes.data.sprint_bonus_bets) {
            setSprintSafetyCar(predRes.data.sprint_bonus_bets.safety_car ?? null);
            setSprintDnfDrivers(predRes.data.sprint_bonus_bets.dnf_drivers || []);
            setSprintNoDnf(predRes.data.sprint_bonus_bets.no_dnf || false);
            setSprintFastestLap(predRes.data.sprint_bonus_bets.fastest_lap_driver || null);
            setSprintFirstCorner(predRes.data.sprint_bonus_bets.first_corner_leader || null);
          }
        }
      } catch {
        // No existing prediction
      }
      
      // Set initial tab for sprint weekends
      if (raceRes.data?.is_sprint_weekend) {
        setActiveTab("sprint");
        setSelectionMode("sprint_quali_pole");
      } else {
        setActiveTab("main");
        setSelectionMode("quali_pole");
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

  // Update selection mode when tab changes
  useEffect(() => {
    if (activeTab === "sprint") {
      setSelectionMode("sprint_quali_pole");
    } else {
      setSelectionMode("quali_pole");
    }
  }, [activeTab]);

  const handleDriverSelect = (driverId) => {
    if (activeTab === "sprint") {
      handleSprintDriverSelect(driverId);
    } else {
      handleMainDriverSelect(driverId);
    }
  };

  const handleSprintDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "sprint_quali_pole":
        setSprintQualiPole(driverId);
        if (sprintQualiTop10.length < 10) setSelectionMode("sprint_quali_top10");
        break;
      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId)) {
          setSprintQualiTop10(sprintQualiTop10.filter(d => d !== driverId));
        } else if (sprintQualiTop10.length < 10) {
          const newTop10 = [...sprintQualiTop10, driverId];
          setSprintQualiTop10(newTop10);
          if (newTop10.length === 10 && !sprintRaceWinner) setSelectionMode("sprint_race_winner");
        }
        break;
      case "sprint_race_winner":
        setSprintRaceWinner(driverId);
        if (sprintRaceTop10.length < 10) setSelectionMode("sprint_race_top10");
        break;
      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId)) {
          setSprintRaceTop10(sprintRaceTop10.filter(d => d !== driverId));
        } else if (sprintRaceTop10.length < 10) {
          const newTop10 = [...sprintRaceTop10, driverId];
          setSprintRaceTop10(newTop10);
          if (newTop10.length === 10) setSelectionMode("sprint_bonus");
        }
        break;
      case "sprint_fastest_lap":
        setSprintFastestLap(driverId === sprintFastestLap ? null : driverId);
        // Return to bonus screen after selection
        setSelectionMode("sprint_bonus");
        break;
      case "sprint_first_corner":
        setSprintFirstCorner(driverId === sprintFirstCorner ? null : driverId);
        // Return to bonus screen after selection
        setSelectionMode("sprint_bonus");
        break;
      case "sprint_dnf_select":
        if (sprintDnfDrivers.includes(driverId)) {
          setSprintDnfDrivers(sprintDnfDrivers.filter(d => d !== driverId));
        } else if (sprintDnfDrivers.length < 5) {
          setSprintDnfDrivers([...sprintDnfDrivers, driverId]);
        }
        break;
      default:
        break;
    }
  };

  const handleMainDriverSelect = (driverId) => {
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
          if (newTop10.length === 10 && !raceWinner) setSelectionMode("race_winner");
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
        // Return to bonus screen after selection
        setSelectionMode("bonus");
        break;
      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId);
        // Return to bonus screen after selection
        setSelectionMode("bonus");
        break;
      case "dnf_select":
        if (dnfDrivers.includes(driverId)) {
          setDnfDrivers(dnfDrivers.filter(d => d !== driverId));
        } else if (dnfDrivers.length < 5) {
          setDnfDrivers([...dnfDrivers, driverId]);
        }
        break;
      default:
        break;
    }
  };

  const isDriverSelected = (driverId) => {
    if (activeTab === "sprint") {
      switch (selectionMode) {
        case "sprint_quali_pole": return sprintQualiPole === driverId;
        case "sprint_quali_top10": return sprintQualiTop10.includes(driverId);
        case "sprint_race_winner": return sprintRaceWinner === driverId;
        case "sprint_race_top10": return sprintRaceTop10.includes(driverId);
        case "sprint_fastest_lap": return sprintFastestLap === driverId;
        case "sprint_first_corner": return sprintFirstCorner === driverId;
        case "sprint_dnf_select": return sprintDnfDrivers.includes(driverId);
        default: return false;
      }
    } else {
      switch (selectionMode) {
        case "quali_pole": return qualiPole === driverId;
        case "quali_top10": return qualiTop10.includes(driverId);
        case "race_winner": return raceWinner === driverId;
        case "race_top10": return raceTop10.includes(driverId);
        case "fastest_lap": return fastestLapDriver === driverId;
        case "first_corner": return firstCornerLeader === driverId;
        case "dnf_select": return dnfDrivers.includes(driverId);
        default: return false;
      }
    }
  };

  // Check completion
  const isSprintComplete = sprintQualiPole && sprintQualiTop10.length === 10 && sprintRaceWinner && sprintRaceTop10.length === 10;
  const isMainComplete = qualiPole && qualiTop10.length === 10 && raceWinner && raceTop10.length === 10;
  
  // Check if all bonuses are completed
  const isSprintBonusComplete = sprintSafetyCar !== null && sprintFastestLap && sprintFirstCorner && (sprintNoDnf || sprintDnfDrivers.length > 0);
  const isMainBonusComplete = safetyCar !== null && fastestLapDriver && firstCornerLeader && (noDnf || dnfDrivers.length > 0);

  const handleSaveSprint = async () => {
    if (!isSprintComplete) {
      toast.error("Complete tous les pronostics sprint");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/predictions/sprint", {
        race_id: raceId,
        sprint_quali_pole: sprintQualiPole,
        sprint_quali_top10: sprintQualiTop10,
        sprint_race_winner: sprintRaceWinner,
        sprint_race_top10: sprintRaceTop10,
        sprint_bonus_bets: {
          safety_car: sprintSafetyCar,
          dnf_drivers: sprintNoDnf ? [] : sprintDnfDrivers,
          no_dnf: sprintNoDnf,
          fastest_lap_driver: sprintFastestLap,
          first_corner_leader: sprintFirstCorner
        }
      });
      toast.success("Pronostics Sprint enregistrés !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMain = async () => {
    if (!isMainComplete) {
      toast.error("Complete tous les pronostics course");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/predictions/main", {
        race_id: raceId,
        quali_pole: qualiPole,
        quali_top10: qualiTop10,
        race_winner: raceWinner,
        race_top10: raceTop10,
        bonus_bets: {
          safety_car: safetyCar,
          dnf_drivers: noDnf ? [] : dnfDrivers,
          no_dnf: noDnf,
          fastest_lap_driver: fastestLapDriver,
          first_corner_leader: firstCornerLeader
        }
      });
      toast.success("Pronostics Course enregistrés !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Selection steps for each tab
  const getSprintSteps = () => [
    { key: "sprint_quali_pole", label: "Pole", sublabel: "Sprint Q", icon: Flag, done: !!sprintQualiPole, count: sprintQualiPole ? 1 : 0, max: 1 },
    { key: "sprint_quali_top10", label: "Top 10", sublabel: "Sprint Q", icon: Medal, done: sprintQualiTop10.length === 10, count: sprintQualiTop10.length, max: 10 },
    { key: "sprint_race_winner", label: "Winner", sublabel: "Sprint", icon: Trophy, done: !!sprintRaceWinner, count: sprintRaceWinner ? 1 : 0, max: 1 },
    { key: "sprint_race_top10", label: "Top 10", sublabel: "Sprint", icon: Medal, done: sprintRaceTop10.length === 10, count: sprintRaceTop10.length, max: 10 },
    { key: "sprint_bonus", label: "Bonus", sublabel: "Sprint", icon: Zap, done: isSprintBonusComplete, count: 0, max: 0, isBonus: true },
    { key: "minigames", label: "Jeux", sublabel: "Mini", icon: Gamepad2, done: minigamesComplete, count: 0, max: 0, isMinigames: true }
  ];

  const getMainSteps = () => [
    { key: "quali_pole", label: "Pole", sublabel: "Qualif", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
    { key: "quali_top10", label: "Top 10", sublabel: "Qualif", icon: Medal, done: qualiTop10.length === 10, count: qualiTop10.length, max: 10 },
    { key: "race_winner", label: "Winner", sublabel: "Course", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
    { key: "race_top10", label: "Top 10", sublabel: "Course", icon: Medal, done: raceTop10.length === 10, count: raceTop10.length, max: 10 },
    { key: "bonus", label: "Bonus", sublabel: "Paris", icon: Zap, done: isMainBonusComplete, count: 0, max: 0, isBonus: true },
    { key: "minigames", label: "Jeux", sublabel: "Mini", icon: Gamepad2, done: minigamesComplete, count: 0, max: 0, isMinigames: true }
  ];

  const showBonus = activeTab === "sprint" ? selectionMode === "sprint_bonus" : selectionMode === "bonus";
  const steps = activeTab === "sprint" ? getSprintSteps() : getMainSteps();

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 skeleton-arcade rounded w-48" />
          <div className="h-32 skeleton-arcade rounded-xl" />
          <div className="h-64 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto card-arcade p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-white">Course non trouvée</p>
        </div>
      </div>
    );
  }

  const canPredictSprint = race.can_predict_sprint;
  const canPredictMain = race.can_predict;

  return (
    <div className="min-h-screen bg-app-main pb-32" data-testid="predictions-page">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1628] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-heading text-lg text-white uppercase">Supprimer</h3>
                <p className="font-body text-xs text-gray-400">Cette action est irréversible</p>
              </div>
            </div>
            
            <p className="font-body text-sm text-gray-300 mb-6">
              Veux-tu vraiment supprimer tous tes pronostics pour le <strong className="text-white">{race.name}</strong> ?
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                disabled={deleting}
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeletePredictions}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1628] to-transparent p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 text-cyan-400" data-testid="back-btn">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <p className="font-body text-xs text-cyan-400 uppercase tracking-widest">Pronostics</p>
              <h1 className="font-heading text-xl text-white uppercase">{race.name.replace(" Grand Prix", "")}</h1>
            </div>
          </div>
          
          {/* Delete button - only show if there are existing predictions and predictions are still open */}
          {existingPrediction && (canPredictMain || canPredictSprint) && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
              data-testid="delete-predictions-btn"
              title="Supprimer mes pronostics"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* Tabs for Sprint weekends */}
        {race.is_sprint_weekend && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setActiveTab("sprint")}
              disabled={!canPredictSprint}
              className={`p-3 rounded-xl font-heading text-sm uppercase transition-all ${
                activeTab === "sprint"
                  ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                  : canPredictSprint 
                    ? 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
                    : 'bg-gray-800/50 border-2 border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
              data-testid="tab-sprint"
            >
              <Zap className="w-5 h-5 mx-auto mb-1" />
              Sprint
              {!canPredictSprint && <span className="block text-[10px] text-red-400">Fermé</span>}
              {isSprintComplete && canPredictSprint && <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />}
            </button>
            <button
              onClick={() => setActiveTab("main")}
              disabled={!canPredictMain}
              className={`p-3 rounded-xl font-heading text-sm uppercase transition-all ${
                activeTab === "main"
                  ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                  : canPredictMain
                    ? 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
                    : 'bg-gray-800/50 border-2 border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
              data-testid="tab-main"
            >
              <Flag className="w-5 h-5 mx-auto mb-1" />
              Course
              {!canPredictMain && <span className="block text-[10px] text-red-400">Fermé</span>}
              {isMainComplete && canPredictMain && <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />}
            </button>
          </div>
        )}

        {/* Deadline info */}
        <div className={`p-3 rounded-xl ${
          activeTab === "sprint" ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-cyan-500/10 border border-cyan-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${activeTab === "sprint" ? 'text-yellow-400' : 'text-cyan-400'}`} />
            <span className="font-body text-sm text-gray-300">
              {activeTab === "sprint" 
                ? "Clôture 15 min avant SQ1"
                : "Clôture 15 min avant Q1"
              }
            </span>
          </div>
        </div>

        {/* Step Navigation - Grid Layout */}
        <div className="grid grid-cols-3 gap-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = selectionMode === step.key || (step.isBonus && showBonus);
            const bonusModeKey = activeTab === "sprint" ? "sprint_bonus" : "bonus";
            
            const handleStepClick = () => {
              if (step.isMinigames) {
                navigate("/minigames");
              } else if (step.isBonus) {
                setSelectionMode(bonusModeKey);
              } else {
                setSelectionMode(step.key);
              }
            };
            
            // Determine colors based on state
            let bgClass, borderClass, iconClass, labelClass;
            
            if (step.isMinigames || step.isBonus) {
              // Bonus and Minigames: green when done, purple when not done
              if (step.done) {
                bgClass = 'bg-green-500/20';
                borderClass = 'border-green-500';
                iconClass = 'text-green-400';
                labelClass = 'text-green-400';
              } else {
                bgClass = 'bg-purple-500/10';
                borderClass = 'border-purple-500/50';
                iconClass = 'text-purple-400';
                labelClass = 'text-purple-400';
              }
            } else if (isActive) {
              bgClass = activeTab === "sprint" ? 'bg-yellow-500/20' : 'bg-blue-500/20';
              borderClass = activeTab === "sprint" ? 'border-yellow-500' : 'border-blue-500';
              iconClass = activeTab === "sprint" ? 'text-yellow-400' : 'text-blue-400';
              labelClass = 'text-white';
            } else if (step.done) {
              bgClass = 'bg-green-500/10';
              borderClass = 'border-green-500/50';
              iconClass = 'text-green-400';
              labelClass = 'text-green-400';
            } else {
              bgClass = 'bg-white/5';
              borderClass = 'border-gray-700';
              iconClass = 'text-gray-500';
              labelClass = 'text-gray-500';
            }
            
            return (
              <button
                key={step.key}
                onClick={handleStepClick}
                className={`flex flex-col items-center p-2 rounded-xl transition-all border-2 ${bgClass} ${borderClass}`}
                data-testid={`step-${step.key}`}
              >
                <Icon className={`w-5 h-5 mb-1 ${iconClass}`} />
                <span className={`font-heading text-[10px] ${labelClass}`}>{step.label}</span>
                <span className="font-body text-[8px] text-gray-500">{step.sublabel}</span>
                {!step.isBonus && !step.isMinigames && (
                  <span className={`font-data text-xs mt-1 ${step.done ? 'text-green-400' : 'text-gray-400'}`}>
                    {step.count}/{step.max}
                  </span>
                )}
                {(step.isBonus || step.isMinigames) && (
                  <span className={`font-data text-[9px] mt-1 ${step.done ? 'text-green-400' : 'text-purple-400'}`}>
                    {step.done ? '✓' : '→'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection Info */}
        <Card className="game-card">
          <CardContent className="p-4">
            <p className="font-body text-gray-300 text-sm">
              {activeTab === "sprint" ? (
                <>
                  {selectionMode === "sprint_quali_pole" && "Sélectionne le pilote en pole des qualifs sprint"}
                  {selectionMode === "sprint_quali_top10" && `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
                  {selectionMode === "sprint_race_winner" && "Sélectionne le vainqueur de la course sprint"}
                  {selectionMode === "sprint_race_top10" && `Sélectionne le Top 10 de la course sprint (${sprintRaceTop10.length}/10)`}
                  {selectionMode === "sprint_bonus" && "Configure tes paris bonus sprint"}
                  {selectionMode === "sprint_fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour sprint"}
                  {selectionMode === "sprint_first_corner" && "Sélectionne le leader au premier virage du sprint"}
                  {selectionMode === "sprint_dnf_select" && `Sélectionne les abandons sprint (${sprintDnfDrivers.length}/5)`}
                </>
              ) : (
                <>
                  {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
                  {selectionMode === "quali_top10" && `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
                  {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
                  {selectionMode === "race_top10" && `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
                  {selectionMode === "bonus" && "Configure tes paris bonus"}
                  {selectionMode === "fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour"}
                  {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
                  {selectionMode === "dnf_select" && `Sélectionne les abandons (${dnfDrivers.length}/5)`}
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Bonus Section */}
        {showBonus ? (
          <div className="space-y-4">
            <Card className="game-card">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                  <Zap className={activeTab === "sprint" ? "text-yellow-400" : "text-cyan-400"} />
                  Paris Bonus {activeTab === "sprint" ? "Sprint" : ""}
                </h3>
                
                {/* Safety Car */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <span className="font-body text-white">Safety Car</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => activeTab === "sprint" ? setSprintSafetyCar(true) : setSafetyCar(true)}
                      className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                        (activeTab === "sprint" ? sprintSafetyCar : safetyCar) 
                          ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400'
                      }`}
                    >OUI</button>
                    <button
                      onClick={() => activeTab === "sprint" ? setSprintSafetyCar(false) : setSafetyCar(false)}
                      className={`px-4 py-2 rounded-lg font-heading text-sm transition-all ${
                        !(activeTab === "sprint" ? sprintSafetyCar : safetyCar)
                          ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'
                      }`}
                    >NON</button>
                  </div>
                </div>

                {/* Fastest Lap */}
                <button
                  onClick={() => setSelectionMode(activeTab === "sprint" ? "sprint_fastest_lap" : "fastest_lap")}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Timer className="w-5 h-5 text-purple-400" />
                    <span className="font-body text-white">Meilleur tour</span>
                  </div>
                  <span className="font-body text-sm text-cyan-400">
                    {(activeTab === "sprint" ? sprintFastestLap : fastestLapDriver) 
                      ? drivers.find(d => d.id === (activeTab === "sprint" ? sprintFastestLap : fastestLapDriver))?.name || "Sélectionné"
                      : "Sélectionner →"}
                  </span>
                </button>

                {/* First Corner Leader */}
                <button
                  onClick={() => setSelectionMode(activeTab === "sprint" ? "sprint_first_corner" : "first_corner")}
                  className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Flag className="w-5 h-5 text-green-400" />
                    <span className="font-body text-white">Leader T1</span>
                  </div>
                  <span className="font-body text-sm text-cyan-400">
                    {(activeTab === "sprint" ? sprintFirstCorner : firstCornerLeader)
                      ? drivers.find(d => d.id === (activeTab === "sprint" ? sprintFirstCorner : firstCornerLeader))?.name || "Sélectionné"
                      : "Sélectionner →"}
                  </span>
                </button>

                {/* DNF */}
                <div className="p-3 bg-white/5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <X className="w-5 h-5 text-red-400" />
                      <span className="font-body text-white">Abandons (DNF)</span>
                    </div>
                  </div>
                  
                  {/* No DNF toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (activeTab === "sprint") {
                          setSprintNoDnf(true);
                          setSprintDnfDrivers([]);
                        } else {
                          setNoDnf(true);
                          setDnfDrivers([]);
                        }
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-heading text-sm transition-all ${
                        (activeTab === "sprint" ? sprintNoDnf : noDnf)
                          ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      Pas de DNF
                    </button>
                    <button
                      onClick={() => {
                        if (activeTab === "sprint") {
                          setSprintNoDnf(false);
                        } else {
                          setNoDnf(false);
                        }
                        setSelectionMode(activeTab === "sprint" ? "sprint_dnf_select" : "dnf_select");
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg font-heading text-sm transition-all ${
                        !(activeTab === "sprint" ? sprintNoDnf : noDnf) && (activeTab === "sprint" ? sprintDnfDrivers : dnfDrivers).length > 0
                          ? 'bg-red-500 text-white' 
                          : !(activeTab === "sprint" ? sprintNoDnf : noDnf)
                            ? 'bg-white/10 text-gray-400 hover:bg-white/20'
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      {(activeTab === "sprint" ? sprintDnfDrivers : dnfDrivers).length > 0 
                        ? `${(activeTab === "sprint" ? sprintDnfDrivers : dnfDrivers).length} pilote(s)`
                        : "Sélectionner →"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Driver Grid */
          <div className="grid grid-cols-2 gap-2">
            {drivers.map((driver) => {
              const selected = isDriverSelected(driver.id);
              const teamColor = TEAM_COLORS[driver.team] || "#6B7280";
              
              // Get position in current selection
              let position = null;
              if (activeTab === "sprint") {
                if (selectionMode === "sprint_quali_top10") {
                  const idx = sprintQualiTop10.indexOf(driver.id);
                  if (idx >= 0) position = idx + 1;
                } else if (selectionMode === "sprint_race_top10") {
                  const idx = sprintRaceTop10.indexOf(driver.id);
                  if (idx >= 0) position = idx + 1;
                }
              } else {
                if (selectionMode === "quali_top10") {
                  const idx = qualiTop10.indexOf(driver.id);
                  if (idx >= 0) position = idx + 1;
                } else if (selectionMode === "race_top10") {
                  const idx = raceTop10.indexOf(driver.id);
                  if (idx >= 0) position = idx + 1;
                }
              }

              return (
                <button
                  key={driver.id}
                  onClick={() => handleDriverSelect(driver.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    selected 
                      ? 'border-cyan-400 bg-cyan-500/20' 
                      : 'border-gray-700 bg-white/5 hover:bg-white/10'
                  }`}
                  style={{ borderLeftColor: teamColor, borderLeftWidth: '4px' }}
                  data-testid={`driver-${driver.id}`}
                >
                  {position && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {position}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-data text-lg text-gray-500">{driver.number}</span>
                    <div className="text-left">
                      <p className="font-body text-sm text-white">{driver.name}</p>
                      <p className="font-body text-xs text-gray-500">{driver.team}</p>
                    </div>
                  </div>
                  {selected && <Check className="absolute top-2 right-2 w-4 h-4 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Back to Bonus button for DNF selection mode */}
        {(selectionMode === "dnf_select" || selectionMode === "sprint_dnf_select") && (
          <div className="mt-4">
            <Button
              onClick={() => setSelectionMode(activeTab === "sprint" ? "sprint_bonus" : "bonus")}
              className="w-full h-12 bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/30 font-heading"
            >
              <Check className="w-5 h-5 mr-2" />
              Valider et retour aux bonus
            </Button>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-t from-[#050a14] to-transparent pt-8 pb-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={activeTab === "sprint" ? handleSaveSprint : handleSaveMain}
            disabled={saving || (activeTab === "sprint" ? !isSprintComplete : !isMainComplete) || (activeTab === "sprint" ? !canPredictSprint : !canPredictMain)}
            className={`w-full h-14 font-heading text-lg ${
              activeTab === "sprint" ? 'btn-gold' : 'btn-racing'
            }`}
            data-testid="save-predictions-btn"
          >
            {saving ? (
              "Enregistrement..."
            ) : (activeTab === "sprint" ? !canPredictSprint : !canPredictMain) ? (
              "Pronostics fermés"
            ) : (activeTab === "sprint" ? isSprintComplete : isMainComplete) ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Enregistrer Pronos
              </>
            ) : (
              "Complète tous les pronostics"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
