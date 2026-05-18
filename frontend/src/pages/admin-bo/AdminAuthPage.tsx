/**
 * Admin Back-Office Authentication Page.
 * Magic link login + 2FA verification.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Loader2, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [partialToken, setPartialToken] = useState("");
  const [error, setError] = useState("");

  // Check if already authenticated (cookie-based)
  useEffect(() => {
    adminApi
      .me()
      .then(() => navigate("/admin-bo"))
      .catch(() => {});
  }, [navigate]);

  const verifyMagicLink = useCallback(
    async (token: string) => {
      setVerifying(true);
      setError("");
      try {
        const res = await adminApi.verifyMagicLink(token);
        if (res.data.requires_2fa) {
          setRequires2fa(true);
          setPartialToken(res.data.partial_token);
        } else {
          navigate("/admin-bo");
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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      await adminApi.validate2fa(totpCode, partialToken);
      navigate("/admin-bo");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Code invalide");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)" }}
    >
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="card-arcade overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600/20 to-transparent p-6 border-b border-red-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="font-heading text-xl text-white uppercase tracking-tight">
                  Administration
                </h1>
                <p className="font-body text-xs text-gray-400">Panneau d'administration Pronokif</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {verifying && !requires2fa ? (
              /* Verifying magic link */
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="font-body text-gray-400">Vérification du lien...</p>
              </div>
            ) : requires2fa ? (
              /* 2FA verification */
              <form onSubmit={handleVerify2fa} className="space-y-4">
                <div className="text-center mb-4">
                  <KeyRound className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
                  <h2 className="font-heading text-lg text-white">Vérification 2FA</h2>
                  <p className="font-body text-sm text-gray-400">
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
                  className="text-center text-2xl tracking-[0.5em] bg-gray-900 border-gray-700 text-white"
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={totpCode.length !== 6 || verifying}
                  className="w-full h-12 btn-racing font-heading"
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vérifier"}
                </Button>
              </form>
            ) : sent ? (
              /* Email sent confirmation */
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h2 className="font-heading text-lg text-green-400 mb-2">Lien envoyé !</h2>
                <p className="font-body text-sm text-gray-400 mb-4">
                  Un lien de connexion a été envoyé à{" "}
                  <strong className="text-white">{email}</strong>
                </p>
                <p className="font-body text-xs text-gray-500">
                  Vérifiez votre boîte mail et cliquez sur le lien pour vous connecter. Le lien
                  expire dans 15 minutes.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setSent(false)}
                  className="mt-4 text-gray-400 hover:text-white"
                >
                  Renvoyer un lien
                </Button>
              </div>
            ) : (
              /* Email input form */
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div className="text-center mb-4">
                  <Mail className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                  <h2 className="font-heading text-lg text-white">Connexion par email</h2>
                  <p className="font-body text-sm text-gray-400">
                    Entrez votre adresse administrateur pour recevoir un lien de connexion
                  </p>
                </div>
                <Input
                  type="email"
                  placeholder="admin@pronokif.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                  required
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={!email || sending}
                  className="w-full h-12 btn-racing font-heading"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Envoyer le lien magique
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          <div className="h-2 bg-kerb-stripe" />
        </div>
      </motion.div>
    </div>
  );
}
