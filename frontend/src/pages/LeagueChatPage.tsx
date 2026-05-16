import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send, Users, MessageCircle, RefreshCw, Crown, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LeagueChatPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ── Data queries ──────────────────────────────────────────
  const { data: league = null, isLoading: leagueLoading } = useQuery({
    queryKey: ["/leagues", leagueId],
    queryFn: () => api.leagues.get(leagueId!),
    enabled: !!leagueId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/leagues", leagueId, "messages"],
    queryFn: async () => {
      const data = await api.chat.messages(leagueId!);
      // Mark messages as read (fire & forget)
      api.chat.markRead(leagueId!).catch(() => {});
      return data;
    },
    enabled: !!leagueId,
    refetchInterval: 15_000, // Auto-refresh every 15 seconds
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/leagues", leagueId, "members"],
    queryFn: () => api.leagues.members(leagueId!),
    enabled: !!leagueId,
  });

  const { data: avatars = {} as { all?: any[] } } = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  const loading = leagueLoading;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.chat.send(leagueId!, { content: newMessage.trim() });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/leagues", leagueId, "messages"] });
    } catch (e: unknown) {
      toast.error((e as any).response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const refreshMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["/leagues", leagueId, "messages"] });
    toast.success("Messages actualisés");
  };

  const getAvatarById = (avatarId: string | undefined) => {
    return avatars?.all?.find((a: { id: string }) => a.id === avatarId) || null;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000)
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const navigateToProfile = (userId: any) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-12 skeleton-arcade rounded-xl w-48" />
          <div className="h-96 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-cyan-400 mb-4"
          >
            <ArrowLeft className="w-5 h-5" /> Retour
          </button>
          <div className="card-arcade p-6 text-center">
            <p className="text-red-400">Ligue non trouvée</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main flex flex-col" data-testid="league-chat-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1628] to-transparent p-4 border-b border-blue-500/20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-heading text-lg text-white uppercase tracking-tight flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  {league.name}
                </h1>
                <p className="font-body text-xs text-gray-400">{members.length} membres</p>
              </div>
            </div>
            <button
              onClick={refreshMessages}
              className="p-2 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Members bar */}
      <div className="bg-[#0a1220] border-b border-gray-800 px-4 py-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {members.map((member: any) => (
              <button
                key={member.id}
                onClick={() => navigateToProfile(member.id)}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 transition-colors min-w-[60px]"
                data-testid={`member-${member.id}`}
              >
                <div className="relative">
                  <AvatarDisplay
                    avatar={getAvatarById(member.avatar_id)}
                    customUrl={member.custom_avatar_url}
                    size="sm"
                  />
                  {member.is_owner && (
                    <Crown className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" />
                  )}
                </div>
                <span
                  className={`font-body text-[10px] truncate max-w-[50px] ${
                    member.id === user?.id ? "text-cyan-400" : "text-gray-400"
                  }`}
                >
                  {member.id === user?.id ? "Toi" : member.username}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 pb-24"
        style={{ maxHeight: "calc(100vh - 250px)" }}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-heading text-lg text-gray-400 uppercase">Aucun message</p>
              <p className="font-body text-sm text-gray-500">Sois le premier à écrire !</p>
            </div>
          ) : (
            messages.map((msg: any, index: any) => {
              const isMe = msg.user_id === user?.id;
              const showAvatar = index === 0 || messages[index - 1]?.user_id !== msg.user_id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                  data-testid={`message-${msg.id}`}
                >
                  {showAvatar ? (
                    <button
                      onClick={() => navigateToProfile(msg.user_id)}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <AvatarDisplay
                        avatar={getAvatarById(msg.avatar_id)}
                        customUrl={msg.custom_avatar_url}
                        size="sm"
                      />
                    </button>
                  ) : (
                    <div className="w-8" />
                  )}

                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {showAvatar && (
                      <button
                        onClick={() => navigateToProfile(msg.user_id)}
                        className={`font-body text-xs mb-1 hover:underline ${
                          isMe ? "text-cyan-400 text-right block" : "text-gray-400"
                        }`}
                      >
                        {isMe ? "Toi" : msg.username}
                      </button>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-tr-sm"
                          : "bg-gray-800 text-gray-100 rounded-tl-sm"
                      }`}
                    >
                      <p className="font-body text-sm break-words">{msg.content}</p>
                    </div>
                    <p
                      className={`font-body text-[10px] text-gray-500 mt-1 flex items-center gap-1 ${
                        isMe ? "justify-end" : ""
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-gradient-to-t from-[#050a14] via-[#050a14] to-transparent pt-4 pb-4 px-4">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écris un message..."
              maxLength={500}
              className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 
                        focus:border-cyan-500 focus:ring-cyan-500/30 rounded-xl h-12"
              data-testid="message-input"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="btn-racing h-12 px-4"
              data-testid="send-btn"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
