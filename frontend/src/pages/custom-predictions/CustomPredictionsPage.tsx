/**
 * CustomPredictionsPage — League custom predictions hub.
 * Broadcast Premium: glass header, pk-surface cards, stagger animations.
 */
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  HelpCircle,
  Users,
  MessageSquare,
  CheckCircle,
  Edit3,
} from "lucide-react";
import PredictionCard from "./PredictionCard";
import SetCorrectAnswerModal from "./SetCorrectAnswerModal";
import { CreatePredictionModal } from "./CreatePredictionModal";
import { useCustomPredictionsData } from "./useCustomPredictionsData";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { staggerContainer, fadeUp } from "@/lib/motion";

interface League {
  id: string;
  name: string;
}

interface Race {
  id: string;
  name: string;
  is_sprint_weekend?: boolean;
  status?: string;
}

interface Prediction {
  id: string;
  question: string;
  answer_type: string;
  multiple_choice?: boolean;
  choices?: { text: string; points: number }[];
  correct_answer?: string;
  created_by: string;
  user_answer?: string;
  has_answered?: boolean;
}

/* -- Skeleton ----------------------------------------------------------- */

function CustomPredictionsSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="h-14 bg-pk-surface animate-shimmer" />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* -- Component ---------------------------------------------------------- */

export default function CustomPredictionsPage() {
  const { t } = useTranslation();
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  const { loading, allRaces, defaultLeague, predictions, refetchPredictions } =
    useCustomPredictionsData(leagueId, league, selectedRace);

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (loading || hydratedRef.current) return;
    hydratedRef.current = true;
    if (defaultLeague) setLeague(defaultLeague);
    if (allRaces.length > 0) setSelectedRace(allRaces[0] ?? null);
  }, [loading, defaultLeague, allRaces]);

  const handleAnswer = async (predictionId: string, answer: string | string[]) => {
    try {
      await api.customPredictions.answer(predictionId, answer);
      toast.success(t("custom_predictions.answer_recorded"));
      refetchPredictions();
    } catch {
      toast.error(t("custom_predictions.error_generic"));
    }
  };

  const handleSetCorrectAnswer = async (predictionId: string, correctAnswer: string | string[]) => {
    try {
      await api.customPredictions.setCorrect(predictionId, { correct_answer: correctAnswer });
      toast.success(t("custom_predictions.answer_success"));
      setSelectedPrediction(null);
      refetchPredictions();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || t("custom_predictions.error_generic"));
    }
  };

  if (loading) return <CustomPredictionsSkeleton />;

  const myPredictions = predictions.filter((p: Prediction) => p.created_by === user?.id);
  const otherPredictions = predictions.filter((p: Prediction) => p.created_by !== user?.id);

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="custom-predictions-page">
      {/* Glass Header */}
      <div className="sticky top-0 z-40 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="custom-predictions-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pk-info" />
                {t("custom_predictions.title")}
              </h1>
              {league && <p className="font-data text-[0.5625rem] text-pk-titane">{league.name}</p>}
            </div>
            <button
              onClick={() => {
                haptic("light");
                setShowCreateModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-pk-red text-white font-display text-xs shadow-glow-red active:scale-[0.97] transition-transform flex items-center gap-1"
              data-testid="create-prediction-btn"
            >
              <Plus className="w-4 h-4" /> {t("custom_predictions.create")}
            </button>
          </div>

          {allRaces.length > 0 && (
            <div className="mt-3">
              <p className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider mb-1">
                {t("custom_predictions.gp_label")}
              </p>
              <select
                value={selectedRace?.id || ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedRace(allRaces.find((r: Race) => r.id === e.target.value) ?? null)
                }
                className="w-full bg-pk-surface border border-white/[0.08] rounded-lg p-2 text-pk-piste font-data text-sm focus:border-pk-info/50 focus:outline-none transition-colors"
                data-testid="race-selector"
              >
                {allRaces.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name.replace(" Grand Prix", "")}{" "}
                    {race.is_sprint_weekend ? "(Sprint)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto px-4 pt-4 space-y-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Info Card */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-info/[0.06] border border-pk-info/20 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-pk-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-pk-piste/80">{t("custom_predictions.info_text")}</p>
              <p className="font-data text-[0.5625rem] text-pk-titane mt-1">
                {t("custom_predictions.points_info")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* My Created Predictions */}
        <AnimatePresence>
          {myPredictions.length > 0 && (
            <motion.div variants={fadeUp}>
              <h2 className="font-display text-xs flex items-center gap-2 mb-3">
                <Edit3 className="w-4 h-4 text-pk-info" /> {t("custom_predictions.my_predictions")}
              </h2>
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                {myPredictions.map((pred: Prediction) => (
                  <motion.div key={pred.id} variants={fadeUp}>
                    <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-pk-piste">{pred.question}</p>
                          <p className="font-data text-[0.5625rem] text-pk-titane mt-1">
                            {pred.answer_type === "yes_no"
                              ? t("custom_predictions.types.yes_no")
                              : pred.answer_type === "choice"
                                ? t("custom_predictions.types.multiple")
                                : t("custom_predictions.types.free_text")}
                          </p>
                        </div>
                        {pred.correct_answer ? (
                          <div className="flex items-center gap-1 text-pk-emerald">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-data text-[0.5625rem]">
                              {t("custom_predictions.finished")}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedPrediction(pred)}
                            className="px-3 py-1.5 rounded-lg bg-pk-info/[0.1] border border-pk-info/30 text-pk-info font-display text-xs active:scale-[0.97] transition-transform"
                            data-testid={`set-answer-${pred.id}`}
                          >
                            {t("custom_predictions.set_answer")}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Predictions to Answer */}
        <motion.div variants={fadeUp}>
          <h2 className="font-display text-xs flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-pk-amber" />{" "}
            {t("custom_predictions.league_predictions", { count: otherPredictions.length })}
          </h2>
          {otherPredictions.length === 0 ? (
            <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-8 text-center">
              <MessageSquare className="w-10 h-10 text-pk-titane mx-auto mb-3" />
              <p className="text-sm text-pk-titane">{t("custom_predictions.no_predictions")}</p>
              <p className="font-data text-[0.5625rem] text-pk-titane mt-1">
                {t("custom_predictions.be_first")}
              </p>
            </div>
          ) : (
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {otherPredictions.map((pred: Prediction) => (
                <motion.div key={pred.id} variants={fadeUp}>
                  <PredictionCard prediction={pred} onAnswer={handleAnswer} userId={user?.id} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Create Modal */}
      {showCreateModal && selectedRace && league && (
        <CreatePredictionModal
          raceId={selectedRace.id}
          leagueId={league.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={refetchPredictions}
        />
      )}

      {selectedPrediction && (
        <SetCorrectAnswerModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
          onSubmit={handleSetCorrectAnswer}
        />
      )}
    </div>
  );
}
