import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CheckCircle } from "lucide-react";

export default function SetCorrectAnswerModal({ prediction, onClose, onSubmit }) {
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
