/**
 * LeaguePage — My Leagues hub.
 * Broadcast Premium theme: glass header, league list, create/join chips + forms.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Trophy, Plus, LogIn, ChevronLeft } from "lucide-react";
import LeagueCreatedScreen from "./leagues/LeagueCreatedScreen";
import LeagueList from "./leagues/LeagueList";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";

/* ── Types ─────────────────────────────────────────────── */

type TabKey = "join" | "create";

/* ── Component ─────────────────────────────────────────── */

export default function LeaguePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("join");
  const [isLoading, setIsLoading] = useState(false);
  const [createdLeague, setCreatedLeague] = useState<{
    name: string;
    code: string;
    id: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | false>(false);

  const { updateUser, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  /* ── Data queries ────────────────────────────────────── */

  const { data: myLeagues = [], isLoading: loadingLeagues } = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my(),
  });

  const { data: unreadByLeague = {} } = useQuery({
    queryKey: ["/leagues/unread-messages"],
    queryFn: async () => {
      const res = await api.leagues.unreadMessages().catch(() => ({ by_league: {} }));
      return res.by_league || {};
    },
  });

  const invalidateLeagues = () => {
    queryClient.invalidateQueries({ queryKey: ["/leagues/my"] });
    queryClient.invalidateQueries({ queryKey: ["/leagues/unread-messages"] });
  };

  /* ── Actions ─────────────────────────────────────────── */

  const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string).toUpperCase();

    try {
      const res = await api.leagues.join({ code });
      updateUser({ ...user, current_league_id: res.id });
      toast.success(`Tu as rejoint "${res.name}" !`);
      invalidateLeagues();
      (e.target as HTMLFormElement).reset();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          "Code invalide",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      const res = await api.leagues.create({ name });
      setCreatedLeague(res);
      updateUser({ ...user, current_league_id: res.id });
      toast.success("Ligue créée !");
      invalidateLeagues();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          "Erreur lors de la création",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async (code?: string) => {
    try {
      await navigator.clipboard.writeText(code || createdLeague?.code || "");
      setCopied(code || createdLeague?.code || false);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async (league: { name: string; code: string }) => {
    const shareUrl = `${window.location.origin}/join/${league.code}`;
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur PRONOKIF !`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `PRONOKIF - ${league.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (e: unknown) {
        if ((e as { name?: string }).name !== "AbortError") copyCode(league.code);
      }
    } else {
      const whatsappText = `${shareText}\n\n${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
    }
  };

  const selectLeague = (leagueId: string) => {
    updateUser({ ...user, current_league_id: leagueId });
    toast.success("Ligue sélectionnée !");
  };

  /* ── Created league success screen ──────────────────── */

  if (createdLeague) {
    return (
      <LeagueCreatedScreen
        league={createdLeague}
        copied={copied || null}
        onCopyCode={() => copyCode()}
        onShareCode={() => shareLeague(createdLeague)}
        onDone={() => {
          setCreatedLeague(null);
          navigate("/");
        }}
      />
    );
  }

  /* ── Main page ──────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="league-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="league-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="w-4.5 h-4.5 text-pk-red" />
              <h1 className="font-display text-lg">Mes ligues</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.div
        className="max-w-md mx-auto px-4 pt-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* League List */}
        <motion.div variants={fadeUp}>
          <LeagueList
            leagues={myLeagues}
            loading={loadingLeagues}
            userId={user!.id}
            currentLeagueId={user!.current_league_id}
            copied={copied || null}
            unreadByLeague={unreadByLeague}
            onCopyCode={copyCode}
            onShareLeague={shareLeague}
            onSelectLeague={(id) => selectLeague(String(id))}
          />
        </motion.div>

        {/* Create / Join Card */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
        >
          {/* Tab Chips */}
          <div className="flex gap-1.5 p-3 border-b border-white/[0.08]">
            <button
              onClick={() => {
                haptic("selection");
                setActiveTab("join");
              }}
              className={`flex-1 h-9 rounded-full font-display text-sm flex items-center justify-center gap-1.5 border transition-colors ${
                activeTab === "join"
                  ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                  : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
              }`}
              data-testid="tab-join"
            >
              <LogIn className="w-3.5 h-3.5" />
              Rejoindre
            </button>
            <button
              onClick={() => {
                haptic("selection");
                setActiveTab("create");
              }}
              className={`flex-1 h-9 rounded-full font-display text-sm flex items-center justify-center gap-1.5 border transition-colors ${
                activeTab === "create"
                  ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                  : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
              }`}
              data-testid="tab-create"
            >
              <Plus className="w-3.5 h-3.5" />
              Créer
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "join" ? (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                <p className="text-xs text-pk-titane text-center mb-4">
                  Entre le code de la ligue que tu veux rejoindre
                </p>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="code"
                      className="block font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-1.5"
                    >
                      Code d'invitation
                    </label>
                    <input
                      id="code"
                      name="code"
                      required
                      maxLength={6}
                      className="w-full h-14 text-center font-data text-2xl uppercase tracking-[0.3em] bg-pk-anthracite border border-white/[0.08] rounded-lg text-pk-piste placeholder:text-pk-titane/40 focus:outline-none focus:border-pk-red/50 focus:ring-1 focus:ring-pk-red/20 transition-colors"
                      data-testid="join-code-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100"
                    data-testid="join-btn"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Rejoindre la ligue
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-5"
              >
                <p className="text-xs text-pk-titane text-center mb-4">
                  Crée ta propre ligue et invite tes amis
                </p>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-1.5"
                    >
                      Nom de la ligue
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      placeholder="Ex: Les Champions F1"
                      className="w-full h-11 px-4 bg-pk-anthracite border border-white/[0.08] rounded-lg text-sm text-pk-piste placeholder:text-pk-titane/40 focus:outline-none focus:border-pk-red/50 focus:ring-1 focus:ring-pk-red/20 transition-colors"
                      data-testid="league-name-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-2 shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-50 disabled:active:scale-100"
                    data-testid="create-btn"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Créer ma ligue
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
