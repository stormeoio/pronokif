import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Check, AlertCircle, Zap, Flag, Trash2 } from "lucide-react";
import PredictionTimer from "./PredictionTimer";
import PredictionForm from "./PredictionForm";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useDriverSelection } from "./useDriverSelection";
import { usePredictionData } from "./usePredictionData";
import { usePredictionForm } from "./usePredictionForm";
import { Button } from "@/components/ui/button";

export default function PredictionsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  // ── Data fetching ────────────────────────────────────────────────────
  const {
    loading,
    race,
    drivers,
    existingPrediction: fetchedPrediction,
    minigamesComplete,
  } = usePredictionData(raceId);

  // ── Form state ───────────────────────────────────────────────────────
  const form = usePredictionForm({ raceId, race, loading, fetchedPrediction });

  // ── Driver selection ─────────────────────────────────────────────────
  const { handleDriverSelect, isDriverSelected } = useDriverSelection({
    activeTab: form.activeTab,
    selectionMode: form.selectionMode,
    setSelectionMode: form.setSelectionMode,
    sprintQualiPole: form.sprintQualiPole,
    setSprintQualiPole: form.setSprintQualiPole,
    sprintQualiTop10: form.sprintQualiTop10,
    setSprintQualiTop10: form.setSprintQualiTop10,
    sprintRaceWinner: form.sprintRaceWinner,
    setSprintRaceWinner: form.setSprintRaceWinner,
    sprintRaceTop10: form.sprintRaceTop10,
    setSprintRaceTop10: form.setSprintRaceTop10,
    sprintFastestLap: form.sprintFastestLap,
    setSprintFastestLap: form.setSprintFastestLap,
    sprintFirstCorner: form.sprintFirstCorner,
    setSprintFirstCorner: form.setSprintFirstCorner,
    sprintDnfDrivers: form.sprintDnfDrivers,
    setSprintDnfDrivers: form.setSprintDnfDrivers,
    qualiPole: form.qualiPole,
    setQualiPole: form.setQualiPole,
    qualiTop10: form.qualiTop10,
    setQualiTop10: form.setQualiTop10,
    raceWinner: form.raceWinner,
    setRaceWinner: form.setRaceWinner,
    raceTop10: form.raceTop10,
    setRaceTop10: form.setRaceTop10,
    fastestLapDriver: form.fastestLapDriver,
    setFastestLapDriver: form.setFastestLapDriver,
    firstCornerLeader: form.firstCornerLeader,
    setFirstCornerLeader: form.setFirstCornerLeader,
    dnfDrivers: form.dnfDrivers,
    setDnfDrivers: form.setDnfDrivers,
  });

  // ── Loading / Error states ───────────────────────────────────────────
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

  const canPredictSprint = (race as Record<string, unknown>).can_predict_sprint;
  const canPredictMain = (race as Record<string, unknown>).can_predict;

  return (
    <div className="min-h-screen bg-app-main pb-32" data-testid="predictions-page">
      {form.showDeleteConfirm && (
        <DeleteConfirmModal
          raceName={(race as Record<string, unknown>).name as string}
          deleting={form.deleting}
          onConfirm={form.handleDeletePredictions}
          onCancel={() => form.setShowDeleteConfirm(false)}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1628] to-transparent p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-cyan-400"
              data-testid="back-btn"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <p className="font-body text-xs text-cyan-400 uppercase tracking-widest">
                Pronostics
              </p>
              <h1 className="font-heading text-xl text-white uppercase">
                {((race as Record<string, unknown>).name as string).replace(" Grand Prix", "")}
              </h1>
            </div>
          </div>
          {form.existingPrediction && (canPredictMain || canPredictSprint) && (
            <button
              onClick={() => form.setShowDeleteConfirm(true)}
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
        {/* Sprint/Main tabs */}
        {(race as Record<string, unknown>).is_sprint_weekend && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => form.setActiveTab("sprint")}
              disabled={!canPredictSprint}
              className={`p-3 rounded-xl font-heading text-sm uppercase transition-all ${form.activeTab === "sprint" ? "bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400" : canPredictSprint ? "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10" : "bg-gray-800/50 border-2 border-gray-800 text-gray-600 cursor-not-allowed"}`}
              data-testid="tab-sprint"
            >
              <Zap className="w-5 h-5 mx-auto mb-1" />
              Sprint
              {!canPredictSprint && <span className="block text-[10px] text-red-400">Fermé</span>}
              {form.isSprintComplete && canPredictSprint && (
                <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />
              )}
            </button>
            <button
              onClick={() => form.setActiveTab("main")}
              disabled={!canPredictMain}
              className={`p-3 rounded-xl font-heading text-sm uppercase transition-all ${form.activeTab === "main" ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400" : canPredictMain ? "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10" : "bg-gray-800/50 border-2 border-gray-800 text-gray-600 cursor-not-allowed"}`}
              data-testid="tab-main"
            >
              <Flag className="w-5 h-5 mx-auto mb-1" />
              Course
              {!canPredictMain && <span className="block text-[10px] text-red-400">Fermé</span>}
              {form.isMainComplete && canPredictMain && (
                <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />
              )}
            </button>
          </div>
        )}

        <PredictionTimer activeTab={form.activeTab} />

        <PredictionForm
          activeTab={form.activeTab}
          selectionMode={form.selectionMode}
          setSelectionMode={form.setSelectionMode}
          drivers={drivers}
          sprintQualiPole={form.sprintQualiPole}
          sprintQualiTop10={form.sprintQualiTop10}
          sprintRaceWinner={form.sprintRaceWinner}
          sprintRaceTop10={form.sprintRaceTop10}
          sprintSafetyCar={form.sprintSafetyCar}
          setSprintSafetyCar={form.setSprintSafetyCar}
          sprintDnfDrivers={form.sprintDnfDrivers}
          setSprintDnfDrivers={form.setSprintDnfDrivers}
          sprintNoDnf={form.sprintNoDnf}
          setSprintNoDnf={form.setSprintNoDnf}
          sprintFastestLap={form.sprintFastestLap}
          sprintFirstCorner={form.sprintFirstCorner}
          qualiPole={form.qualiPole}
          qualiTop10={form.qualiTop10}
          raceWinner={form.raceWinner}
          raceTop10={form.raceTop10}
          safetyCar={form.safetyCar}
          setSafetyCar={form.setSafetyCar}
          dnfDrivers={form.dnfDrivers}
          setDnfDrivers={form.setDnfDrivers}
          noDnf={form.noDnf}
          setNoDnf={form.setNoDnf}
          fastestLapDriver={form.fastestLapDriver}
          firstCornerLeader={form.firstCornerLeader}
          isSprintBonusComplete={form.isSprintBonusComplete}
          isMainBonusComplete={form.isMainBonusComplete}
          minigamesComplete={minigamesComplete}
          handleDriverSelect={handleDriverSelect}
          isDriverSelected={isDriverSelected}
        />
      </div>

      {/* Save Button */}
      <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-t from-[#050a14] to-transparent pt-8 pb-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={form.handleSave}
            disabled={
              form.saving ||
              (form.activeTab === "sprint" ? !form.isSprintComplete : !form.isMainComplete) ||
              (form.activeTab === "sprint" ? !canPredictSprint : !canPredictMain)
            }
            className={`w-full h-14 font-heading text-lg ${form.activeTab === "sprint" ? "btn-gold" : "btn-racing"}`}
            data-testid="save-predictions-btn"
          >
            {form.saving ? (
              "Enregistrement..."
            ) : (form.activeTab === "sprint" ? !canPredictSprint : !canPredictMain) ? (
              "Pronostics fermés"
            ) : (form.activeTab === "sprint" ? form.isSprintComplete : form.isMainComplete) ? (
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
