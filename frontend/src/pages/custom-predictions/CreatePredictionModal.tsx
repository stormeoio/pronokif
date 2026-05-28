/**
 * CreatePredictionModal — Modal to create custom predictions.
 * Broadcast Premium: pk-surface modal, pk-red CTA, native inputs.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";

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
      await api.customPredictions.create(payload);
      toast.success("Prono cree !");
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
        className="bg-pk-anthracite rounded-lg border border-white/[0.08] w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-pk-anthracite p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Creer un prono</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-pk-titane hover:text-pk-piste hover:bg-white/[0.04] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Question */}
          <div>
            <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-1">
              Question
            </p>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qui finira devant, Hamilton ou Leclerc ?"
              className="w-full bg-pk-surface border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-pk-piste placeholder:text-pk-titane/50 focus:border-pk-info/50 focus:outline-none transition-colors"
              data-testid="prediction-question-input"
            />
          </div>

          {/* Answer Type */}
          <div>
            <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-2">
              Type de reponse
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "yes_no", label: "Oui/Non" },
                { id: "text", label: "Texte" },
                { id: "choice", label: "Choix" },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    haptic("light");
                    setAnswerType(type.id);
                  }}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    answerType === type.id
                      ? "border-pk-red/30 bg-pk-red-subtle"
                      : "border-white/[0.08] bg-pk-surface hover:border-white/[0.15]"
                  }`}
                  data-testid={`type-${type.id}`}
                >
                  <span
                    className={`text-sm ${answerType === type.id ? "text-white" : "text-pk-titane"}`}
                  >
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Choices */}
          {answerType === "choice" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider">
                  Options
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="font-data text-[0.5625rem] text-pk-titane">Multi-reponse</span>
                  <button
                    onClick={() => setMultipleChoice(!multipleChoice)}
                    className={`w-8 h-4 rounded-full transition-colors ${
                      multipleChoice ? "bg-pk-red" : "bg-white/[0.08]"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        multipleChoice ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
              <div className="space-y-2">
                {choices.map((choice, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={choice.text}
                      onChange={(e) => updateChoice(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-pk-surface border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-pk-piste placeholder:text-pk-titane/50 focus:border-pk-info/50 focus:outline-none transition-colors"
                    />
                    {choices.length > 2 && (
                      <button
                        onClick={() => removeChoice(i)}
                        className="p-2 rounded-lg text-pk-red hover:bg-pk-red-subtle transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {choices.length < 6 && (
                  <button
                    onClick={addChoice}
                    className="w-full py-2 rounded-lg border border-dashed border-white/[0.12] text-pk-titane font-data text-[0.5625rem] hover:border-white/[0.2] hover:text-pk-piste transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="submit-prediction-btn"
          >
            {creating ? "Creation..." : "Creer le prono"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
