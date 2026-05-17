import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { api } from "@/lib/api";

interface Choice {
  text: string;
  points: number;
}

interface CreatePredictionModalProps {
  raceId: string;
  leagueId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePredictionModal({
  raceId,
  leagueId,
  onClose,
  onCreated,
}: CreatePredictionModalProps) {
  const [question, setQuestion] = useState("");
  const [answerType, setAnswerType] = useState("yes_no");
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([
    { text: "", points: 2 },
    { text: "", points: 2 },
  ]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!question.trim()) {
      toast.error("Ajoute une question");
      return;
    }
    if (answerType === "choice" && choices.filter((c) => c.text.trim()).length < 2) {
      toast.error("Ajoute au moins 2 choix");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        race_id: raceId,
        league_id: leagueId,
        question: question.trim(),
        answer_type: answerType,
        multiple_choice: multipleChoice,
        choices: answerType === "choice" ? choices.filter((c) => c.text.trim()) : null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await api.customPredictions.create(payload as any);
      toast.success("Pronostic créé !");
      onCreated();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const addChoice = () => {
    setChoices([...choices, { text: "", points: 2 }]);
  };
  const removeChoice = (index: number) => {
    if (choices.length > 2) setChoices(choices.filter((_, i) => i !== index));
  };
  const updateChoice = (index: number, text: string) => {
    const nc = [...choices];
    if (nc[index]) nc[index].text = text;
    setChoices(nc);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-900 rounded-lg border border-orange-500/30 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg uppercase text-orange-500">Créer un Pronostic</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <Label className="font-body text-gray-300">Question</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qui finira devant, Hamilton ou Leclerc ?"
              className="mt-1 bg-gray-800 border-gray-700"
            />
          </div>
          <div>
            <Label className="font-body text-gray-300">Type de réponse</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { id: "yes_no", label: "Oui/Non" },
                { id: "text", label: "Texte" },
                { id: "choice", label: "Choix" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setAnswerType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${answerType === type.id ? "border-orange-500 bg-orange-500/20" : "border-gray-700 bg-gray-800"}`}
                >
                  <p
                    className={`font-body text-sm ${answerType === type.id ? "text-white" : "text-gray-400"}`}
                  >
                    {type.label}
                  </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addChoice}
                    className="w-full border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Ajouter une option
                  </Button>
                )}
              </div>
            </div>
          )}
          <Button onClick={handleCreate} disabled={creating} className="w-full btn-gaming h-12">
            {creating ? "Création..." : "Créer le pronostic"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
