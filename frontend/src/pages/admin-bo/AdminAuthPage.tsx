/**
 * Admin Back-Office Authentication Page.
 * Magic link login + 2FA verification.
 *
 * Never shows a blank page: every state has visible UI + a back CTA.
 * "Link sent" state persists in sessionStorage so a page refresh
 * doesn't lose the user's context.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Loader2,
  KeyRound,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BorderGlowButton } from "@/components/ui/border-glow-button";
import { brandAssets } from "@/lib/brand";

const ADMIN_HOME_PATH = "/admin";
const SENT_EMAIL_KEY = "pronokif:admin-magic-sent";

/** Persist "link sent" email so a page refresh shows the right state. */
function getSentEmail(): string | null {
  try {
    return sessionStorage.getItem(SENT_EMAIL_KEY);
  } catch {
    return null;
  }
}
function setSentEmail(email: string) {
  try {
    sessionStorage.setItem(SENT_EMAIL_KEY, email);
  } catch {
    /* non-critical */
  }
}
function clearSentEmail() {
  try {
    sessionStorage.removeItem(SENT_EMAIL_KEY);
  } catch {
    /* non-critical */
  }
}

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentAddress, setSentAddress] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [partialToken, setPartialToken] = useState("");
  const [error, setError] = useState("");

  // Check if already authenticated (cookie-based)
  useEffect(() => {
    adminApi
      .me()
      .then(() => navigate(ADMIN_HOME_PATH, { replace: true }))
      .catch(() => {
        setAuthChecking(false);
        // Restore "link sent" state from sessionStorage
        const savedEmail = getSentEmail();
        if (savedEmail) {
          setSent(true);
          setSentAddress(savedEmail);
        }
      });
  }, [navigate]);

  const verifyMagicLink = useCallback(
    async (token: string) => {
      setVerifying(true);
      setError("");
      try {
        const res = await adminApi.verifyMagicLink(token);
        clearSentEmail();
        if (res.data.requires_2fa) {
          setRequires2fa(true);
          setPartialToken(res.data.partial_token);
        } else {
          navigate(ADMIN_HOME_PATH, { replace: true });
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string } } };
        setError(e.response?.data?.detail || "Lien invalide ou expiré");
      } finally {
        setVerifying(false);
      }
    },
    [navigate],
  );

  // Handle magic link token from URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setAuthChecking(false);
      verifyMagicLink(token);
    }
  }, [searchParams, verifyMagicLink]);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await adminApi.sendMagicLink(email);
      setSent(true);
      setSentAddress(email);
      setSentEmail(email);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleResend = () => {
    setSent(false);
    setSentAddress("");
    clearSentEmail();
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      await adminApi.validate2fa(totpCode, partialToken);
      clearSentEmail();
      navigate(ADMIN_HOME_PATH, { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Code invalide");
    } finally {
      setVerifying(false);
    }
  };

  // Branded loading state while checking cookie auth
  if (authChecking && !searchParams.has("token")) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background:
            "radial-gradient(circle at 50% -12%, rgba(225,6,0,.16), transparent 34%), linear-gradient(180deg, #0B0D12 0%, #07090D 56%, #0B0D12 100%)",
        }}
      >
        <div className="text-center">
          <img
            src={brandAssets.wordmarkWhiteRed}
            alt="PronoKif"
            className="mx-auto mb-6 h-8 w-auto max-w-[210px] object-contain"
            draggable={false}
          />
          <Loader2 className="w-8 h-8 text-pk-red animate-spin mx-auto mb-3" />
          <p className="font-body text-xs text-pk-titane">Vérification de session...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 50% -12%, rgba(225,6,0,.16), transparent 34%), radial-gradient(circle at 0% 34%, rgba(244,244,244,.04), transparent 28%), linear-gradient(180deg, #0B0D12 0%, #07090D 56%, #0B0D12 100%)",
      }}
    >
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="bg-pk-surface/80 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,.5)]">
          {/* Header */}
          <div className="border-b border-pk-red/25 bg-gradient-to-r from-pk-red/12 to-transparent p-6">
            <div>
              <h1 className="sr-only">Administration PronoKif</h1>
              <img
                src={brandAssets.wordmarkWhiteRed}
                alt="PronoKif"
                className="mb-2 h-8 w-auto max-w-[210px] object-contain"
                draggable={false}
              />
              <p className="font-body text-xs text-pk-titane">Back-office sécurisé</p>
            </div>
          </div>

          <div className="p-6">
            {verifying && !requires2fa ? (
              /* Verifying magic link */
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-pk-red animate-spin mx-auto mb-4" />
                <p className="font-body text-pk-titane">Vérification du lien...</p>
                {error && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            ) : requires2fa ? (
              /* 2FA verification */
              <form onSubmit={handleVerify2fa} className="space-y-4">
                <div className="text-center mb-4">
                  <KeyRound className="w-10 h-10 text-pk-red mx-auto mb-2" />
                  <h2 className="font-heading text-lg text-pk-piste">Vérification 2FA</h2>
                  <p className="font-body text-sm text-pk-titane">
                    Entrez le code de votre application d'authentification
                  </p>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  className="input-pk text-center text-2xl tracking-[0.5em]"
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <BorderGlowButton
                  type="submit"
                  disabled={totpCode.length !== 6 || verifying}
                  className="w-full h-12 font-heading"
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vérifier"}
                </BorderGlowButton>
              </form>
            ) : sent ? (
              /* Email sent confirmation */
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h2 className="font-heading text-lg text-pk-emerald mb-2">Lien envoyé !</h2>
                <p className="font-body text-sm text-pk-titane mb-2">
                  Un lien de connexion a été envoyé à{" "}
                  <strong className="text-pk-piste">{sentAddress}</strong>
                </p>
                <p className="font-body text-xs text-pk-titane/80 mb-6">
                  Vérifiez votre boîte mail et cliquez sur le lien. Le lien expire dans 15 minutes.
                </p>
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  className="text-pk-titane hover:text-pk-piste"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Renvoyer un lien
                </Button>
              </div>
            ) : (
              /* Email input form */
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="text-center mb-4">
                  <Mail className="w-10 h-10 text-pk-red mx-auto mb-2" />
                  <h2 className="font-heading text-lg text-pk-piste">Connexion par email</h2>
                  <p className="font-body text-sm text-pk-titane">
                    Entrez votre adresse admin pour recevoir un lien de connexion
                  </p>
                </div>
                <Input
                  type="email"
                  placeholder="admin@pronokif.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-pk placeholder:text-pk-titane/70"
                  autoFocus
                  required
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <BorderGlowButton
                  type="submit"
                  disabled={!email || sending}
                  className="w-full h-12 font-heading"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Envoyer le lien magique
                    </>
                  )}
                </BorderGlowButton>
              </form>
            )}
          </div>

          {/* Footer — always visible CTA */}
          <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between">
            <Link
              to="/auth"
              className="text-xs text-pk-titane hover:text-pk-piste transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l'app
            </Link>
            <span className="text-[10px] text-pk-titane/40 font-data">DIRECTION DE COURSE</span>
          </div>

          <div className="h-2 bg-gradient-to-r from-pk-red via-pk-red/60 to-pk-red" />
        </div>
      </motion.div>
    </div>
  );
}
