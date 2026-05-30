/**
 * Join League — V2 Code (OTP-style) with league preview card.
 * Broadcast Premium theme.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Trophy, Users, LogIn, Loader2, AlertCircle, CheckCircle, Home } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { brandAssets } from "@/lib/brand";
import { clearPendingJoinCode, savePendingJoinCode } from "@/lib/pendingJoin";
import { fadeUp, easing, duration, getReducedMotionProps } from "@/lib/motion";

/* ── Types ─────────────────────────────────────────────── */

interface LeaguePreview {
  id: string;
  name: string;
  code: string;
  members_count: number;
  description?: string;
}

interface LeagueBasic {
  id: string;
  name: string;
  code: string;
}

/* ── Spinner ───────────────────────────────────────────── */

function JoinSpinner() {
  return (
    <div className="min-h-screen bg-pk-carbon flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-white/[0.08] border-t-pk-red rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-pk-titane">Chargement de l'invitation...</p>
      </div>
    </div>
  );
}

/* ── Status Screens ────────────────────────────────────── */

function StatusScreen({
  icon,
  iconBg,
  iconColor,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="min-h-screen bg-pk-carbon flex items-center justify-center px-4">
      <motion.div
        className="text-center max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.medium / 1000, ease: easing.enter }}
      >
        <div
          className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center mx-auto mb-4`}
        >
          {icon}
        </div>
        <h1 className="font-display text-xl mb-2">{title}</h1>
        <p className="text-sm text-pk-titane mb-6 leading-relaxed">{description}</p>
        <button
          onClick={onAction}
          className="h-11 px-6 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform"
        >
          {actionLabel}
        </button>
      </motion.div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function JoinLeaguePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [joining, setJoining] = useState(false);

  const {
    data: league = null,
    isLoading: leagueLoading,
    error: leagueError,
  } = useQuery<LeaguePreview | null>({
    queryKey: ["/leagues/by-code", code],
    queryFn: () => api.leagues.byCode(code!) as Promise<LeaguePreview>,
    enabled: !!code,
  });

  const { data: myLeagues = [], isLoading: myLeaguesLoading } = useQuery<LeagueBasic[]>({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my() as Promise<LeagueBasic[]>,
    enabled: !!user && !!league,
  });

  const loading = leagueLoading || (!!user && !!league && myLeaguesLoading);
  const error = leagueError ? "Cette ligue n'existe pas ou le lien est invalide" : null;
  const alreadyMember = myLeagues.some((l) => l.code === code?.toUpperCase());

  const handleJoin = async () => {
    if (!user) {
      savePendingJoinCode(code);
      navigate("/auth");
      return;
    }

    setJoining(true);
    haptic("medium");
    try {
      const res = await api.leagues.join({ code: code!.toUpperCase() });
      updateUser({ current_league_id: res.id });
      clearPendingJoinCode();
      haptic("success");
      toast.success(`Tu as rejoint "${res.name}" !`);
      navigate("/");
    } catch (e: unknown) {
      haptic("error");
      const axiosError = e as AxiosError<{ detail: string }>;
      const message = axiosError.response?.data?.detail || "Erreur lors de l'inscription";
      if (message.includes("already")) {
        queryClient.invalidateQueries({ queryKey: ["/leagues/my"] });
      } else {
        toast.error(message);
      }
    } finally {
      setJoining(false);
    }
  };

  /* ── Loading ── */
  if (loading) return <JoinSpinner />;

  /* ── Error ── */
  if (error) {
    return (
      <StatusScreen
        icon={<AlertCircle className="w-7 h-7 text-pk-red" />}
        iconBg="bg-pk-red/[0.12]"
        iconColor="text-pk-red"
        title="Lien invalide"
        description={error}
        actionLabel="Retour"
        onAction={() => navigate("/")}
      />
    );
  }

  /* ── Already member ── */
  if (alreadyMember) {
    return (
      <StatusScreen
        icon={<CheckCircle className="w-7 h-7 text-pk-emerald" />}
        iconBg="bg-pk-emerald/[0.12]"
        iconColor="text-pk-emerald"
        title="Déjà membre !"
        description={`Tu fais déjà partie de ${league?.name}.`}
        actionLabel="Aller au tableau de bord"
        onAction={() => {
          clearPendingJoinCode();
          navigate("/");
        }}
      />
    );
  }

  /* ── Join Flow ── */
  return (
    <div className="min-h-screen bg-pk-carbon flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-pk-red/[0.03] blur-[120px] pointer-events-none" />

      <motion.div
        className="w-full max-w-sm text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.medium / 1000, ease: easing.enter }}
        {...rmProps}
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-pk-amber/[0.12] border border-pk-amber/20 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-7 h-7 text-pk-amber" />
        </div>

        <h1 className="font-display text-xl mb-1">Invitation</h1>
        <p className="text-xs text-pk-titane mb-6">Tu as été invité à rejoindre une ligue</p>

        {/* OTP-style code display */}
        <div className="flex justify-center gap-1.5 mb-6">
          {(code || "")
            .toUpperCase()
            .split("")
            .map((char, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.3 }}
                className="w-10 h-12 rounded-lg bg-pk-anthracite border border-white/[0.08] flex items-center justify-center font-data text-lg font-bold"
              >
                {char}
              </motion.div>
            ))}
        </div>

        {/* League preview card */}
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 mb-6 text-left"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pk-amber/[0.12] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-pk-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{league?.name}</p>
              <p className="font-data text-[0.5rem] text-pk-titane flex items-center gap-1">
                <Users className="w-3 h-3" />
                {league?.members_count} membre{(league?.members_count ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {league?.description && (
            <p className="text-xs text-pk-titane mt-2 leading-relaxed">{league.description}</p>
          )}
        </motion.div>

        {/* Join button */}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-50"
          data-testid="join-league-btn"
        >
          {joining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Inscription...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Rejoindre la ligue
            </>
          )}
        </button>

        {!user && (
          <p className="text-[0.625rem] text-pk-titane mt-3">
            Tu devras te connecter pour rejoindre
          </p>
        )}
      </motion.div>
    </div>
  );
}
