/**
 * Reset password page.
 * Users arrive here via the reset link sent by email.
 * Validates the token, then lets the user set a new password.
 */
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Lock, CheckCircle2, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(
    token ? "form" : "error",
  );
  const [error, setError] = useState(token ? "" : "Lien de reinitialisation invalide");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres");
      return;
    }

    setStatus("loading");

    try {
      await apiClient.post("/auth/reset-password", {
        token,
        new_password: password,
      });
      setStatus("success");
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Erreur lors de la reinitialisation";
      setError(message);
      setStatus("form");
    }
  };

  return (
    <div className="min-h-screen bg-app-main flex items-center justify-center px-4">
      <div className="card-arcade p-8 max-w-sm w-full">
        {status === "success" && (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">Mot de passe modifie !</h2>
            <p className="text-gray-400 font-body text-sm mb-6">
              Tu peux maintenant te connecter avec ton nouveau mot de passe.
            </p>
            <Link
              to="/auth"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:from-blue-500 hover:to-blue-600 transition-all"
            >
              Se connecter
            </Link>
          </div>
        )}

        {status === "error" && !token && (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">Lien invalide</h2>
            <p className="text-gray-400 font-body text-sm mb-6">{error}</p>
            <Link
              to="/forgot-password"
              className="inline-block px-6 py-3 bg-gray-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:bg-gray-600 transition-all"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {(status === "form" || status === "loading") && (
          <>
            <div className="text-center mb-6">
              <Lock className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <h2 className="font-heading text-xl text-white mb-1">Nouveau mot de passe</h2>
              <p className="text-gray-400 font-body text-sm">
                Choisis un nouveau mot de passe securise.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 font-body mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caracteres minimum"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-gray-700 rounded-lg font-body text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min. 8 caracteres, 1 majuscule, 1 minuscule, 1 chiffre
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 font-body mb-1">Confirmer</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme ton mot de passe"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-[#0a1628] border border-gray-700 rounded-lg font-body text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-body">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:from-blue-500 hover:to-blue-600 transition-all disabled:opacity-50"
              >
                {status === "loading" ? "Reinitialisation..." : "Reinitialiser"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
