/**
 * LeaguePage — My Leagues hub.
 * Broadcast Premium theme: glass header, league list, create/join chips + forms.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Trophy, Plus, LogIn, ChevronLeft, CircleCheck, Flag, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import LeagueCreatedScreen from "./leagues/LeagueCreatedScreen";
import LeagueList from "./leagues/LeagueList";
import GlobalRankings from "./leagues/GlobalRankings";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { UserIdentity, type UserIdentityRecord } from "@/components/users/UserIdentity";

/* ── Types ─────────────────────────────────────────────── */

type TabKey = "join" | "create";

interface LeagueOnboardingProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  user?: UserIdentityRecord | null;
}

function LeagueOnboarding({ activeTab, onSelectTab, user }: LeagueOnboardingProps) {
  const { t } = useTranslation();
  const welcomeLabel = t("leagues_page.welcome", { name: "" }).trim();
  const stepLabels = t("leagues_page.onboarding_steps", { returnObjects: true }) as string[];
  const choices = [
    {
      key: "create" as const,
      Icon: Plus,
      title: t("leagues_page.choices.create_title"),
      description: t("leagues_page.choices.create_description"),
    },
    {
      key: "join" as const,
      Icon: LogIn,
      title: t("leagues_page.choices.join_title"),
      description: t("leagues_page.choices.join_description"),
    },
  ];

  return (
    <motion.section variants={fadeUp} className="mb-4" data-testid="league-onboarding">
      <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-pk-red-subtle border border-pk-red/25 flex items-center justify-center flex-shrink-0">
            <Flag className="w-4.5 h-4.5 text-pk-red" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-data text-[0.5625rem] text-pk-red uppercase tracking-wider mb-1">
              {t("leagues_page.onboarding_badge")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base leading-tight">{welcomeLabel}</h2>
              {user ? (
                <UserIdentity
                  user={user}
                  linked={false}
                  size="sm"
                  textClassName="font-display text-base leading-tight"
                  data-testid="league-onboarding-user"
                />
              ) : (
                <span className="font-display text-base leading-tight">
                  {t("leagues_page.pilot_fallback")}
                </span>
              )}
            </div>
            <p className="text-xs text-pk-titane leading-relaxed mt-1.5">
              {t("leagues_page.onboarding_text")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: stepLabels[0], state: "done" },
            { label: stepLabels[1], state: "active" },
            { label: stepLabels[2], state: "next" },
          ].map((step) => (
            <div
              key={step.label}
              className={`rounded-md border px-2.5 py-2 ${
                step.state === "active"
                  ? "bg-pk-red-subtle border-pk-red/25"
                  : "bg-white/[0.03] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {step.state === "done" ? (
                  <CircleCheck className="w-3 h-3 text-pk-emerald" />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      step.state === "active" ? "bg-pk-red" : "bg-pk-titane/40"
                    }`}
                  />
                )}
                <span className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider">
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {choices.map(({ key, Icon, title, description }) => {
            const selected = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTab(key)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  selected
                    ? "bg-pk-red-subtle border-pk-red/30"
                    : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.14]"
                }`}
                data-testid={`league-onboarding-${key}`}
              >
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center mb-2 ${
                    selected ? "bg-pk-red/15 text-pk-red" : "bg-white/[0.04] text-pk-titane"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <p className="font-display text-xs">{title}</p>
                <p className="text-[0.625rem] text-pk-titane leading-snug mt-1">{description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function LeaguePage() {
  const { t } = useTranslation();
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

  const hasLeagues = myLeagues.length > 0;
  const needsLeagueOnboarding = !loadingLeagues && !hasLeagues && !user?.current_league_id;

  useEffect(() => {
    if (needsLeagueOnboarding) {
      setActiveTab("create");
    }
  }, [needsLeagueOnboarding]);

  /* ── Actions ─────────────────────────────────────────── */

  const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string).trim().toUpperCase();
    const shouldAdvanceAfterJoin = !user?.current_league_id && myLeagues.length === 0;

    try {
      const res = await api.leagues.join({ code });
      updateUser({ current_league_id: res.id });
      toast.success(t("leagues_page.joined_toast", { name: res.name }));
      invalidateLeagues();
      (e.target as HTMLFormElement).reset();
      if (shouldAdvanceAfterJoin) {
        navigate("/");
      }
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          t("leagues_page.invalid_code"),
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
      updateUser({ current_league_id: res.id });
      toast.success(t("leagues_page.created_toast"));
      invalidateLeagues();
    } catch (error: unknown) {
      toast.error(
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          t("leagues_page.create_error"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async (code?: string) => {
    try {
      await navigator.clipboard.writeText(code || createdLeague?.code || "");
      setCopied(code || createdLeague?.code || false);
      toast.success(t("leagues_page.code_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("leagues_page.copy_error"));
    }
  };

  const shareLeague = async (league: { name: string; code: string }) => {
    const shareUrl = `${window.location.origin}/join/${league.code}`;
    const shareText = t("leagues_page.share_text", { name: league.name });

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
    updateUser({ current_league_id: leagueId });
    toast.success(t("leagues_page.selected_toast"));
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
              <h1 className="font-display text-lg">{t("leagues_page.title")}</h1>
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
        {needsLeagueOnboarding && (
          <LeagueOnboarding
            activeTab={activeTab}
            user={user}
            onSelectTab={(tab) => {
              haptic("selection");
              setActiveTab(tab);
            }}
          />
        )}

        {!needsLeagueOnboarding && (
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
        )}

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
              {t("leagues_page.join_tab")}
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
              {t("leagues_page.create_tab")}
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
                  {t("leagues_page.join_intro")}
                </p>

                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="code"
                      className="block font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-1.5"
                    >
                      {t("leagues_page.code_label")}
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
                        {t("leagues_page.joining")}
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        {t("leagues_page.join_submit")}
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
                  {t("leagues_page.create_intro")}
                </p>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-1.5"
                    >
                      {t("leagues_page.name_label")}
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      placeholder={t("leagues_page.name_placeholder")}
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
                        {t("leagues_page.creating")}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {t("leagues_page.create_submit")}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {needsLeagueOnboarding && (
          <motion.div variants={fadeUp} className="mt-4">
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-3.5 h-3.5 text-pk-titane" />
                <p className="font-display text-xs">{t("leagues_page.social_unlock_title")}</p>
              </div>
              <p className="text-[0.6875rem] text-pk-titane leading-relaxed">
                {t("leagues_page.social_unlock_text")}
              </p>
            </div>
          </motion.div>
        )}

        {/* Global rankings — leagues & players across all of Pronokif */}
        <motion.div variants={fadeUp}>
          <GlobalRankings userId={user?.id} />
        </motion.div>
      </motion.div>
    </div>
  );
}
