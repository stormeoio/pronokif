/**
 * Email verification landing page.
 * Broadcast Premium: centered card, pk-* tokens.
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien de vérification invalide");
      return;
    }

    apiClient
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus("success");
        setMessage("Ton email a été vérifié avec succès !");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Ce lien est invalide ou a déjà été utilisé");
      });
  }, [token]);

  return (
    <div
      className="min-h-screen bg-pk-carbon flex items-center justify-center px-4"
      data-testid="verify-email-page"
    >
      <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-8 max-w-sm w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-pk-info animate-spin mx-auto mb-4" />
            <p className="text-sm text-pk-titane">Vérification en cours...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-pk-emerald/[0.12] border border-pk-emerald/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-pk-emerald" />
            </div>
            <h2 className="font-display text-xl mb-1">Email vérifié !</h2>
            <p className="text-xs text-pk-titane mb-6">{message}</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform"
              data-testid="verify-success-link"
            >
              Retour au tableau de bord
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-pk-red/[0.12] border border-pk-red/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-pk-red" />
            </div>
            <h2 className="font-display text-xl mb-1">Erreur</h2>
            <p className="text-xs text-pk-titane mb-6">{message}</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-white/[0.06] border border-white/[0.08] text-pk-piste font-display text-sm active:scale-[0.97] transition-transform"
              data-testid="verify-error-link"
            >
              Retour
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
