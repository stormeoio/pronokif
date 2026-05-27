/**
 * Forgot password — V2 Card Centered with radial glow.
 * Broadcast Premium theme.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { apiClient } from "@/lib/api";
import { brandAssets } from "@/lib/brand";
import { haptic } from "@/lib/haptics";
import { fadeUp, easing, duration, getReducedMotionProps } from "@/lib/motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      await apiClient.post("/auth/forgot-password", { email });
      haptic("success");
      setStatus("sent");
      setResendTimer(60);
    } catch {
      haptic("error");
      setError("Une erreur est survenue, veuillez reessayer.");
      setStatus("idle");
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setStatus("loading");
    try {
      await apiClient.post("/auth/forgot-password", { email });
      haptic("light");
      setResendTimer(60);
      setStatus("sent");
    } catch {
      setStatus("sent");
    }
  };

  return (
    <div className="min-h-screen bg-pk-carbon flex items-center justify-center px-4 relative overflow-hidden">
      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-pk-red/[0.04] blur-[120px] pointer-events-none" />

      <motion.div
        className="bg-pk-surface border border-white/[0.08] rounded-xl p-6 max-w-sm w-full relative z-10"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: duration.medium / 1000, ease: easing.enter }}
        {...rmProps}
      >
        <img
          src={brandAssets.wordmarkWhiteRed}
          alt="PronoKif"
          className="mx-auto mb-6 h-7 w-auto max-w-[180px] object-contain"
          draggable={false}
        />

        {status === "sent" ? (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-14 h-14 rounded-full bg-pk-emerald/[0.12] border border-pk-emerald/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-pk-emerald" />
            </div>
            <h2 className="font-display text-lg mb-1">Email envoye</h2>
            <p className="text-xs text-pk-titane leading-relaxed mb-5 max-w-[260px] mx-auto">
              Si un compte existe avec cet email, tu recevras un lien pour reinitialiser ton mot de
              passe.
            </p>

            {/* Resend timer */}
            {resendTimer > 0 ? (
              <p className="font-data text-[0.5625rem] text-pk-titane mb-4">
                Renvoyer dans {resendTimer}s
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="font-data text-[0.5625rem] text-pk-red mb-4"
              >
                Renvoyer l'email
              </button>
            )}

            <button
              onClick={() => {
                haptic("light");
                window.open("mailto:", "_self");
              }}
              className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform mb-3"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir ma boite mail
            </button>

            <Link
              to="/auth"
              className="text-xs text-pk-titane hover:text-pk-piste transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Retour a la connexion
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-pk-red/[0.10] border border-pk-red/20 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-5 h-5 text-pk-red" />
              </div>
              <h2 className="font-display text-lg mb-1">Mot de passe oublie ?</h2>
              <p className="text-xs text-pk-titane">
                Entre ton email pour recevoir un lien de reinitialisation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                required
                className="w-full h-11 px-3.5 rounded-lg bg-pk-anthracite border border-white/[0.08] text-sm text-pk-piste placeholder:text-pk-titane/50 focus:outline-none focus:border-pk-red/40 transition-colors"
              />

              {error && <p className="text-xs text-pk-red">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {status === "loading" ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/auth"
                className="text-xs text-pk-titane hover:text-pk-piste transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour a la connexion
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
