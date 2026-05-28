/**
 * Reset password — V2 Inline checks.
 * Broadcast Premium theme with strength bars + checklist grid.
 */
import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, CheckCircle2, XCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api";
import { brandAssets } from "@/lib/brand";
import { haptic } from "@/lib/haptics";
import { easing, duration, getReducedMotionProps } from "@/lib/motion";

/* ── Password rules ────────────────────────────────────── */

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: "8+ caracteres", test: (pw) => pw.length >= 8 },
  { label: "1 updateduscule", test: (pw) => /[A-Z]/.test(pw) },
  { label: "1 minuscule", test: (pw) => /[a-z]/.test(pw) },
  { label: "1 chiffre", test: (pw) => /\d/.test(pw) },
];

function getStrengthLevel(passed: number): {
  label: string;
  color: string;
  bars: number;
} {
  if (passed <= 1) return { label: "Faible", color: "bg-pk-red", bars: 1 };
  if (passed === 2) return { label: "Moyen", color: "bg-pk-amber", bars: 2 };
  if (passed === 3) return { label: "Bon", color: "bg-pk-amber", bars: 3 };
  return { label: "Fort", color: "bg-pk-emerald", bars: 4 };
}

/* ── Component ─────────────────────────────────────────── */

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">(
    token ? "form" : "error",
  );
  const [error, setError] = useState(token ? "" : "Lien de reinitialisation invalide");

  const passedRules = useMemo(() => RULES.filter((r) => r.test(password)).length, [password]);
  const strength = useMemo(() => getStrengthLevel(passedRules), [passedRules]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passwordsMatch) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (passedRules < 4) {
      setError("The password does not meet all criteria");
      return;
    }

    setStatus("loading");
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        new_password: password,
      });
      haptic("success");
      setStatus("success");
    } catch (err) {
      haptic("error");
      const message =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Error lors de la reinitialisation";
      setError(message);
      setStatus("form");
    }
  };

  return (
    <div className="min-h-screen bg-pk-carbon flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-pk-red/[0.04] blur-[120px] pointer-events-none" />

      <motion.div
        className="bg-pk-surface border border-white/[0.08] rounded-lg p-6 max-w-sm w-full relative z-10"
        data-testid="reset-password-card"
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

        {/* ── Success ── */}
        {status === "success" && (
          <motion.div className="text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-14 h-14 rounded-full bg-pk-emerald/[0.12] border border-pk-emerald/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-pk-emerald" />
            </div>
            <h2 className="font-display text-lg mb-1">Password modifie</h2>
            <p className="text-xs text-pk-titane mb-5">
              You can now sign in with your new password.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform"
            >
              Se connecter
            </Link>
          </motion.div>
        )}

        {/* ── Invalid token ── */}
        {status === "error" && !token && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-pk-red/[0.12] border border-pk-red/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-pk-red" />
            </div>
            <h2 className="font-display text-lg mb-1">Lien invalide</h2>
            <p className="text-xs text-pk-titane mb-5">{error}</p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {/* ── Form ── */}
        {(status === "form" || status === "loading") && (
          <>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-pk-red/[0.10] border border-pk-red/20 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5 text-pk-red" />
              </div>
              <h2 className="font-display text-lg mb-1">New password</h2>
              <p className="text-xs text-pk-titane">Choose a secure password.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password field */}
              <div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    required
                    minLength={8}
                    className="w-full h-11 px-3.5 pr-10 rounded-lg bg-pk-anthracite border border-white/[0.08] text-sm text-pk-piste placeholder:text-pk-titane/50 focus:outline-none focus:border-pk-red/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-pk-titane hover:text-pk-piste"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength bars */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            bar <= strength.bars ? strength.color : "bg-white/[0.06]"
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`font-data text-[0.5rem] ${
                        strength.bars >= 4
                          ? "text-pk-emerald"
                          : strength.bars >= 2
                            ? "text-pk-amber"
                            : "text-pk-red"
                      }`}
                    >
                      {strength.label}
                    </p>
                  </div>
                )}

                {/* Rules checklist 2x2 grid */}
                {password.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                    {RULES.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.label} className="flex items-center gap-1.5">
                          <div
                            className={`w-1 h-1 rounded-full transition-colors ${
                              passed ? "bg-pk-emerald" : "bg-pk-titane/40"
                            }`}
                          />
                          <span
                            className={`text-[0.5625rem] transition-colors ${
                              passed ? "text-pk-emerald" : "text-pk-titane"
                            }`}
                          >
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm field */}
              <div>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    required
                    minLength={8}
                    className="w-full h-11 px-3.5 pr-10 rounded-lg bg-pk-anthracite border border-white/[0.08] text-sm text-pk-piste placeholder:text-pk-titane/50 focus:outline-none focus:border-pk-red/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-pk-titane hover:text-pk-piste"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-[0.5625rem] mt-1 ${
                      passwordsMatch ? "text-pk-emerald" : "text-pk-red"
                    }`}
                  >
                    {passwordsMatch ? "Les mots de passe correspondent" : "Ne correspond pas"}
                  </p>
                )}
              </div>

              {error && <p className="text-xs text-pk-red">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading" || !passwordsMatch || passedRules < 4}
                className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-50"
                data-testid="reset-password-submit"
              >
                {status === "loading" ? "Reinitialisation..." : "Reinitialiser"}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/auth"
                className="text-xs text-pk-titane hover:text-pk-piste transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
