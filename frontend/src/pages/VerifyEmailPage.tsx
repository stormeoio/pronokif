/**
 * Email verification landing page.
 * Users arrive here via the verification link sent by email.
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
      setMessage("Lien de verification invalide");
      return;
    }

    apiClient
      .get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus("success");
        setMessage("Ton email a ete verifie avec succes !");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Ce lien est invalide ou a deja ete utilise");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-app-main flex items-center justify-center px-4">
      <div className="card-arcade p-8 max-w-sm w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300 font-body">Verification en cours...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">Email verifie !</h2>
            <p className="text-gray-400 font-body mb-6">{message}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:from-blue-500 hover:to-blue-600 transition-all"
            >
              Retour au dashboard
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="font-heading text-xl text-white mb-2">Erreur</h2>
            <p className="text-gray-400 font-body mb-6">{message}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-gray-700 text-white rounded-lg font-heading uppercase tracking-wider text-sm hover:bg-gray-600 transition-all"
            >
              Retour
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
