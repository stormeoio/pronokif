import { useState, useEffect, useRef } from "react";
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
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import PredictionCard from "./PredictionCard";
import SetCorrectAnswerModal from "./SetCorrectAnswerModal";
import { CreatePredictionModal } from "./CreatePredictionModal";
import { useCustomPredictionsData } from "./useCustomPredictionsData";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

export default function CustomPredictionsPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  // ── Data fetching (TanStack Query) ──────────────────────────────────
  const { loading, allRaces, defaultLeague, predictions, refetchPredictions } =
    useCustomPredictionsData(leagueId, league, selectedRace);

  // Hydrate league and selectedRace from query data once
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
      toast.success("Réponse enregistrée !");
      refetchPredictions();
    } catch {
      toast.error("Erreur");
    }
  };

  const handleSetCorrectAnswer = async (predictionId: string, correctAnswer: string | string[]) => {
    try {
      await api.customPredictions.setCorrect(predictionId, { correct_answer: correctAnswer });
      toast.success("Réponse correcte définie ! Points attribués.");
      setSelectedPrediction(null);
      refetchPredictions();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-arcade rounded" />
          <div className="h-32 skeleton-arcade rounded-md" />
        </div>
      </div>
    );
  }

  const myPredictions = predictions.filter((p: Prediction) => p.created_by === user?.id);
  const otherPredictions = predictions.filter((p: Prediction) => p.created_by !== user?.id);

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="custom-predictions-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-pink-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-500" />
                Pronos Perso
              </h1>
              {league && <p className="font-body text-xs text-gray-400">{league.name}</p>}
            </div>
            <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
              <Button onClick={() => setShowCreateModal(true)} className="btn-racing" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Créer
              </Button>
            </motion.div>
          </div>

          {allRaces.length > 0 && (
            <div className="mt-3">
              <Label className="text-xs text-gray-400 uppercase font-heading mb-1 block">
                Grand Prix
              </Label>
              <select
                value={selectedRace?.id || ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedRace(allRaces.find((r: Race) => r.id === e.target.value) ?? null)
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-body focus:border-pink-500 focus:outline-none"
              >
                {allRaces.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name.replace(" Grand Prix", "")} {race.is_sprint_weekend ? "🏃" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto p-4 space-y-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}
      >
        {/* Info Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.97 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
        >
          <Card className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/30 glass-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-body text-sm text-gray-300">
                    Crée des pronostics fun pour ta ligue ! Le créateur définit la bonne réponse après
                    la course.
                  </p>
                  <p className="font-body text-xs text-gray-500 mt-1">
                    +2 points pour chaque bonne réponse
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Created Predictions */}
        <AnimatePresence>
          {myPredictions.length > 0 && (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 15 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <h2 className="font-heading text-sm uppercase text-cyan-400 mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4" /> Mes pronostics créés
              </h2>
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
              >
                {myPredictions.map((pred: Prediction) => (
                  <motion.div
                    key={pred.id}
                    variants={{
                      hidden: { opacity: 0, x: -15 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    whileHover={{ scale: 1.01, x: 4 }}
                  >
                    <Card className="game-card glass-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-body text-white">{pred.question}</p>
                            <p className="font-body text-xs text-gray-500 mt-1">
                              {pred.answer_type === "yes_no"
                                ? "Oui/Non"
                                : pred.answer_type === "choice"
                                  ? "Choix multiple"
                                  : "Texte libre"}
                            </p>
                          </div>
                          {pred.correct_answer ? (
                            <motion.div
                              className="flex items-center gap-1 text-green-400"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring" }}
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span className="font-body text-xs">Terminé</span>
                            </motion.div>
                          ) : (
                            <Button
                              onClick={() => setSelectedPrediction(pred)}
                              size="sm"
                              className="btn-gaming-blue"
                            >
                              Définir réponse
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Predictions to Answer */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <h2 className="font-heading text-sm uppercase text-yellow-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Pronostics de la ligue ({otherPredictions.length})
          </h2>
          {otherPredictions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" }}
            >
              <Card className="game-card glass-card">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="font-body text-gray-400">Aucun pronostic pour le moment</p>
                  <p className="font-body text-xs text-gray-500 mt-1">
                    Sois le premier à créer un prono pour ta ligue !
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
            >
              {otherPredictions.map((pred: Prediction) => (
                <motion.div
                  key={pred.id}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <PredictionCard
                    prediction={pred}
                    onAnswer={handleAnswer}
                    userId={user?.id}
                  />
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
