import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronLeft, Check, AlertCircle, Zap, Flag, Trash2,
} from "lucide-react";

import PredictionTimer from "./PredictionTimer";
import PredictionForm from "./PredictionForm";
import { useDriverSelection } from "./useDriverSelection";

export default function PredictionsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [race, setRace] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingPrediction, setExistingPrediction] = useState(null);

  // Tab for sprint weekends
  const [activeTab, setActiveTab] = useState("sprint");

  // Sprint predictions
  const [sprintQualiPole, setSprintQualiPole] = useState(null);
  const [sprintQualiTop10, setSprintQualiTop10] = useState([]);
  const [sprintRaceWinner, setSprintRaceWinner] = useState(null);
  const [sprintRaceTop10, setSprintRaceTop10] = useState([]);
  const [sprintSafetyCar, setSprintSafetyCar] = useState(null);
  const [sprintDnfDrivers, setSprintDnfDrivers] = useState([]);
  const [sprintNoDnf, setSprintNoDnf] = useState(false);
  const [sprintFastestLap, setSprintFastestLap] = useState(null);
  const [sprintFirstCorner, setSprintFirstCorner] = useState(null);

  // Main race predictions
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop10, setQualiTop10] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop10, setRaceTop10] = useState([]);
  const [safetyCar, setSafetyCar] = useState(null);
  const [dnfDrivers, setDnfDrivers] = useState([]);
  const [noDnf, setNoDnf] = useState(false);
  const [fastestLapDriver, setFastestLapDriver] = useState(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState(null);

  // Current selection mode
  const [selectionMode, setSelectionMode] = useState("quali_pole");

  // Mini-games completion
  const [minigamesComplete, setMinigamesComplete] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Data fetching ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [raceRes, driversRes] = await Promise.all([
        apiClient.get(`/races/${raceId}`),
        apiClient.get("/drivers"),
      ]);
      setRace(raceRes.data);
      setDrivers(driversRes.data);

      try {
        const [reactionRes, batakRes] = await Promise.all([
          apiClient.get("/minigames/reaction/scores").catch(() => ({ data: [] })),
          apiClient.get("/minigames/batak/scores").catch(() => ({ data: [] })),
        ]);
        const reactionComp = reactionRes.data.filter((s) => s.mode === "competition").length;
        const batakComp = batakRes.data.filter((s) => s.mode === "competition").length;
        setMinigamesComplete(reactionComp >= 3 && batakComp >= 3);
      } catch {
        setMinigamesComplete(false);
      }

      try {
        const predRes = await apiClient.get(`/predictions/race/${raceId}`);
        if (predRes.data) {
          setExistingPrediction(predRes.data);
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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setSelectionMode(activeTab === "sprint" ? "sprint_quali_pole" : "quali_pole");
  }, [activeTab]);

  // ── Driver selection (extracted hook) ─────────────────────────────────
  const { handleDriverSelect, isDriverSelected } = useDriverSelection({
    activeTab, selectionMode, setSelectionMode,
    sprintQualiPole, setSprintQualiPole,
    sprintQualiTop10, setSprintQualiTop10,
    sprintRaceWinner, setSprintRaceWinner,
    sprintRaceTop10, setSprintRaceTop10,
    sprintFastestLap, setSprintFastestLap,
    sprintFirstCorner, setSprintFirstCorner,
    sprintDnfDrivers, setSprintDnfDrivers,
    qualiPole, setQualiPole,
    qualiTop10, setQualiTop10,
    raceWinner, setRaceWinner,
    raceTop10, setRaceTop10,
    fastestLapDriver, setFastestLapDriver,
    firstCornerLeader, setFirstCornerLeader,
    dnfDrivers, setDnfDrivers,
  });

  // ── Completion checks ───────────────────────────────────────────────
  const isSprintComplete = sprintQualiPole && sprintQualiTop10.length === 10 && sprintRaceWinner && sprintRaceTop10.length === 10;
  const isMainComplete = qualiPole && qualiTop10.length === 10 && raceWinner && raceTop10.length === 10;
  const isSprintBonusComplete = sprintSafetyCar !== null && sprintFastestLap && sprintFirstCorner && (sprintNoDnf || sprintDnfDrivers.length > 0);
  const isMainBonusComplete = safetyCar !== null && fastestLapDriver && firstCornerLeader && (noDnf || dnfDrivers.length > 0);

  // ── Save / Delete handlers ──────────────────────────────────────────
  const handleDeletePredictions = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/predictions/race/${raceId}`);
      toast.success("Pronostics supprimés !");
      setExistingPrediction(null);
      setQualiPole(null); setQualiTop10([]); setRaceWinner(null); setRaceTop10([]);
      setSafetyCar(null); setDnfDrivers([]); setNoDnf(false);
      setFastestLapDriver(null); setFirstCornerLeader(null);
      setSprintQualiPole(null); setSprintQualiTop10([]); setSprintRaceWinner(null); setSprintRaceTop10([]);
      setSprintSafetyCar(null); setSprintDnfDrivers([]); setSprintNoDnf(false);
      setSprintFastestLap(null); setSprintFirstCorner(null);
      setSelectionMode(race?.is_sprint_weekend ? "sprint_quali_pole" : "quali_pole");
      setShowDeleteConfirm(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    const isSprint = activeTab === "sprint";
    const complete = isSprint ? isSprintComplete : isMainComplete;
    if (!complete) {
      toast.error(isSprint ? "Complete tous les pronostics sprint" : "Complete tous les pronostics course");
      return;
    }
    setSaving(true);
    try {
      if (isSprint) {
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
            first_corner_leader: sprintFirstCorner,
          },
        });
        toast.success("Pronostics Sprint enregistrés !");
      } else {
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
            first_corner_leader: firstCornerLeader,
          },
        });
        toast.success("Pronostics Course enregistrés !");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ── Render: loading / error ─────────────────────────────────────────
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
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800" disabled={deleting}>
                Annuler
              </Button>
              <Button onClick={handleDeletePredictions} className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={deleting}>
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
          {existingPrediction && (canPredictMain || canPredictSprint) && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors" data-testid="delete-predictions-btn" title="Supprimer mes pronostics">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* Sprint/Main tabs */}
        {race.is_sprint_weekend && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setActiveTab("sprint")} disabled={!canPredictSprint} className={`p-3 rounded-xl font-heading text-sm uppercase transition-all ${activeTab === "sprint" ? "bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400" : canPredictSprint ? "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10" : "bg-gray-800/50 border-2 border-gray-800 text-gray-600 cursor-not-allowed"}`} data-testid="tab-sprint">
              <Zap className="w-5 h-5 mx-auto mb-1" />Sprint
              {!canPredictSprint && <span className="block text-[10px] text-red-400">Fermé</span>}
              {isSprintComplete && canPredictSprint && <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />}
            </button>
            <button onClick={() => setActiveTab("main")} disabled={!canPredictMain} className={`p-3 rounded-xl font-heading text-sm uppercase transition-all ${activeTab === "main" ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400" : canPredictMain ? "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10" : "bg-gray-800/50 border-2 border-gray-800 text-gray-600 cursor-not-allowed"}`} data-testid="tab-main">
              <Flag className="w-5 h-5 mx-auto mb-1" />Course
              {!canPredictMain && <span className="block text-[10px] text-red-400">Fermé</span>}
              {isMainComplete && canPredictMain && <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />}
            </button>
          </div>
        )}

        <PredictionTimer activeTab={activeTab} />

        <PredictionForm
          activeTab={activeTab}
          selectionMode={selectionMode}
          setSelectionMode={setSelectionMode}
          drivers={drivers}
          sprintQualiPole={sprintQualiPole} sprintQualiTop10={sprintQualiTop10}
          sprintRaceWinner={sprintRaceWinner} sprintRaceTop10={sprintRaceTop10}
          sprintSafetyCar={sprintSafetyCar} setSprintSafetyCar={setSprintSafetyCar}
          sprintDnfDrivers={sprintDnfDrivers} setSprintDnfDrivers={setSprintDnfDrivers}
          sprintNoDnf={sprintNoDnf} setSprintNoDnf={setSprintNoDnf}
          sprintFastestLap={sprintFastestLap} sprintFirstCorner={sprintFirstCorner}
          qualiPole={qualiPole} qualiTop10={qualiTop10}
          raceWinner={raceWinner} raceTop10={raceTop10}
          safetyCar={safetyCar} setSafetyCar={setSafetyCar}
          dnfDrivers={dnfDrivers} setDnfDrivers={setDnfDrivers}
          noDnf={noDnf} setNoDnf={setNoDnf}
          fastestLapDriver={fastestLapDriver} firstCornerLeader={firstCornerLeader}
          isSprintBonusComplete={isSprintBonusComplete} isMainBonusComplete={isMainBonusComplete}
          minigamesComplete={minigamesComplete}
          handleDriverSelect={handleDriverSelect} isDriverSelected={isDriverSelected}
        />
      </div>

      {/* Save Button */}
      <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-t from-[#050a14] to-transparent pt-8 pb-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSave}
            disabled={saving || (activeTab === "sprint" ? !isSprintComplete : !isMainComplete) || (activeTab === "sprint" ? !canPredictSprint : !canPredictMain)}
            className={`w-full h-14 font-heading text-lg ${activeTab === "sprint" ? "btn-gold" : "btn-racing"}`}
            data-testid="save-predictions-btn"
          >
            {saving ? (
              "Enregistrement..."
            ) : (activeTab === "sprint" ? !canPredictSprint : !canPredictMain) ? (
              "Pronostics fermés"
            ) : (activeTab === "sprint" ? isSprintComplete : isMainComplete) ? (
              <><Check className="w-5 h-5 mr-2" />Enregistrer Pronos</>
            ) : (
              "Complète tous les pronostics"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
