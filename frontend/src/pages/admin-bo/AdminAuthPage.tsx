/**
 * Admin Back-Office Authentication Page.
 * Magic link login + 2FA verification + device remember.
 *
 * Never shows a blank page: every state has visible UI + a back CTA.
 * "Link sent" state persists in sessionStorage so a page refresh
 * doesn't lose the user's context.
 * "Remember device" stores a long-lived token in localStorage that
 * can re-create a session without a new magic link (90 days).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Mail,
  Loader2,
  KeyRound,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BorderGlowButton } from "@/components/ui/border-glow-button";
import { brandAssets } from "@/lib/brand";

const ADMIN_HOME_PATH = "/admin";
const SENT_EMAIL_KEY = "pronokif:admin-magic-sent";
const DEVICE_TOKEN_KEY = "pronokif:admin-device";

// ── SessionStorage helpers (link sent state) ───────────────────────────────

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

// ── LocalStorage helpers (device token) ────────────────────────────────────

function getDeviceToken(): string | null {
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}
function setDeviceToken(token: string) {
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  } catch {
    /* non-critical */
  }
}
function clearDeviceToken() {
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  } catch {
    /* non-critical */
  }
}

// ── Component ──────────────────────────────────────────────────────────────

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
  const [rememberDevice, setRememberDevice] = useState(!!getDeviceToken());
  const [error, setError] = useState("");
  const verifiedTokenRef = useRef<string | null>(null);

  /** Store device token from API response if remember was checked. */
  const handleDeviceToken = useCallback((resData: Record<string, unknown>) => {
    if (resData.device_token && typeof resData.device_token === "string") {
      setDeviceToken(resData.device_token);
    }
  }, []);

  // Check auth: cookie → device token → show login form
  useEffect(() => {
    const tryAuth = async () => {
      if (searchParams.has("token")) {
        setAuthChecking(false);
        return;
      }

      // 1. Try cookie-based session
      try {
        await adminApi.me();
        navigate(ADMIN_HOME_PATH, { replace: true });
        return;
      } catch {
        /* cookie gone or expired — try device token */
      }

      // 2. Try device token refresh
      const deviceToken = getDeviceToken();
      if (deviceToken) {
        try {
          const res = await adminApi.refreshSession(deviceToken);
          if (res.data.requires_2fa) {
            setRequires2fa(true);
            setPartialToken(res.data.partial_token);
            setAuthChecking(false);
            return;
          }
          navigate(ADMIN_HOME_PATH, { replace: true });
          return;
        } catch {
          // Device token expired or revoked — clear it
          clearDeviceToken();
        }
      }

      // 3. Fall through to login form
      setAuthChecking(false);

      // Restore "link sent" state from sessionStorage
      const savedEmail = getSentEmail();
      if (savedEmail) {
        setSent(true);
        setSentAddress(savedEmail);
      }
    };

    tryAuth();
  }, [navigate, searchParams]);

  const verifyMagicLink = useCallback(
    async (token: string) => {
      setVerifying(true);
      setError("");
      try {
        const res = await adminApi.verifyMagicLink(token, rememberDevice);
        clearSentEmail();
        handleDeviceToken(res.data);
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
    [navigate, rememberDevice, handleDeviceToken],
  );

  // Handle magic link token from URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token && verifiedTokenRef.current !== token) {
      verifiedTokenRef.current = token;
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
      const res = await adminApi.validate2fa(totpCode, partialToken, rememberDevice);
      clearSentEmail();
      handleDeviceToken(res.data);
      navigate(ADMIN_HOME_PATH, { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Code invalide");
    } finally {
      setVerifying(false);
    }
  };

  // Branded loading state while checking cookie/device auth
  if (authChecking && !searchParams.has("token")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="/video/splash-trailer.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80" />
        <div className="text-center relative z-10">
          <img
            src={brandAssets.wordmarkWhiteRed}
            alt="PronoKif"
            className="mx-auto mb-6 h-8 w-auto max-w-[210px] object-contain drop-shadow-lg"
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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-pk-carbon"
      style={{
        background:
          "radial-gradient(circle at 50% -12%, rgba(225,6,0,.16), transparent 34%), linear-gradient(180deg, #0B0D12 0%, #07090D 56%, #0B0D12 100%)",
      }}
    >
      {/* Video background — splash trailer (loads over fallback gradient) */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover animate-video-in"
        src="/video/splash-trailer.mp4"
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75" />
      {/* Subtle red glow at bottom edge */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 40% at 50% 110%, rgba(225,6,0,0.1), transparent 60%)",
        }}
      />
      {/* Grain texture */}
      <div className="grain" />

      <div className="w-full max-w-md relative z-10 animate-sport-reveal">
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
                {/* Remember device checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-pk-anthracite text-pk-red focus:ring-pk-red/40 focus:ring-offset-0"
                  />
                  <span className="flex items-center gap-1.5 text-xs text-pk-titane group-hover:text-pk-piste transition-colors">
                    <Smartphone className="w-3.5 h-3.5" />
                    Se souvenir de cet appareil
                  </span>
                </label>
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
                {/* Remember device checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-pk-anthracite text-pk-red focus:ring-pk-red/40 focus:ring-offset-0"
                  />
                  <span className="flex items-center gap-1.5 text-xs text-pk-titane group-hover:text-pk-piste transition-colors">
                    <Smartphone className="w-3.5 h-3.5" />
                    Se souvenir de cet appareil (90 jours)
                  </span>
                </label>
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
            <div className="flex items-center gap-3">
              <Link
                to="/mentions-legales"
                className="text-[10px] text-pk-titane/50 hover:text-pk-piste"
              >
                Mentions
              </Link>
              <Link to="/cgu" className="text-[10px] text-pk-titane/50 hover:text-pk-piste">
                CGU
              </Link>
              <span className="text-[10px] text-pk-titane/40 font-data">DIRECTION DE COURSE</span>
            </div>
          </div>

          {/* Racing stripe accent — animated sweep */}
          <div className="h-1.5 bg-gradient-to-r from-pk-red via-pk-red/80 to-pk-red animate-stripe-sweep" />
        </div>
      </div>
    </div>
  );
}
