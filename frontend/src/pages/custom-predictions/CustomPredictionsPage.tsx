import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, X, HelpCircle, Users,
  MessageSquare, CheckCircle, Edit3
} from "lucide-react";
import PredictionCard from "./PredictionCard";
import SetCorrectAnswerModal from "./SetCorrectAnswerModal";
import { useCustomPredictionsData } from "./useCustomPredictionsData";

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

interface Choice {
  text: string;
  points: number;
}

interface Prediction {
  id: string;
  question: string;
  answer_type: string;
  multiple_choice?: boolean;
  choices?: Choice[];
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

  // Create form state
  const [question, setQuestion] = useState("");
  const [answerType, setAnswerType] = useState("yes_no");
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([{ text: "", points: 2 }, { text: "", points: 2 }]);
  const [creating, setCreating] = useState(false);

  // ── Data fetching (TanStack Query) ──────────────────────────────────
  const {
    loading,
    allRaces,
    defaultLeague,
    predictions,
    refetchPredictions,
  } = useCustomPredictionsData(leagueId, league, selectedRace);

  // Hydrate league and selectedRace from query data once
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (loading || hydratedRef.current) return;
    hydratedRef.current = true;
    if (defaultLeague) setLeague(defaultLeague);
    if (allRaces.length > 0) setSelectedRace(allRaces[0]);
  }, [loading, defaultLeague, allRaces]);

  const handleCreatePrediction = async () => {
    if (!question.trim()) { toast.error("Ajoute une question"); return; }
    if (answerType === "choice" && choices.filter(c => c.text.trim()).length < 2) {
      toast.error("Ajoute au moins 2 choix"); return;
    }
    setCreating(true);
    try {
      const payload = {
        race_id: selectedRace!.id,
        league_id: league!.id,
        question: question.trim(),
        answer_type: answerType,
        multiple_choice: multipleChoice,
        choices: answerType === "choice" ? choices.filter(c => c.text.trim()) : null
      };
      await apiClient.post("/custom-predictions", payload);
      toast.success("Pronostic créé !");
      setShowCreateModal(false);
      resetForm();
      refetchPredictions();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const handleAnswer = async (predictionId: string, answer: string | string[]) => {
    try {
      await apiClient.post(`/custom-predictions/${predictionId}/answer`, { answer });
      toast.success("Réponse enregistrée !");
      refetchPredictions();
    } catch (e: unknown) { toast.error("Erreur"); }
  };

  const handleSetCorrectAnswer = async (predictionId: string, correctAnswer: string | string[]) => {
    try {
      await apiClient.post(`/custom-predictions/${predictionId}/set-correct`, { correct_answer: correctAnswer });
      toast.success("Réponse correcte définie ! Points attribués.");
      setSelectedPrediction(null);
      refetchPredictions();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const resetForm = () => {
    setQuestion("");
    setAnswerType("yes_no");
    setMultipleChoice(false);
    setChoices([{ text: "", points: 2 }, { text: "", points: 2 }]);
  };

  const addChoice = () => { setChoices([...choices, { text: "", points: 2 }]); };
  const removeChoice = (index: number) => { if (choices.length > 2) setChoices(choices.filter((_: any, i: number) => i !== index)); };
  const updateChoice = (index: number, text: string) => { const nc = [...choices]; if (nc[index]) nc[index].text = text; setChoices(nc); };

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

  const myPredictions = predictions.filter((p: any) => p.created_by === user?.id);
  const otherPredictions = predictions.filter((p: any) => p.created_by !== user?.id);

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="custom-predictions-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-pink-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white hover:bg-white/10">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-500" />
                Pronos Perso
              </h1>
              {league && <p className="font-body text-xs text-gray-400">{league.name}</p>}
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="btn-racing" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Créer
            </Button>
          </div>

          {allRaces.length > 0 && (
            <div className="mt-3">
              <Label className="text-xs text-gray-400 uppercase font-heading mb-1 block">Grand Prix</Label>
              <select
                value={selectedRace?.id || ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedRace(allRaces.find((r: Race) => r.id === e.target.value) ?? null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-body focus:border-pink-500 focus:outline-none"
              >
                {allRaces.map((race: any) => (
                  <option key={race.id} value={race.id}>
                    {race.name.replace(" Grand Prix", "")} {race.is_sprint_weekend ? "🏃" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-body text-sm text-gray-300">
                  Crée des pronostics fun pour ta ligue ! Le créateur définit la bonne réponse après la course.
                </p>
                <p className="font-body text-xs text-gray-500 mt-1">+2 points pour chaque bonne réponse</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Created Predictions */}
        {myPredictions.length > 0 && (
          <div>
            <h2 className="font-heading text-sm uppercase text-cyan-400 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4" /> Mes pronostics créés
            </h2>
            <div className="space-y-3">
              {myPredictions.map((pred: any) => (
                <Card key={pred.id} className="game-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-body text-white">{pred.question}</p>
                        <p className="font-body text-xs text-gray-500 mt-1">
                          {pred.answer_type === "yes_no" ? "Oui/Non" :
                           pred.answer_type === "choice" ? "Choix multiple" : "Texte libre"}
                        </p>
                      </div>
                      {pred.correct_answer ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-body text-xs">Terminé</span>
                        </div>
                      ) : (
                        <Button onClick={() => setSelectedPrediction(pred)} size="sm" className="btn-gaming-blue">
                          Définir réponse
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Predictions to Answer */}
        <div>
          <h2 className="font-heading text-sm uppercase text-yellow-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Pronostics de la ligue ({otherPredictions.length})
          </h2>
          {otherPredictions.length === 0 ? (
            <Card className="game-card">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-body text-gray-400">Aucun pronostic pour le moment</p>
                <p className="font-body text-xs text-gray-500 mt-1">Sois le premier à créer un prono pour ta ligue !</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {otherPredictions.map((pred: any) => (
                <PredictionCard key={pred.id} prediction={pred} onAnswer={handleAnswer} userId={user?.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowCreateModal(false)}>
          <div className="bg-gray-900 rounded-lg border border-orange-500/30 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg uppercase text-orange-500">Créer un Pronostic</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="font-body text-gray-300">Question</Label>
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex: Qui finira devant, Hamilton ou Leclerc ?" className="mt-1 bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="font-body text-gray-300">Type de réponse</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[{ id: "yes_no", label: "Oui/Non" }, { id: "text", label: "Texte" }, { id: "choice", label: "Choix" }].map(type => (
                    <button key={type.id} onClick={() => setAnswerType(type.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${answerType === type.id ? "border-orange-500 bg-orange-500/20" : "border-gray-700 bg-gray-800"}`}>
                      <p className={`font-body text-sm ${answerType === type.id ? "text-white" : "text-gray-400"}`}>{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              {answerType === "choice" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-body text-gray-300">Options</Label>
                    <div className="flex items-center gap-2">
                      <Label className="font-body text-xs text-gray-500">Multi-réponse</Label>
                      <Switch checked={multipleChoice} onCheckedChange={setMultipleChoice} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {choices.map((choice, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={choice.text} onChange={(e) => updateChoice(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 bg-gray-800 border-gray-700" />
                        {choices.length > 2 && (
                          <Button variant="ghost" size="icon" onClick={() => removeChoice(i)}><X className="w-4 h-4 text-red-400" /></Button>
                        )}
                      </div>
                    ))}
                    {choices.length < 6 && (
                      <Button variant="outline" size="sm" onClick={addChoice} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-1" /> Ajouter une option
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <Button onClick={handleCreatePrediction} disabled={creating} className="w-full btn-gaming h-12">
                {creating ? "Création..." : "Créer le pronostic"}
              </Button>
            </div>
          </div>
        </div>
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
