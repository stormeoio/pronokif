/**
 * PredictionCard — Individual custom prediction card with voting.
 * Broadcast Premium: pk-surface card, pk-red/emerald states, native inputs.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Send } from "lucide-react";
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
  correct_answer?: string;
  user_answer?: string | string[];
  has_answered?: boolean;
}

interface PredictionCardProps {
  prediction: Prediction;
  onAnswer: (predictionId: string, answer: string | string[]) => void;
  userId?: string;
}

export default function PredictionCard({ prediction, onAnswer }: PredictionCardProps) {
  const [answer, setAnswer] = useState<string>(
    typeof prediction.user_answer === "string" ? prediction.user_answer : "",
  );
  const [selectedChoices, setSelectedChoices] = useState<string[]>(
    prediction.user_answer
      ? Array.isArray(prediction.user_answer)
        ? prediction.user_answer
        : [prediction.user_answer]
      : [],
  );

  const hasAnswered = prediction.has_answered;
  const isResolved = !!prediction.correct_answer;

  const handleSubmit = () => {
    haptic("medium");
    if (prediction.answer_type === "choice") {
      onAnswer(
        prediction.id,
        prediction.multiple_choice ? selectedChoices : selectedChoices[0] || "",
      );
    } else {
      onAnswer(prediction.id, answer);
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`bg-pk-surface border rounded-lg p-4 ${
          isResolved ? "border-pk-emerald/20" : "border-white/[0.08]"
        }`}
      >
        <p className="text-sm text-pk-piste mb-3">{prediction.question}</p>

        {isResolved ? (
          <div className="space-y-2">
            <p className="font-data text-[0.5625rem] text-pk-titane">Bonne reponse :</p>
            <p className="font-display text-sm text-pk-emerald">{prediction.correct_answer}</p>
            {hasAnswered && (
              <p
                className={`font-data text-[0.5625rem] ${
                  prediction.user_answer === prediction.correct_answer
                    ? "text-pk-emerald"
                    : "text-pk-red"
                }`}
              >
                Ta reponse : {prediction.user_answer}
                {prediction.user_answer === prediction.correct_answer ? " +2 pts" : ""}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {prediction.answer_type === "yes_no" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setAnswer("Oui")}
                  disabled={hasAnswered}
                  className={`flex-1 py-2 rounded-lg font-display text-sm transition-all ${
                    answer === "Oui"
                      ? "bg-pk-emerald/20 border border-pk-emerald/30 text-pk-emerald"
                      : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
                  } disabled:opacity-40`}
                >
                  Oui
                </button>
                <button
                  onClick={() => setAnswer("Non")}
                  disabled={hasAnswered}
                  className={`flex-1 py-2 rounded-lg font-display text-sm transition-all ${
                    answer === "Non"
                      ? "bg-pk-red-subtle border border-pk-red/20 text-pk-red"
                      : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
                  } disabled:opacity-40`}
                >
                  Non
                </button>
              </div>
            )}

            {prediction.answer_type === "text" && (
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Ta reponse..."
                className="w-full bg-pk-anthracite border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-pk-piste placeholder:text-pk-titane/50 focus:border-pk-info/50 focus:outline-none transition-colors disabled:opacity-40"
                disabled={hasAnswered}
              />
            )}

            {prediction.answer_type === "choice" && prediction.choices && (
              <div className="space-y-1.5">
                {prediction.choices.map((choice, i) => (
                  <motion.button
                    key={i}
                    onClick={() => !hasAnswered && toggleChoice(choice.text)}
                    disabled={hasAnswered}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedChoices.includes(choice.text)
                        ? "border-pk-red/30 bg-pk-red-subtle"
                        : "border-white/[0.08] bg-pk-anthracite hover:border-white/[0.15]"
                    } disabled:opacity-40`}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span
                      className={`text-sm ${
                        selectedChoices.includes(choice.text) ? "text-white" : "text-pk-titane"
                      }`}
                    >
                      {choice.text}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {!hasAnswered ? (
              <button
                onClick={handleSubmit}
                disabled={
                  (prediction.answer_type === "choice" && selectedChoices.length === 0) ||
                  (prediction.answer_type !== "choice" && !answer)
                }
                className="w-full h-10 rounded-lg bg-pk-info text-white font-display text-xs active:scale-[0.97] transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid={`submit-answer-${prediction.id}`}
              >
                <Send className="w-4 h-4" />
                Envoyer ma reponse
              </button>
            ) : (
              <p className="font-data text-[0.5625rem] text-pk-info flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Reponse enregistree - En attente du resultat
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
