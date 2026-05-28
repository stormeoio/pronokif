/**
 * LeagueDetailPage — League detail with tabs, edit mode, share.
 * Broadcast Premium: glass header, pk-* cards, chip tabs.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  Users,
  Trophy,
  Copy,
  Check,
  Edit2,
  X,
  Save,
  FileText,
  Share2,
  MessageCircle,
  Loader2,
} from "lucide-react";
import LeagueLeaderboard from "./LeagueLeaderboard";
import LeagueMembers from "./LeagueMembers";
import LeagueSettings from "./LeagueSettings";
import { useLeagueDetailData } from "./useLeagueDetailData";
import { api, getApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import type { LeagueMember as LeagueMemberType } from "@/types/api";

/* ── Skeleton ─────────────────────────────────────────── */

function LeagueDetailSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08] px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pk-anthracite animate-shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-5 w-40 rounded bg-pk-anthracite animate-shimmer" />
            <div
              className="h-3 w-24 rounded bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: "80ms" }}
            />
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3 pb-24">
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-lg bg-pk-anthracite animate-shimmer" />
          <div
            className="h-10 flex-1 rounded-lg bg-pk-anthracite animate-shimmer"
            style={{ animationDelay: "80ms" }}
          />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueDetailPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const { loading, error, league, members, leaderboard, avatars, refetch } =
    useLeagueDetailData(leagueId);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("leaderboard");

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Navigate away on error
  useEffect(() => {
    if (error) {
      toast.error("Error while loading");
      navigate("/league");
    }
  }, [error, navigate]);

  const copyCode = async () => {
    if (!league) return;
    haptic("light");
    try {
      await navigator.clipboard.writeText(league.code);
      setCopied(true);
      toast.success("Code copie !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const isOwner = league?.created_by === user?.id;

  const shareLeague = async () => {
    if (!league) return;
    haptic("medium");

    const shareUrl = `${window.location.origin}/join/${league?.code}`;
    const shareText = `Join my F1 league "${league.name}" sur PRONOKIF !`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `PRONOKIF - ${league.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (e: unknown) {
        if ((e as DOMException).name !== "AbortError") copyCode();
      }
    } else {
      const whatsappText = `${shareText}\n\n${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
    }
  };

  const startEditing = () => {
    setEditName(league!.name);
    setEditDescription(league!.description || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
  };

  const saveChanges = async () => {
    if (!editName.trim()) {
      toast.error("Le nom ne peut pas etre vide");
      return;
    }
    setSaving(true);
    try {
      await api.leagues.update(leagueId!, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      refetch();
      setIsEditing(false);
      toast.success("League updated!");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Error while updating"));
    } finally {
      setSaving(false);
    }
  };

  const getAvatar = (member: LeagueMemberType): string | null => {
    if (member.custom_avatar_url) return member.custom_avatar_url;
    return null;
  };

  if (loading) return <LeagueDetailSkeleton />;

  if (!league) {
    return (
      <div className="min-h-screen bg-pk-carbon flex items-center justify-center">
        <p className="text-sm text-pk-titane">Ligue non trouvee</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="league-detail-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            {/* Back */}
            <button
              onClick={() => navigate("/league")}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="league-detail-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Title / Edit */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full font-display text-lg bg-pk-anthracite border border-white/[0.08] rounded-lg px-3 py-1.5 text-pk-piste placeholder:text-pk-titane focus:border-pk-red/40 focus:outline-none focus:ring-1 focus:ring-pk-red/20 transition-colors"
                  placeholder="League name"
                  data-testid="league-edit-name"
                />
              ) : (
                <h1 className="font-display text-lg truncate flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-pk-amber flex-shrink-0" />
                  <span className="truncate">{league.name}</span>
                  {isOwner && (
                    <button
                      onClick={startEditing}
                      className="p-1 text-pk-titane hover:text-pk-amber transition-colors flex-shrink-0"
                      title="Edit league"
                      data-testid="league-edit-btn"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-data text-[0.5625rem] text-pk-titane flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {members.length} members
                </span>
                <button
                  onClick={copyCode}
                  className="font-data text-[0.5625rem] text-pk-amber hover:text-pk-amber/80 flex items-center gap-1 transition-colors"
                  data-testid="league-copy-code"
                >
                  {league.code}
                  {copied ? (
                    <Check className="w-3 h-3 text-pk-emerald" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Actions */}
            {isEditing ? (
              <div className="flex gap-1.5">
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-pk-titane hover:text-pk-piste transition-colors disabled:opacity-50"
                  data-testid="league-edit-cancel"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="p-2 rounded-lg bg-pk-emerald/[0.15] border border-pk-emerald/20 text-pk-emerald hover:bg-pk-emerald/[0.25] transition-colors disabled:opacity-50"
                  data-testid="league-edit-save"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={shareLeague}
                  className="p-2 rounded-lg bg-pk-emerald/[0.1] border border-pk-emerald/20 text-pk-emerald hover:bg-pk-emerald/[0.2] transition-colors"
                  title="Share"
                  data-testid="league-share-btn"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    haptic("light");
                    navigate(`/league/${leagueId}/chat`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pk-info/[0.1] border border-pk-info/20 text-pk-info hover:bg-pk-info/[0.2] transition-colors font-data text-[0.5625rem]"
                  data-testid="league-chat-btn"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.div
        className="max-w-2xl mx-auto px-4 pt-4 space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Description */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit-desc"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -6 }}
              className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            >
              <label className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                League description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full bg-pk-anthracite border border-white/[0.08] rounded-lg p-3 text-pk-piste text-sm resize-none focus:border-pk-red/40 focus:outline-none focus:ring-1 focus:ring-pk-red/20 transition-colors placeholder:text-pk-titane"
                rows={3}
                placeholder="Describe your league in a few words... (optional)"
                maxLength={500}
                data-testid="league-edit-description"
              />
              <p className="text-right font-data text-[0.5rem] text-pk-titane mt-1">
                {editDescription.length}/500
              </p>
            </motion.div>
          ) : league.description ? (
            <motion.div
              key="show-desc"
              variants={fadeUp}
              className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 border-l-2 border-l-pk-amber/40"
            >
              <p className="text-sm text-pk-piste/80 leading-relaxed">{league.description}</p>
            </motion.div>
          ) : isOwner ? (
            <motion.button
              key="add-desc"
              variants={fadeUp}
              onClick={startEditing}
              className="w-full bg-pk-surface border border-dashed border-white/[0.12] rounded-lg p-4 text-center group hover:border-pk-amber/30 transition-colors"
              data-testid="league-add-description"
            >
              <FileText className="w-5 h-5 text-pk-titane group-hover:text-pk-amber mx-auto mb-1.5 transition-colors" />
              <p className="text-xs text-pk-titane group-hover:text-pk-piste/70 transition-colors">
                Add a description to your league
              </p>
            </motion.button>
          ) : null}
        </AnimatePresence>

        {/* Tab Toggle */}
        <motion.div variants={fadeUp} className="flex gap-1.5">
          {[
            { id: "leaderboard", label: "Leaderboard", Icon: Trophy },
            { id: "members", label: "Members", Icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                haptic("light");
                setActiveTab(tab.id);
              }}
              className={`flex-1 py-2.5 rounded-lg font-display text-sm transition-colors flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-pk-red-subtle border border-pk-red/30 text-pk-red"
                  : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
              data-testid={`league-tab-${tab.id}`}
            >
              <tab.Icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "leaderboard" ? (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <LeagueLeaderboard
                leaderboard={leaderboard}
                members={members}
                userId={user?.id ?? ""}
                getAvatar={getAvatar}
              />
            </motion.div>
          ) : (
            <motion.div
              key="members"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LeagueMembers
                members={members}
                leaderboard={leaderboard}
                userId={user?.id ?? ""}
                ownerId={league.owner_id ?? ""}
                getAvatar={getAvatar}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        <LeagueSettings
          league={league}
          leagueId={leagueId}
          members={members}
          avatars={avatars}
          userId={user?.id ?? ""}
          isOwner={isOwner}
          onRefresh={refetch}
        />
      </motion.div>
    </div>
  );
}
