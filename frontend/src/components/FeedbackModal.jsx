import { useState } from "react";
import { apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { 
  X, HelpCircle, Bug, Lightbulb, MessageSquare, Send, Loader2, CheckCircle
} from "lucide-react";

const CATEGORIES = [
  { id: "bug", label: "Bug", icon: Bug, color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500/50" },
  { id: "suggestion", label: "Suggestion", icon: Lightbulb, color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  { id: "feedback", label: "Feedback", icon: MessageSquare, color: "text-cyan-400", bgColor: "bg-cyan-500/20", borderColor: "border-cyan-500/50" }
];

export default function FeedbackModal({ isOpen, onClose }) {
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await apiClient.post("/feedback", { category, message: message.trim() });
      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setMessage("");
        setCategory("feedback");
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" data-testid="feedback-modal">
      <div className="w-full max-w-lg card-arcade overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600/30 to-transparent p-4 border-b border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-heading text-lg text-white uppercase tracking-tight">
                  Aider l'administrateur
                </h2>
                <p className="font-body text-xs text-gray-400">Votre avis compte !</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              data-testid="close-feedback-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sent ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="font-heading text-xl text-green-400 uppercase mb-2">Merci !</h3>
            <p className="font-body text-gray-400">
              Votre message a été envoyé à l'administrateur.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Info Text */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="font-body text-sm text-gray-300">
                Aidez-moi à améliorer l'application ! Faites-moi part de vos 
                <span className="text-cyan-400"> retours d'expérience</span>, des 
                <span className="text-red-400"> problèmes rencontrés</span> et de vos 
                <span className="text-yellow-400"> suggestions</span>.
              </p>
            </div>

            {/* Category Selection */}
            <div>
              <label className="font-body text-sm text-gray-400 mb-2 block">Catégorie</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? `${cat.bgColor} ${cat.borderColor}` 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      data-testid={`category-${cat.id}`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? cat.color : 'text-gray-500'}`} />
                      <p className={`font-body text-xs ${isSelected ? cat.color : 'text-gray-400'}`}>
                        {cat.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="font-body text-sm text-gray-400 mb-2 block">Votre message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === "bug" 
                    ? "Décrivez le problème rencontré..." 
                    : category === "suggestion"
                    ? "Quelle fonctionnalité aimeriez-vous voir ?"
                    : "Partagez votre expérience..."
                }
                maxLength={2000}
                rows={5}
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 
                          focus:border-cyan-500 focus:ring-cyan-500/30 resize-none"
                data-testid="feedback-message"
              />
              <p className="font-body text-xs text-gray-500 mt-1 text-right">
                {message.length}/2000 caractères
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!message.trim() || sending}
              className="btn-racing w-full h-12"
              data-testid="submit-feedback"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Envoyer mon message
                </>
              )}
            </Button>
          </form>
        )}

        <div className="h-2 bg-kerb-stripe" />
      </div>
    </div>
  );
}
