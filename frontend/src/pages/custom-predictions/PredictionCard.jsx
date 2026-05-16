import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Clock, Send } from "lucide-react";

export default function PredictionCard({ prediction, onAnswer, userId }) {
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
