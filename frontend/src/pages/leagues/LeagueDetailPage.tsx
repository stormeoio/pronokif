import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import LeagueLeaderboard from "./LeagueLeaderboard";
import LeagueMembers from "./LeagueMembers";
import LeagueSettings from "./LeagueSettings";
import { useLeagueDetailData } from "./useLeagueDetailData";
import { api, getApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export default function LeagueDetailPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
      toast.error("Erreur lors du chargement");
      navigate("/league");
    }
  }, [error, navigate]);

  const copyCode = async () => {
    if (!league) return;
    try {
      await navigator.clipboard.writeText(league.code);
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const isOwner = league?.created_by === user?.id;

  const shareLeague = async () => {
    if (!league) return;

    const shareUrl = `${window.location.origin}/join/${league?.code}`;
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur PRONOKIF !`;

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
      toast.error("Le nom ne peut pas être vide");
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
      toast.success("Ligue mise à jour !");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Erreur lors de la mise à jour"));
    } finally {
      setSaving(false);
    }
  };

  const getAvatar = (member: Record<string, unknown>): string | null => {
    if (member.custom_avatar_url) return member.custom_avatar_url as string;
    if (member.avatar_id && avatars?.all) {
      const found = avatars.all.find((a) => a.id === member.avatar_id);
      if (found) return found.url;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <p className="text-gray-400">Ligue non trouvée</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-yellow-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/league")}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="font-heading text-xl bg-gray-800 border-yellow-500 h-9"
                  placeholder="Nom de la ligue"
                />
              ) : (
                <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  {league.name}
                  {isOwner && !isEditing && (
                    <button
                      onClick={startEditing}
                      className="ml-2 p-1 text-gray-500 hover:text-yellow-400 transition-colors"
                      title="Modifier la ligue"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {members.length} membres
                </span>
                <button
                  onClick={copyCode}
                  className="font-data text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                >
                  {league.code}
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={cancelEditing}
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                  disabled={saving}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={saveChanges}
                  className="bg-green-600 hover:bg-green-500 text-white"
                  disabled={saving}
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={shareLeague}
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                  title="Partager"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/league/${leagueId}/chat`)}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {isEditing ? (
          <div className="card-arcade p-4 mb-4">
            <label className="font-heading text-xs text-gray-400 uppercase mb-2 block flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description de la ligue
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-body text-sm resize-none focus:border-yellow-500 focus:outline-none"
              rows={3}
              placeholder="Décris ta ligue en quelques mots... (optionnel)"
              maxLength={500}
            />
            <p className="text-right text-xs text-gray-500 mt-1">{editDescription.length}/500</p>
          </div>
        ) : league.description ? (
          <div className="card-arcade p-4 mb-4 border-l-4 border-yellow-500/50">
            <p className="font-body text-sm text-gray-300 leading-relaxed">{league.description}</p>
          </div>
        ) : isOwner ? (
          <button
            onClick={startEditing}
            className="w-full card-arcade p-4 mb-4 border-dashed border-2 border-gray-700 hover:border-yellow-500/50 transition-colors text-center group"
          >
            <FileText className="w-6 h-6 text-gray-600 group-hover:text-yellow-500 mx-auto mb-2 transition-colors" />
            <p className="font-body text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
              Ajouter une description à ta ligue
            </p>
          </button>
        ) : null}

        {/* Tab Toggle */}
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl backdrop-blur-sm">
          <motion.button
            onClick={() => { haptic("light"); setActiveTab("leaderboard"); }}
            className={`flex-1 py-2 px-4 rounded-lg font-heading text-sm uppercase transition-all flex items-center justify-center gap-2 relative ${activeTab === "leaderboard" ? "text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "leaderboard" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg"
                layoutId="leagueTab"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Classement
            </span>
          </motion.button>
          <motion.button
            onClick={() => { haptic("light"); setActiveTab("members"); }}
            className={`flex-1 py-2 px-4 rounded-lg font-heading text-sm uppercase transition-all flex items-center justify-center gap-2 relative ${activeTab === "members" ? "text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === "members" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg"
                layoutId="leagueTab"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membres
            </span>
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === "leaderboard" ? (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
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
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
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

        <LeagueSettings
          league={league}
          leagueId={leagueId}
          members={members}
          avatars={avatars}
          userId={user?.id ?? ""}
          isOwner={isOwner}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
