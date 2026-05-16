import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { 
  ChevronLeft, Plus, Check, X, HelpCircle, Users, Trophy,
  MessageSquare, CheckCircle, Clock, Edit3, Send
} from "lucide-react";

export default function CustomPredictionsPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState(null);
  const [allRaces, setAllRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  
  // Create form state
  const [question, setQuestion] = useState("");
  const [answerType, setAnswerType] = useState("yes_no"); // yes_no, text, choice
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [choices, setChoices] = useState([{ text: "", points: 2 }, { text: "", points: 2 }]);
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [leaguesRes, racesRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/races")
      ]);

      const currentLeague = leaguesRes.data.find(l => l.id === leagueId) || leaguesRes.data[0];
      setLeague(currentLeague);
      
      // Filter races that are upcoming or in progress
      const upcomingRaces = racesRes.data.filter(r => r.status !== "finished");
      setAllRaces(upcomingRaces);
      
      // Default to next race
      if (upcomingRaces.length > 0) {
        setSelectedRace(upcomingRaces[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  // Fetch predictions when race or league changes
  const fetchPredictions = useCallback(async () => {
    if (!league || !selectedRace) return;
    
    try {
      const predsRes = await apiClient.get(`/custom-predictions/to-answer/${league.id}/${selectedRace.id}`);
      setPredictions(predsRes.data);
    } catch (e) {
      console.error(e);
      setPredictions([]);
    }
  }, [league, selectedRace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const handleCreatePrediction = async () => {
    if (!question.trim()) {
      toast.error("Ajoute une question");
      return;
    }

    if (answerType === "choice" && choices.filter(c => c.text.trim()).length < 2) {
      toast.error("Ajoute au moins 2 choix");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        race_id: selectedRace.id,
        league_id: league.id,
        question: question.trim(),
        answer_type: answerType,
        multiple_choice: multipleChoice,
        choices: answerType === "choice" ? choices.filter(c => c.text.trim()) : null
      };

      await apiClient.post("/custom-predictions", payload);
      toast.success("Pronostic créé !");
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const handleAnswer = async (predictionId, answer) => {
    try {
      await apiClient.post(`/custom-predictions/${predictionId}/answer`, { answer });
      toast.success("Réponse enregistrée !");
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const handleSetCorrectAnswer = async (predictionId, correctAnswer) => {
    try {
      await apiClient.post(`/custom-predictions/${predictionId}/set-correct`, { correct_answer: correctAnswer });
      toast.success("Réponse correcte définie ! Points attribués.");
      setSelectedPrediction(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  const resetForm = () => {
    setQuestion("");
    setAnswerType("yes_no");
    setMultipleChoice(false);
    setChoices([{ text: "", points: 2 }, { text: "", points: 2 }]);
  };

  const addChoice = () => {
    setChoices([...choices, { text: "", points: 2 }]);
  };

  const removeChoice = (index) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const updateChoice = (index, text) => {
    const newChoices = [...choices];
    newChoices[index].text = text;
    setChoices(newChoices);
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

  const myPredictions = predictions.filter(p => p.created_by === user?.id);
  const otherPredictions = predictions.filter(p => p.created_by !== user?.id);

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
              {league && (
                <p className="font-body text-xs text-gray-400">
                  {league.name}
                </p>
              )}
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="btn-racing" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Créer
            </Button>
          </div>
          
          {/* Race Selector */}
          {allRaces.length > 0 && (
            <div className="mt-3">
              <Label className="text-xs text-gray-400 uppercase font-heading mb-1 block">Grand Prix</Label>
              <select
                value={selectedRace?.id || ""}
                onChange={(e) => {
                  const race = allRaces.find(r => r.id === e.target.value);
                  setSelectedRace(race);
                }}
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
                <p className="font-body text-xs text-gray-500 mt-1">
                  +2 points pour chaque bonne réponse
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Created Predictions */}
        {myPredictions.length > 0 && (
          <div>
            <h2 className="font-heading text-sm uppercase text-cyan-400 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Mes pronostics créés
            </h2>
            <div className="space-y-3">
              {myPredictions.map(pred => (
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
              ))}
            </div>
          </div>
        )}

        {/* Predictions to Answer */}
        <div>
          <h2 className="font-heading text-sm uppercase text-yellow-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pronostics de la ligue ({otherPredictions.length})
          </h2>
          
          {otherPredictions.length === 0 ? (
            <Card className="game-card">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-body text-gray-400">Aucun pronostic pour le moment</p>
                <p className="font-body text-xs text-gray-500 mt-1">
                  Sois le premier à créer un prono pour ta ligue !
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {otherPredictions.map(pred => (
                <PredictionCard 
                  key={pred.id} 
                  prediction={pred} 
                  onAnswer={handleAnswer}
                  userId={user?.id}
                />
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
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Question */}
              <div>
                <Label className="font-body text-gray-300">Question</Label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Qui finira devant, Hamilton ou Leclerc ?"
                  className="mt-1 bg-gray-800 border-gray-700"
                />
              </div>

              {/* Answer Type */}
              <div>
                <Label className="font-body text-gray-300">Type de réponse</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { id: "yes_no", label: "Oui/Non" },
                    { id: "text", label: "Texte" },
                    { id: "choice", label: "Choix" }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setAnswerType(type.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        answerType === type.id 
                          ? "border-orange-500 bg-orange-500/20" 
                          : "border-gray-700 bg-gray-800"
                      }`}
                    >
                      <p className={`font-body text-sm ${answerType === type.id ? "text-white" : "text-gray-400"}`}>
                        {type.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Choices (if choice type) */}
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
                        <Input
                          value={choice.text}
                          onChange={(e) => updateChoice(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 bg-gray-800 border-gray-700"
                        />
                        {choices.length > 2 && (
                          <Button variant="ghost" size="icon" onClick={() => removeChoice(i)}>
                            <X className="w-4 h-4 text-red-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {choices.length < 6 && (
                      <Button variant="outline" size="sm" onClick={addChoice} className="w-full border-dashed">
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter une option
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button 
                onClick={handleCreatePrediction}
                disabled={creating}
                className="w-full btn-gaming h-12"
              >
                {creating ? "Création..." : "Créer le pronostic"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Set Correct Answer Modal */}
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

// Prediction Card Component
function PredictionCard({ prediction, onAnswer, userId }) {
  const [answer, setAnswer] = useState(prediction.user_answer || "");
  const [selectedChoices, setSelectedChoices] = useState(
    prediction.user_answer ? (Array.isArray(prediction.user_answer) ? prediction.user_answer : [prediction.user_answer]) : []
  );

  const hasAnswered = prediction.has_answered;
  const isResolved = !!prediction.correct_answer;

  const handleSubmit = () => {
    if (prediction.answer_type === "choice") {
      onAnswer(prediction.id, prediction.multiple_choice ? selectedChoices : selectedChoices[0]);
    } else {
      onAnswer(prediction.id, answer);
    }
  };

  const toggleChoice = (choiceText) => {
    if (prediction.multiple_choice) {
      if (selectedChoices.includes(choiceText)) {
        setSelectedChoices(selectedChoices.filter(c => c !== choiceText));
      } else {
        setSelectedChoices([...selectedChoices, choiceText]);
      }
    } else {
      setSelectedChoices([choiceText]);
    }
  };

  return (
    <Card className={`game-card ${isResolved ? 'border-green-500/30' : ''}`}>
      <CardContent className="p-4">
        <p className="font-body text-white mb-3">{prediction.question}</p>
        
        {isResolved ? (
          <div className="space-y-2">
            <p className="font-body text-xs text-gray-500">Réponse correcte:</p>
            <p className="font-heading text-green-400">{prediction.correct_answer}</p>
            {hasAnswered && (
              <p className={`font-body text-xs ${
                prediction.user_answer === prediction.correct_answer ? "text-green-400" : "text-red-400"
              }`}>
                Ta réponse: {prediction.user_answer} 
                {prediction.user_answer === prediction.correct_answer ? " ✓ +2 pts" : " ✗"}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {prediction.answer_type === "yes_no" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setAnswer("Oui")}
                  variant={answer === "Oui" ? "default" : "outline"}
                  className={`flex-1 ${answer === "Oui" ? "btn-gaming" : ""}`}
                  disabled={hasAnswered}
                >
                  Oui
                </Button>
                <Button
                  onClick={() => setAnswer("Non")}
                  variant={answer === "Non" ? "default" : "outline"}
                  className={`flex-1 ${answer === "Non" ? "btn-gaming" : ""}`}
                  disabled={hasAnswered}
                >
                  Non
                </Button>
              </div>
            )}

            {prediction.answer_type === "text" && (
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Ta réponse..."
                className="bg-gray-800 border-gray-700"
                disabled={hasAnswered}
              />
            )}

            {prediction.answer_type === "choice" && prediction.choices && (
              <div className="space-y-2">
                {prediction.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => !hasAnswered && toggleChoice(choice.text)}
                    disabled={hasAnswered}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedChoices.includes(choice.text)
                        ? "border-orange-500 bg-orange-500/20"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    <span className={`font-body text-sm ${
                      selectedChoices.includes(choice.text) ? "text-white" : "text-gray-400"
                    }`}>
                      {choice.text}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!hasAnswered ? (
              <Button 
                onClick={handleSubmit}
                disabled={
                  (prediction.answer_type === "choice" && selectedChoices.length === 0) ||
                  (prediction.answer_type !== "choice" && !answer)
                }
                className="w-full btn-gaming-blue"
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer ma réponse
              </Button>
            ) : (
              <p className="font-body text-xs text-cyan-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Réponse enregistrée - En attente du résultat
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Set Correct Answer Modal
function SetCorrectAnswerModal({ prediction, onClose, onSubmit }) {
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedChoices, setSelectedChoices] = useState([]);

  const handleSubmit = () => {
    if (prediction.answer_type === "choice") {
      onSubmit(prediction.id, prediction.multiple_choice ? selectedChoices : selectedChoices[0]);
    } else {
      onSubmit(prediction.id, correctAnswer);
    }
  };

  const toggleChoice = (choiceText) => {
    if (prediction.multiple_choice) {
      if (selectedChoices.includes(choiceText)) {
        setSelectedChoices(selectedChoices.filter(c => c !== choiceText));
      } else {
        setSelectedChoices([...selectedChoices, choiceText]);
      }
    } else {
      setSelectedChoices([choiceText]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="bg-gray-900 rounded-lg border border-green-500/30 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-heading text-lg uppercase text-green-400">Définir la bonne réponse</h2>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="font-body text-gray-300">{prediction.question}</p>
          
          {prediction.answer_type === "yes_no" && (
            <div className="flex gap-2">
              <Button
                onClick={() => setCorrectAnswer("Oui")}
                variant={correctAnswer === "Oui" ? "default" : "outline"}
                className={`flex-1 ${correctAnswer === "Oui" ? "btn-gaming" : ""}`}
              >
                Oui
              </Button>
              <Button
                onClick={() => setCorrectAnswer("Non")}
                variant={correctAnswer === "Non" ? "default" : "outline"}
                className={`flex-1 ${correctAnswer === "Non" ? "btn-gaming" : ""}`}
              >
                Non
              </Button>
            </div>
          )}

          {prediction.answer_type === "text" && (
            <Input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="La bonne réponse..."
              className="bg-gray-800 border-gray-700"
            />
          )}

          {prediction.answer_type === "choice" && prediction.choices && (
            <div className="space-y-2">
              {prediction.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => toggleChoice(choice.text)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedChoices.includes(choice.text)
                      ? "border-green-500 bg-green-500/20"
                      : "border-gray-700 bg-gray-800"
                  }`}
                >
                  <span className={`font-body text-sm ${
                    selectedChoices.includes(choice.text) ? "text-white" : "text-gray-400"
                  }`}>
                    {choice.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={
                (prediction.answer_type === "choice" && selectedChoices.length === 0) ||
                (prediction.answer_type !== "choice" && !correctAnswer)
              }
              className="flex-1 btn-gaming"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Valider
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
