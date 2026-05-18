/**
 * Forgot password page.
 * User enters their email to receive a password reset link.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api";

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
        {status === "sent" ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">Email envoye !</h2>
            <p className="text-gray-400 font-body text-sm mb-6">
              Si un compte existe avec cet email, tu recevras un lien pour reinitialiser ton mot de
              passe.
            </p>
            <Link
              to="/auth"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:from-blue-500 hover:to-blue-600 transition-all"
            >
              Retour a la connexion
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <Mail className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <h2 className="font-heading text-xl text-white mb-1">Mot de passe oublie ?</h2>
              <p className="text-gray-400 font-body text-sm">
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
                  className="w-full px-4 py-3 bg-[#0a1628] border border-gray-700 rounded-lg font-body text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-body">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50"
              >
                {status === "loading" ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/auth"
                className="text-sm text-gray-500 hover:text-blue-400 font-body transition-colors inline-flex items-center gap-1"
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
