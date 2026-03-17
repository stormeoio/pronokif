import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { 
  ChevronLeft, Users, Trophy, Crown, Medal, Award, 
  MessageCircle, Copy, Check, Star, User, Target,
  Edit2, X, Save, FileText, LogOut, Share2, Loader2,
  Trash2, UserCog, AlertTriangle
} from "lucide-react";

export default function LeagueDetailPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("leaderboard"); // leaderboard, members
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Leave league states
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  // Delete league states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Transfer ownership states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [leagueRes, membersRes, leaderboardRes, avatarsRes] = await Promise.all([
        apiClient.get(`/leagues/${leagueId}`),
        apiClient.get(`/leagues/${leagueId}/members`),
        apiClient.get(`/leagues/${leagueId}/leaderboard`),
        apiClient.get("/avatars")
      ]);
      
      setLeague(leagueRes.data);
      setMembers(membersRes.data);
      setLeaderboard(leaderboardRes.data);
      setAvatars(avatarsRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
      navigate("/league");
    } finally {
      setLoading(false);
    }
  }, [leagueId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const isOwner = league?.created_by === user.id;
  
  // Get the base URL for share links
  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${league?.code}`;
  };

  const shareLeague = async () => {
    if (!league) return;
    
    const shareUrl = getShareUrl();
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur PRONOKIF !`;
    
    if (navigator.share) {
      try {
        await navigator.share({ 
          title: `PRONOKIF - ${league.name}`, 
          text: shareText,
          url: shareUrl
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          // Fallback to copy
          copyCode();
        }
      }
    } else {
      // Fallback: open WhatsApp with link
      const whatsappText = `${shareText}\n\n${shareUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const leaveLeague = async () => {
    setLeaving(true);
    try {
      await apiClient.post(`/leagues/${leagueId}/leave`);
      toast.success("Tu as quitté la ligue");
      navigate("/league");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du départ");
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const deleteLeague = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/leagues/${leagueId}`);
      toast.success("La ligue a été supprimée");
      navigate("/league");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const transferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error("Sélectionne un nouveau propriétaire");
      return;
    }
    
    setTransferring(true);
    try {
      const res = await apiClient.post(`/leagues/${leagueId}/transfer`, {
        new_owner_id: selectedNewOwner
      });
      toast.success(res.data.message || "Propriété transférée !");
      setShowTransferModal(false);
      setSelectedNewOwner(null);
      // Refresh league data
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du transfert");
    } finally {
      setTransferring(false);
    }
  };

  const startEditing = () => {
    setEditName(league.name);
    setEditDescription(league.description || "");
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
      const res = await apiClient.put(`/leagues/${leagueId}`, {
        name: editName.trim(),
        description: editDescription.trim() || null
      });
      setLeague(res.data);
      setIsEditing(false);
      toast.success("Ligue mise à jour !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const getAvatar = (member) => {
    if (member.custom_avatar_url) return member.custom_avatar_url;
    if (member.avatar_id && avatars[member.avatar_id]) return avatars[member.avatar_id];
    return null;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="font-data text-gray-500 w-5 text-center">{rank}</span>;
  };

  const getRankStyle = (rank) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/50";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/50";
    return "bg-gray-800/30 border-gray-700/50";
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

      {/* Description Section */}
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
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex-1 py-2 px-4 rounded-lg font-heading text-sm uppercase transition-all flex items-center justify-center gap-2 ${
              activeTab === "leaderboard" 
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Classement
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-2 px-4 rounded-lg font-heading text-sm uppercase transition-all flex items-center justify-center gap-2 ${
              activeTab === "members" 
                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            Membres
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {activeTab === "leaderboard" ? (
          /* Leaderboard Tab */
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="card-arcade p-8 text-center">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-body text-gray-400">Aucun classement disponible</p>
                <p className="font-body text-xs text-gray-500 mt-1">Les points seront calculés après les courses</p>
              </div>
            ) : (
              leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isMe = entry.user_id === user.id;
                const member = members.find(m => m.id === entry.user_id);
                const avatar = member ? getAvatar(member) : null;
                
                return (
                  <div 
                    key={entry.user_id}
                    className={`p-3 rounded-lg border transition-all ${getRankStyle(rank)} ${isMe ? 'ring-2 ring-cyan-500/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                      
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                        {avatar ? (
                          <img src={avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-heading text-sm truncate ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                          {entry.username || "Anonyme"}
                          {isMe && <span className="text-xs text-cyan-400/70 ml-2">(toi)</span>}
                        </p>
                        <p className="font-body text-xs text-gray-500">
                          Niveau {member?.level || 1}
                        </p>
                      </div>
                      
                      {/* Points */}
                      <div className="text-right">
                        <p className={`font-data text-lg ${rank <= 3 ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.total_points}
                        </p>
                        <p className="font-body text-[10px] text-gray-500 uppercase">points</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Members Tab */
          <div className="space-y-2">
            {members.map((member) => {
              const isMe = member.id === user.id;
              const isOwner = league.owner_id === member.id;
              const avatar = getAvatar(member);
              const leaderboardEntry = leaderboard.find(e => e.user_id === member.id);
              
              return (
                <button
                  key={member.id}
                  onClick={() => navigate(`/profile/${member.id}`)}
                  className={`w-full p-3 rounded-lg border bg-gray-800/30 border-gray-700/50 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left ${isMe ? 'ring-2 ring-cyan-500/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 relative">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      {isOwner && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-heading text-sm truncate ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                          {member.username || "Anonyme"}
                        </p>
                        {isMe && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">TOI</span>}
                        {isOwner && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">CRÉATEUR</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-body text-xs text-gray-500 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Niveau {member.level || 1}
                        </span>
                        <span className="font-body text-xs text-gray-500 flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {member.xp || 0} XP
                        </span>
                      </div>
                    </div>
                    
                    {/* Points in league */}
                    <div className="text-right">
                      <p className="font-data text-lg text-yellow-400">
                        {leaderboardEntry?.total_points || 0}
                      </p>
                      <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Leave League Button */}
        <div className="mt-8 pt-6 border-t border-gray-700/50 space-y-3">
          {/* Owner Actions */}
          {isOwner && (
            <div className="space-y-2 mb-4">
              <p className="font-heading text-xs text-yellow-400 uppercase flex items-center gap-2">
                <Crown className="w-3 h-3" />
                Actions du créateur
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowTransferModal(true)}
                  variant="outline"
                  className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500"
                  data-testid="transfer-ownership-btn"
                >
                  <UserCog className="w-4 h-4 mr-2" />
                  Transférer
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
                  data-testid="delete-league-btn"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
          
          {/* Leave Button (for non-owners) */}
          {!isOwner && (
            <Button
              onClick={() => setShowLeaveConfirm(true)}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
              data-testid="leave-league-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Quitter la ligue
            </Button>
          )}
        </div>
      </div>
      
      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md card-arcade overflow-hidden max-h-[80vh] flex flex-col">
            <div className="bg-gradient-to-r from-cyan-600/20 to-transparent px-4 py-3 border-b border-cyan-500/30 flex items-center justify-between">
              <h3 className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Transférer la propriété
              </h3>
              <button onClick={() => { setShowTransferModal(false); setSelectedNewOwner(null); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <p className="font-body text-sm text-gray-300">
                Sélectionne le nouveau propriétaire de la ligue <span className="text-yellow-400 font-semibold">{league.name}</span>
              </p>
              
              <div className="space-y-2">
                {members.filter(m => m.id !== user.id).map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedNewOwner(member.id)}
                    className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                      selectedNewOwner === member.id
                        ? 'bg-cyan-500/20 border-cyan-500'
                        : 'bg-gray-800/30 border-gray-700/50 hover:border-cyan-500/50'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading"
                      style={{ backgroundColor: avatars[member.id]?.color || '#3b82f6' }}
                    >
                      {avatars[member.id]?.emoji || member.username?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="font-heading text-sm text-white">{member.username || "Sans pseudo"}</p>
                      <p className="font-body text-xs text-gray-500">Niveau {member.level || 1}</p>
                    </div>
                    {selectedNewOwner === member.id && (
                      <Check className="w-5 h-5 text-cyan-400" />
                    )}
                  </button>
                ))}
                
                {members.filter(m => m.id !== user.id).length === 0 && (
                  <div className="text-center py-6">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="font-body text-sm text-gray-500">Aucun autre membre à qui transférer</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => { setShowTransferModal(false); setSelectedNewOwner(null); }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={transferring}
                >
                  Annuler
                </Button>
                <Button
                  onClick={transferOwnership}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={transferring || !selectedNewOwner}
                  data-testid="confirm-transfer-btn"
                >
                  {transferring ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transfert...</>
                  ) : (
                    <><UserCog className="w-4 h-4 mr-2" /> Transférer</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete League Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md card-arcade overflow-hidden">
            <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/30">
              <h3 className="font-heading text-sm uppercase text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Supprimer la ligue
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="font-body text-gray-300">
                Es-tu sûr(e) de vouloir supprimer <span className="text-white font-semibold">{league.name}</span> ?
              </p>
              <p className="font-body text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                ⚠️ Cette action est irréversible. Tous les membres seront retirés et les données de la ligue (messages, classement) seront supprimées.
              </p>
              {members.length > 1 && (
                <p className="font-body text-sm text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                  📢 {members.length - 1} autre{members.length > 2 ? 's' : ''} membre{members.length > 2 ? 's' : ''} sera{members.length > 2 ? 'ont' : ''} retiré{members.length > 2 ? 's' : ''} de la ligue.
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={deleting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={deleteLeague}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleting}
                  data-testid="confirm-delete-league-btn"
                >
                  {deleting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...</>
                  ) : (
                    <><Trash2 className="w-4 h-4 mr-2" /> Supprimer</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md card-arcade overflow-hidden">
            <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/30">
              <h3 className="font-heading text-sm uppercase text-red-400 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Quitter la ligue
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="font-body text-gray-300">
                Es-tu sûr(e) de vouloir quitter <span className="text-white font-semibold">{league.name}</span> ?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowLeaveConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={leaving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={leaveLeague}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={leaving}
                  data-testid="confirm-leave-btn"
                >
                  {leaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Départ...</>
                  ) : (
                    <><LogOut className="w-4 h-4 mr-2" /> Quitter</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
