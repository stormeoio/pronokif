import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { iconProps } from "@/lib/icons";
import { fadeUp, easing, duration } from "@/lib/motion";
import { brandAssets } from "@/lib/brand";
import { BorderGlowButton } from "@/components/ui/border-glow-button";

// ----------------------------------------------------------- component ---

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [verifyingMagic, setVerifyingMagic] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const consumedMagicTokenRef = useRef<string | null>(null);
  const { login, loginWithMagicLink, register, requestMagicLink } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navigateAfterAuth = useCallback(
    (user: User) => {
      if (!user.username) {
        navigate("/set-username");
      } else if (!user.current_league_id) {
        navigate("/league");
      } else {
        navigate("/");
      }
    },
    [navigate],
  );

  useEffect(() => {
    const token = searchParams.get("magic_token");
    if (!token || consumedMagicTokenRef.current === token) {
      return;
    }

    consumedMagicTokenRef.current = token;
    setVerifyingMagic(true);
    loginWithMagicLink(token)
      .then((user) => {
        toast.success("Connexion magique confirmée !");
        navigateAfterAuth(user);
      })
      .catch((error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          "Lien magique invalide ou expiré";
        toast.error(message);
      })
      .finally(() => setVerifyingMagic(false));
  }, [loginWithMagicLink, navigateAfterAuth, searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, type: "login" | "register") => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const user =
        type === "login" ? await login(email, password) : await register(email, password);

      toast.success(type === "login" ? "Connexion réussie !" : "Compte créé !");

      navigateAfterAuth(user);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Une erreur est survenue";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    const email = loginEmail.trim();
    if (!email) {
      toast.error("Entre ton email pour recevoir le lien magique");
      return;
    }

    setIsLoading(true);
    try {
      await requestMagicLink(email);
      setMagicSent(true);
      toast.success("Lien magique envoyé !");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Erreur lors de l'envoi du lien magique";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ---- AUTH PAGE ---- */}
      <div className="relative w-full min-h-dvh flex flex-col items-center justify-center px-5 py-8 overflow-hidden">
        {/* Background layers */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 50% 100%, rgba(225,6,0,0.06) 0%, transparent 50%),
              radial-gradient(ellipse 80% 60% at 20% 20%, rgba(225,6,0,0.03) 0%, transparent 50%),
              linear-gradient(180deg, #0a0c10 0%, #0B0D12 40%, #110a0a 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.008) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.008) 1px,transparent 1px)",
            backgroundSize: "80px 80px",
            maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%,black 20%,transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 50% at 50% 50%,black 20%,transparent 80%)",
          }}
        />
        {/* Grain */}
        <div className="grain" />

        {/* Red glow behind card */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] z-[1] pointer-events-none"
          style={{
            background: "radial-gradient(circle,rgba(225,6,0,0.05) 0%,transparent 60%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: easing.enter }}
        />

        {/* ---- GLASS AUTH CARD ---- */}
        <motion.div
          className="relative z-10 w-full max-w-[400px]
            bg-pk-anthracite/80 backdrop-blur-[40px] saturate-[1.3]
            border border-white/[0.08] rounded-xl
            px-7 pt-9 pb-7
            shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15),0_24px_48px_rgba(0,0,0,0.25)]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          data-testid="auth-card"
        >
          {/* Logo */}
          <div className="mb-2 text-center">
            <img
              src={brandAssets.wordmarkWhiteRed}
              alt="PronoKif"
              className="mx-auto h-9 w-auto max-w-[220px] object-contain"
              draggable={false}
            />
          </div>
          <p className="text-center text-pk-titane text-[0.75rem] mb-7 leading-relaxed">
            Fais tes pronos, défie tes potes,
            <br />
            vivez la F1 comme jamais.
          </p>

          {verifyingMagic && (
            <div
              className="mb-5 flex items-center justify-center gap-2 rounded-md border
                border-pk-red/30 bg-pk-red-subtle px-3 py-2 text-[0.75rem] text-pk-piste"
            >
              <Loader2 {...iconProps} size={14} className="animate-spin" />
              Vérification du lien magique...
            </div>
          )}

          {/* Tabs */}
          <div className="flex rounded-md bg-white/[0.03] border border-white/[0.08] mb-6 overflow-hidden">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2.5 text-center text-[0.75rem] font-medium relative
                transition-all duration-pk-short ease-pk-enter
                ${activeTab === "login" ? "text-pk-piste bg-pk-red-subtle" : "text-pk-titane hover:text-pk-piste"}`}
              data-testid="tab-login"
            >
              Connexion
              {activeTab === "login" && (
                <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-pk-red rounded-sm" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2.5 text-center text-[0.75rem] font-medium relative
                transition-all duration-pk-short ease-pk-enter
                ${activeTab === "register" ? "text-pk-piste bg-pk-red-subtle" : "text-pk-titane hover:text-pk-piste"}`}
              data-testid="tab-register"
            >
              Inscription
              {activeTab === "register" && (
                <span className="absolute bottom-0 left-[20%] right-[20%] h-0.5 bg-pk-red rounded-sm" />
              )}
            </button>
          </div>

          {/* ---- LOGIN FORM ---- */}
          {activeTab === "login" && (
            <form onSubmit={(e) => handleSubmit(e, "login")} data-testid="login-form">
              <div className="mb-3.5">
                <label className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-pk-titane mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="you.com"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setMagicSent(false);
                  }}
                  className="input-pk w-full"
                  data-testid="login-email"
                />
              </div>
              <div className="mb-3.5">
                <label className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-pk-titane mb-1">
                  Mot de passe
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={1}
                  autoComplete="current-password"
                  className="input-pk w-full"
                  data-testid="login-password"
                />
              </div>

              <div className="flex justify-between items-center mb-5">
                <label className="flex items-center gap-1.5 text-[0.6875rem] text-pk-titane cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-3.5 h-3.5 accent-pk-red cursor-pointer"
                  />
                  Se souvenir
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[0.6875rem] text-pk-red no-underline hover:underline"
                >
                  Oublié ?
                </Link>
              </div>

              <BorderGlowButton
                type="submit"
                disabled={isLoading}
                className="w-full text-[0.875rem]"
                data-testid="login-submit"
              >
                <ArrowRight {...iconProps} size={14} strokeWidth={2} />
                {isLoading ? "Connexion..." : "Se connecter"}
              </BorderGlowButton>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleSendMagicLink}
                className="btn-pk-outline mt-2.5 w-full text-[0.75rem]"
                data-testid="magic-link-submit"
              >
                <Mail {...iconProps} size={14} strokeWidth={2} />
                {magicSent ? "Lien envoyé ✓" : "Recevoir un lien magique"}
              </button>
            </form>
          )}

          {/* ---- REGISTER FORM ---- */}
          {activeTab === "register" && (
            <form onSubmit={(e) => handleSubmit(e, "register")} data-testid="register-form">
              <div className="mb-3.5">
                <label className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-pk-titane mb-1">
                  Pseudo pilote
                </label>
                <input
                  name="username"
                  type="text"
                  placeholder="VerstappenFan, LeclercSZN..."
                  className="input-pk w-full"
                />
              </div>
              <div className="mb-3.5">
                <label className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-pk-titane mb-1">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="you.com"
                  required
                  autoComplete="email"
                  className="input-pk w-full"
                  data-testid="register-email"
                />
              </div>
              <div className="mb-5">
                <label className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-pk-titane mb-1">
                  Mot de passe
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="8 caractères minimum"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input-pk w-full"
                  data-testid="register-password"
                />
              </div>

              <BorderGlowButton
                type="submit"
                disabled={isLoading}
                className="w-full text-[0.875rem]"
                data-testid="register-submit"
              >
                <Plus {...iconProps} size={14} strokeWidth={2} />
                {isLoading ? "Création..." : "Créer mon compte"}
              </BorderGlowButton>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2.5 my-4">
            <span className="flex-1 h-px bg-white/[0.08]" />
            <span className="font-mono text-[0.625rem] text-pk-titane uppercase tracking-[0.1em]">
              ou continuer avec
            </span>
            <span className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Social buttons */}
          <div className="flex gap-2">
            <button className="btn-pk-outline flex-1 text-[0.75rem]" type="button">
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button className="btn-pk-outline flex-1 text-[0.75rem]" type="button">
              <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>

          {/* Footer */}
          <p className="text-center mt-4 text-[0.6875rem] text-pk-titane">
            {activeTab === "login" ? (
              <>
                Nouveau ?{" "}
                <button
                  onClick={() => setActiveTab("register")}
                  className="text-pk-red font-medium hover:underline"
                >
                  Rejoins la course
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{" "}
                <button
                  onClick={() => setActiveTab("login")}
                  className="text-pk-red font-medium hover:underline"
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          className="fixed bottom-5 left-0 right-0 text-center z-10
            font-display text-[0.625rem] tracking-[0.15em] text-pk-titane/40"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.4, y: 0 }}
          transition={{ duration: duration.long, ease: easing.enter, delay: 0.3 }}
        >
          Pronostique. Défie. <em className="not-italic text-pk-red">Vis-le.</em>
        </motion.p>
      </div>
    </>
  );
}
