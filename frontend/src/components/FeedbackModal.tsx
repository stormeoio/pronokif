/**
 * FeedbackModal — User feedback submission modal.
 * Broadcast Premium: pk-anthracite modal, pk-red CTA, native inputs.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  X,
  HelpCircle,
  Bug,
  Lightbulb,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  {
    id: "bug",
    labelKey: "feedback.categories.bug",
    icon: Bug,
    color: "text-pk-red",
    bgColor: "bg-pk-red-subtle",
    borderColor: "border-pk-red/30",
  },
  {
    id: "suggestion",
    labelKey: "feedback.categories.suggestion",
    icon: Lightbulb,
    color: "text-pk-amber",
    bgColor: "bg-pk-amber/[0.1]",
    borderColor: "border-pk-amber/30",
  },
  {
    id: "feedback",
    labelKey: "feedback.categories.feedback",
    icon: MessageSquare,
    color: "text-pk-info",
    bgColor: "bg-pk-info/[0.1]",
    borderColor: "border-pk-info/30",
  },
];

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || sending) return;

    if (trimmedMessage.length > 2000) {
      toast.error(t("feedback.max_length_error"));
      return;
    }

    haptic("medium");
    setSending(true);
    try {
      await api.feedback.send({
        type: category,
        message: trimmedMessage,
      });

      setSent(true);
      toast.success(t("feedback.success_toast"));
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: unknown) {
      console.error("Feedback submit error:", error);
      const err = error as { response?: { data?: { detail?: string } } };
      const errorMessage = err.response?.data?.detail || t("feedback.error_toast");
      toast.error(errorMessage);
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setSending(false);
    setMessage("");
    setCategory("feedback");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      data-testid="feedback-modal"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-lg bg-pk-anthracite rounded-lg border border-white/[0.08] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pk-info/[0.1] rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-pk-info" />
            </div>
            <div>
              <h2 className="font-display text-sm text-pk-info">{t("feedback.title")}</h2>
              <p className="font-data text-[0.5625rem] text-pk-titane">{t("feedback.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-pk-titane hover:text-pk-piste hover:bg-white/[0.04] transition-colors"
            data-testid="close-feedback-modal"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-pk-emerald/[0.1] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-pk-emerald" />
            </div>
            <h3 className="font-display text-lg text-pk-emerald mb-2">
              {t("feedback.thanks_title")}
            </h3>
            <p className="text-sm text-pk-titane">{t("feedback.thanks_message")}</p>
          </div>
        ) : (
          /* Form */
          <div className="p-4 space-y-4">
            {/* Info Text */}
            <div className="bg-pk-info/[0.06] border border-pk-info/20 rounded-lg p-4">
              <p className="text-sm text-pk-piste/80">
                {t("feedback.intro_prefix")}
                <span className="text-pk-info">{t("feedback.intro_feedback")}</span>,
                <span className="text-pk-red">{t("feedback.intro_bugs")}</span>,
                <span className="text-pk-amber">{t("feedback.intro_suggestions")}</span>.
              </p>
            </div>

            {/* Category Selection */}
            <div>
              <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-2">
                {t("feedback.category_label")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        haptic("light");
                        setCategory(cat.id);
                      }}
                      className={`p-3 rounded-lg border transition-all ${
                        isSelected
                          ? `${cat.bgColor} ${cat.borderColor}`
                          : "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.15]"
                      }`}
                      data-testid={`category-${cat.id}`}
                    >
                      <Icon
                        className={`w-5 h-5 mx-auto mb-1 ${isSelected ? cat.color : "text-pk-titane"}`}
                      />
                      <p
                        className={`font-data text-[0.5625rem] text-center ${isSelected ? cat.color : "text-pk-titane"}`}
                      >
                        {t(cat.labelKey)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div>
              <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-2">
                {t("feedback.message_label")}
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === "bug"
                    ? t("feedback.placeholders.bug")
                    : category === "suggestion"
                      ? t("feedback.placeholders.suggestion")
                      : t("feedback.placeholders.feedback")
                }
                maxLength={2000}
                rows={5}
                className="w-full bg-pk-surface border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-pk-piste placeholder:text-pk-titane/50 focus:border-pk-info/50 focus:outline-none transition-colors resize-none"
                data-testid="feedback-message"
              />
              <p className="font-data text-[0.5625rem] text-pk-titane/60 mt-1 text-right">
                {t("feedback.char_count", { count: message.length })}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim() || sending}
              className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="submit-feedback"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("feedback.sending")}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t("feedback.submit")}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
