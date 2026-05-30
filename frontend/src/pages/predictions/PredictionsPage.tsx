import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Check, AlertTriangle, Zap, Flag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PredictionTimer from "./PredictionTimer";
import PredictionForm from "./PredictionForm";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useDriverSelection } from "./useDriverSelection";
import { usePredictionData } from "./usePredictionData";
import { usePredictionForm } from "./usePredictionForm";
import { fadeUp } from "@/lib/motion";
import RewardCelebration from "@/components/RewardCelebration";
import { BorderGlowButton } from "@/components/ui/border-glow-button";

// ----------------------------------------------------------- component ---

export default function PredictionsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ---- Data fetching ----
  const {
    loading,
    race,
    drivers,
    existingPrediction: fetchedPrediction,
    minigamesCompletee,
  } = usePredictionData(raceId);

  // ---- Form state ----
  const form = usePredictionForm({ raceId, race, loading, fetchedPrediction });

  // ---- Driver selection ----
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

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-dvh bg-pk-carbon p-4 pt-16 max-w-[430px] mx-auto">
        <div className="space-y-3">
          <div className="h-8 rounded-md bg-pk-surface border border-white/[0.06] animate-pulse w-48" />
          <div className="h-32 rounded-md bg-pk-surface border border-white/[0.06] animate-pulse" />
          <div className="h-64 rounded-md bg-pk-surface border border-white/[0.06] animate-pulse" />
        </div>
      </div>
    );
  }

  // ---- Error ----
  if (!race) {
    return (
      <div className="min-h-dvh bg-pk-carbon p-4 pt-16 max-w-[430px] mx-auto">
        <div className="bg-pk-surface border border-white/[0.08] rounded-md p-6 text-center">
          <AlertTriangle size={32} strokeWidth={1.5} className="text-pk-red mx-auto mb-3" />
          <p className="text-pk-piste text-[0.875rem]">{t("predictions.race_not_found")}</p>
          <button onClick={() => navigate(-1)} className="btn-pk-outline text-[0.75rem] mt-4 px-4">
            <ChevronLeft size={14} strokeWidth={2} />
            {t("predictions.back")}
          </button>
        </div>
      </div>
    );
  }

  const canPredictSprint = race.can_predict_sprint;
  const canPredictMain = race.can_predict;

  return (
    <div
      className="min-h-dvh bg-pk-carbon pb-32 max-w-[430px] mx-auto"
      data-testid="predictions-page"
    >
      {/* Celebration */}
      <RewardCelebration
        show={form.showCelebration}
        onDone={form.dismissCelebration}
        xpEarned={form.celebrationXp}
        message={
          form.activeTab === "sprint" ? t("predictions.saved_sprint") : t("predictions.saved_main")
        }
      />

      {/* Delete modal */}
      {form.showDeleteConfirm && (
        <DeleteConfirmModal
          raceName={race.name}
          deleting={form.deleting}
          onConfirm={form.handleDeletePredictions}
          onCancel={() => form.setShowDeleteConfirm(false)}
        />
      )}

      {/* ---- HEADER ---- */}
      <header
        className="sticky top-0 z-50
          flex items-center gap-3
          px-4 py-3
          bg-pk-carbon/90 backdrop-blur-[20px] saturate-[1.3]
          border-b border-white/[0.08]"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full
            flex items-center justify-center
            bg-white/[0.04] border border-white/[0.08]
            text-pk-piste hover:border-white/[0.15]
            transition-colors duration-pk-short"
          data-testid="back-btn"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-[1rem] uppercase leading-tight">
            {race.name.replace(" Grand Prix", "")}
          </h1>
          <p className="font-mono text-[0.5625rem] text-pk-titane uppercase tracking-[0.1em]">
            {t("predictions.header_subtitle")}
          </p>
        </div>
        {form.existingPrediction && (canPredictMain || canPredictSprint) && (
          <button
            onClick={() => form.setShowDeleteConfirm(true)}
            className="w-8 h-8 rounded-full
              flex items-center justify-center
              text-pk-red hover:bg-pk-red-subtle
              transition-colors duration-pk-short"
            data-testid="delete-predictions-btn"
            title={t("predictions.delete_title")}
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        )}
      </header>

      {/* ---- CONTENT ---- */}
      <motion.div
        className="px-4 pt-4 space-y-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        {/* Sprint/Main tabs */}
        {race.is_sprint_weekend && (
          <div className="flex rounded-md bg-white/[0.03] border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => form.setActiveTab("sprint")}
              disabled={!canPredictSprint}
              className={`flex-1 py-3 text-center relative
                transition-all duration-pk-short ease-pk-enter
                ${
                  form.activeTab === "sprint"
                    ? "text-pk-piste bg-pk-amber/10"
                    : canPredictSprint
                      ? "text-pk-titane hover:text-pk-piste"
                      : "text-pk-titane/40 cursor-not-allowed"
                }`}
              data-testid="tab-sprint"
            >
              <Zap size={16} strokeWidth={1.5} className="mx-auto mb-0.5" />
              <span className="font-display text-[0.75rem] uppercase">
                {t("predictions.sprint")}
              </span>
              {!canPredictSprint && (
                <span className="block font-mono text-[0.5rem] text-pk-red mt-0.5">
                  {t("predictions.closed_short")}
                </span>
              )}
              {form.isSprintCompletee && canPredictSprint && (
                <Check size={12} strokeWidth={2} className="text-pk-emerald mx-auto mt-0.5" />
              )}
              {form.activeTab === "sprint" && (
                <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-pk-amber rounded-sm" />
              )}
            </button>
            <button
              onClick={() => form.setActiveTab("main")}
              disabled={!canPredictMain}
              className={`flex-1 py-3 text-center relative
                transition-all duration-pk-short ease-pk-enter
                ${
                  form.activeTab === "main"
                    ? "text-pk-piste bg-pk-red-subtle"
                    : canPredictMain
                      ? "text-pk-titane hover:text-pk-piste"
                      : "text-pk-titane/40 cursor-not-allowed"
                }`}
              data-testid="tab-main"
            >
              <Flag size={16} strokeWidth={1.5} className="mx-auto mb-0.5" />
              <span className="font-display text-[0.75rem] uppercase">{t("predictions.race")}</span>
              {!canPredictMain && (
                <span className="block font-mono text-[0.5rem] text-pk-red mt-0.5">
                  {t("predictions.closed_short")}
                </span>
              )}
              {form.isMainCompletee && canPredictMain && (
                <Check size={12} strokeWidth={2} className="text-pk-emerald mx-auto mt-0.5" />
              )}
              {form.activeTab === "main" && (
                <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-pk-red rounded-sm" />
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
          isSprintBonusCompletee={form.isSprintBonusCompletee}
          isMainBonusCompletee={form.isMainBonusCompletee}
          minigamesCompletee={minigamesCompletee}
          handleDriverSelect={handleDriverSelect}
          isDriverSelected={isDriverSelected}
        />
      </motion.div>

      {/* ---- BOTTOM ACTION BAR ---- */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2
          w-full max-w-[430px] z-50
          flex items-center gap-3
          px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]
          bg-pk-carbon/95 backdrop-blur-[20px] saturate-[1.3]
          border-t border-white/[0.08]"
      >
        <div className="flex-1">
          <p className="font-mono text-[0.625rem] text-pk-titane uppercase tracking-[0.1em]">
            {form.activeTab === "sprint"
              ? form.isSprintCompletee
                ? t("predictions.status.sprint_ready")
                : t("predictions.status.sprint_incomplete")
              : form.isMainCompletee
                ? t("predictions.status.race_ready")
                : t("predictions.status.race_incomplete")}
          </p>
          <div className="w-full h-[3px] bg-white/[0.04] rounded-sm mt-1 overflow-hidden">
            <div
              className="h-full bg-pk-red rounded-sm transition-all duration-pk-medium ease-pk-enter"
              style={{
                width: `${
                  form.activeTab === "sprint"
                    ? form.isSprintCompletee
                      ? 100
                      : 50
                    : form.isMainCompletee
                      ? 100
                      : 50
                }%`,
              }}
            />
          </div>
        </div>
        <BorderGlowButton
          onClick={form.handleSave}
          disabled={
            form.saving ||
            (form.activeTab === "sprint" ? !form.isSprintCompletee : !form.isMainCompletee) ||
            (form.activeTab === "sprint" ? !canPredictSprint : !canPredictMain)
          }
          className="text-[0.75rem] whitespace-nowrap min-h-[40px]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          edgeSensitivity={24}
          glowRadius={14}
          coneSpread={20}
          data-testid="save-predictions-btn"
        >
          {form.saving ? (
            t("predictions.saving")
          ) : (form.activeTab === "sprint" ? !canPredictSprint : !canPredictMain) ? (
            t("predictions.closed")
          ) : (form.activeTab === "sprint" ? form.isSprintCompletee : form.isMainCompletee) ? (
            <>
              <Check size={14} strokeWidth={2} />
              {t("predictions.save")}
            </>
          ) : (
            t("predictions.incomplete")
          )}
        </BorderGlowButton>
      </div>
    </div>
  );
}
