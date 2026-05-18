/**
 * Banner shown to authenticated users who haven't verified their email.
 * Offers a one-click resend button.
 */
import { useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function EmailVerificationBanner() {
  const { user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  // Don't show if no user, already verified, or dismissed
  if (!user || user.email_verified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast.success("Email de verification envoye !");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-2 flex items-center gap-3 text-sm relative z-20">
      <Mail className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">Verifie ton email pour securiser ton compte.</span>
      <button
        onClick={handleResend}
        disabled={sending}
        className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 text-xs"
      >
        {sending ? "Envoi..." : "Renvoyer"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/60 hover:text-amber-300 p-0.5"
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
