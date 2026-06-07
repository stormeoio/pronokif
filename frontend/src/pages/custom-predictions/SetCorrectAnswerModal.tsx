/**
 * SetCorrectAnswerModal — Modal for setting correct answer on custom prediction.
 * Broadcast Premium: pk-surface modal, pk-emerald theme, native inputs.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { haptic } from "@/lib/haptics";

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
}

interface SetCorrectAnswerModalProps {
  prediction: Prediction;
  onClose: () => void;
  onSubmit: (predictionId: string, correctAnswer: string | string[]) => void;
}

export default function SetCorrectAnswerModal({
  prediction,
  onClose,
  onSubmit,
}: SetCorrectAnswerModalProps) {
  const { t } = useTranslation();
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);

  const handleSubmit = () => {
    haptic("medium");
    if (prediction.answer_type === "choice") {
      onSubmit(
        prediction.id,
        prediction.multiple_choice ? selectedChoices : selectedChoices[0] || "",
      );
    } else {
      onSubmit(prediction.id, correctAnswer);
    }
  };

  const toggleChoice = (choiceText: string) => {
    haptic("light");
    if (prediction.multiple_choice) {
      if (selectedChoices.includes(choiceText)) {
        setSelectedChoices(selectedChoices.filter((c) => c !== choiceText));
      } else {
        setSelectedChoices([...selectedChoices, choiceText]);
      }
    } else {
      setSelectedChoices([choiceText]);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-pk-anthracite rounded-lg border border-pk-emerald/20 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-display text-sm text-pk-emerald">
            {t("custom_predictions.correct_answer")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-pk-titane hover:text-pk-piste hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-pk-piste/80">{prediction.question}</p>

          {prediction.answer_type === "yes_no" && (
            <div className="flex gap-2">
              <button
                onClick={() => setCorrectAnswer("yes")}
                className={`flex-1 py-2.5 rounded-lg font-display text-sm transition-all ${
                  correctAnswer === "yes"
                    ? "bg-pk-emerald/20 border border-pk-emerald/30 text-pk-emerald"
                    : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
                }`}
              >
                {t("custom_predictions.yes")}
              </button>
              <button
                onClick={() => setCorrectAnswer("no")}
                className={`flex-1 py-2.5 rounded-lg font-display text-sm transition-all ${
                  correctAnswer === "no"
                    ? "bg-pk-red-subtle border border-pk-red/20 text-pk-red"
                    : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
                }`}
              >
                {t("custom_predictions.no")}
              </button>
            </div>
          )}

          {prediction.answer_type === "text" && (
            <input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder={t("custom_predictions.your_answer_placeholder")}
              className="w-full bg-pk-surface border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-pk-piste placeholder:text-pk-titane/50 focus:border-pk-emerald/50 focus:outline-none transition-colors"
            />
          )}

          {prediction.answer_type === "choice" && prediction.choices && (
            <div className="space-y-1.5">
              {prediction.choices.map((choice, i) => (
                <button
                  key={i}
                  onClick={() => toggleChoice(choice.text)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedChoices.includes(choice.text)
                      ? "border-pk-emerald/30 bg-pk-emerald/[0.08]"
                      : "border-white/[0.08] bg-pk-surface hover:border-white/[0.15]"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      selectedChoices.includes(choice.text) ? "text-white" : "text-pk-titane"
                    }`}
                  >
                    {choice.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/[0.08] text-pk-titane font-display text-xs hover:text-pk-piste hover:border-white/[0.15] transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                (prediction.answer_type === "choice" && selectedChoices.length === 0) ||
                (prediction.answer_type !== "choice" && !correctAnswer)
              }
              className="flex-1 py-2.5 rounded-lg bg-pk-emerald text-white font-display text-xs active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="confirm-correct-answer-btn"
            >
              <CheckCircle className="w-4 h-4" />
              {t("custom_predictions.submit_answer")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
