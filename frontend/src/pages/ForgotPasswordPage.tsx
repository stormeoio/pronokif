/**
 * Forgot password page.
 * User enters their email to receive a password reset link.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { BorderGlowButton } from "@/components/ui/border-glow-button";
import { brandAssets } from "@/lib/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setStatus("sent");
    } catch {
      setError("Une erreur est survenue, veuillez reessayer.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-app-main flex items-center justify-center px-4">
      <div className="card-arcade p-8 max-w-sm w-full">
        <img
          src={brandAssets.wordmarkWhiteRed}
          alt="PronoKif"
          className="mx-auto mb-7 h-8 w-auto max-w-[220px] object-contain"
          draggable={false}
        />
        {status === "sent" ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-pk-piste mb-2">Email envoyé !</h2>
            <p className="text-pk-titane font-body text-sm mb-6">
              Si un compte existe avec cet email, tu recevras un lien pour reinitialiser ton mot de
              passe.
            </p>
            <Link to="/auth" className="btn-pk-outline text-sm">
              Retour a la connexion
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <Mail className="w-10 h-10 text-pk-red mx-auto mb-3" />
              <h2 className="font-heading text-xl text-pk-piste mb-1">Mot de passe oublié ?</h2>
              <p className="text-pk-titane font-body text-sm">
                Entre ton email pour recevoir un lien de reinitialisation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  className="input-pk w-full placeholder:text-pk-titane/70"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-body">{error}</p>}

              <BorderGlowButton
                type="submit"
                disabled={status === "loading"}
                className="w-full h-12 text-sm"
              >
                {status === "loading" ? "Envoi..." : "Envoyer le lien"}
              </BorderGlowButton>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/auth"
                className="text-sm text-pk-titane hover:text-pk-piste font-body transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour a la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
