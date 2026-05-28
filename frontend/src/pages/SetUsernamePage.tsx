/**
 * Set Username — V2 Big Avatar with profile preview.
 * Broadcast Premium theme.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Check, ChevronRight, AlertCircle } from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { brandAssets } from "@/lib/brand";
import { fadeUp, staggerContainer, easing, duration, getReducedMotionProps } from "@/lib/motion";

/* ── Emoji avatars (fallback before real selection) ───── */

const EMOJI_AVATARS = ["🏎️", "🏁", "🔥", "⚡", "🎯", "🏆", "👑", "🦊", "🐺", "🦅", "🎮", "💎"];

export default function SetUsernamePage() {
  const navigate = useNavigate();
  const { setUsername, user } = useAuth();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [username, setUsernameValue] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🏎️");
  const [isLoading, setIsLoading] = useState(false);

  const { data: avatars } = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  /* ── Validation ── */
  const isValidLength = username.length >= 3 && username.length <= 20;
  const isValidChars = /^[a-zA-Z0-9_]+$/.test(username);
  const isValid = isValidLength && isValidChars;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    try {
      await setUsername(username);
      haptic("success");
      toast.success("Pseudo enregistré !");
      navigate("/league");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Ce pseudo est déjà pris";
      haptic("error");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pk-carbon flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pk-red/[0.04] blur-[120px] pointer-events-none" />

      <motion.div
        className="w-full max-w-sm relative z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Progress strip */}
        <motion.div variants={fadeUp} className="mb-6">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-1 flex-1 rounded-full bg-pk-red" />
            <div className="h-1 flex-1 rounded-full bg-pk-red" />
            <div className="h-1 flex-1 rounded-full bg-pk-red" />
          </div>
          <p className="font-data text-[0.5rem] text-pk-titane text-right">Étape 3/3</p>
        </motion.div>

        {/* Big Avatar */}
        <motion.div variants={fadeUp} className="text-center mb-5">
          <div className="w-24 h-24 rounded-full bg-pk-surface border-2 border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-4xl">
            {selectedEmoji}
          </div>
          <h1 className="font-display text-xl mb-1">Choisis ton pseudo</h1>
          <p className="text-xs text-pk-titane">C'est comme ça que tes amis te verront.</p>
        </motion.div>

        {/* Emoji scroll */}
        <motion.div
          variants={fadeUp}
          className="flex gap-2 overflow-x-auto scrollbar-none pb-2 mb-5 -mx-1 px-1"
        >
          {EMOJI_AVATARS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                haptic("selection");
                setSelectedEmoji(emoji);
              }}
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg transition-all ${
                selectedEmoji === emoji
                  ? "bg-pk-red/20 border-2 border-pk-red scale-110"
                  : "bg-pk-surface border border-white/[0.08] hover:border-white/20"
              }`}
            >
              {emoji}
            </button>
          ))}
        </motion.div>

        {/* Username input */}
        <motion.form variants={fadeUp} onSubmit={handleSubmit} data-testid="username-form">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-data text-sm text-pk-titane">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsernameValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="SpeedyMax"
              required
              minLength={3}
              maxLength={20}
              className="flex-1 h-12 px-3.5 rounded-lg bg-pk-anthracite border border-white/[0.08] text-base font-bold text-pk-piste placeholder:text-pk-titane/40 focus:outline-none focus:border-pk-red/40 transition-colors"
              data-testid="username-input"
            />
          </div>

          {/* Validation hints */}
          {username.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-[0.5625rem] flex items-center gap-1 ${
                  isValidLength ? "text-pk-emerald" : "text-pk-titane"
                }`}
              >
                {isValidLength ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                3-20 car.
              </span>
              <span
                className={`text-[0.5625rem] flex items-center gap-1 ${
                  isValidChars ? "text-pk-emerald" : "text-pk-titane"
                }`}
              >
                {isValidChars ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                Lettres, chiffres, _
              </span>
            </div>
          )}

          {/* Live preview card */}
          {username.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-pk-anthracite border border-white/[0.08] rounded-lg p-3 mb-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-pk-surface flex items-center justify-center text-xl">
                {selectedEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">@{username}</p>
                <p className="font-data text-[0.5rem] text-pk-titane">Niveau 1</p>
              </div>
              <span className="font-data text-[0.5rem] px-2 py-0.5 rounded-full bg-pk-red/20 text-pk-red">
                Nouveau
              </span>
            </motion.div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-50"
            data-testid="username-submit"
          >
            {isLoading ? "Enregistrement..." : "C'est parti !"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}
