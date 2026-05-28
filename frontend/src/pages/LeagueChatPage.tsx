/**
 * LeagueChatPage — League chat with classic bubbles.
 * Broadcast Premium theme: glass header, member strip, pk-* bubbles.
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, Send, Users, MessageCircle, RefreshCw, Crown, Clock } from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { api, getApiError } from "@/lib/api";
import type { AvatarsResponse, LeagueMember, ChatMessageResponse } from "@/types/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { fadeUp, getReducedMotionProps } from "@/lib/motion";
import { EmptyFullPage } from "@/components/EmptyState";

/* ── Skeleton ──────────────────────────────────────────── */

function ChatSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08] p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-pk-anthracite animate-shimmer" />
          <div className="h-5 w-32 rounded bg-pk-anthracite animate-shimmer" />
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-pk-anthracite animate-shimmer" />
            <div
              className="h-10 rounded-2xl bg-pk-anthracite animate-shimmer"
              style={{ width: `${40 + ((i * 12) % 30)}%`, animationDelay: `${i * 100}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return "A l'instant";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000)
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueChatPage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  /* ── Data queries ────────────────────────────────────── */

  const { data: league = null, isLoading: leagueLoading } = useQuery({
    queryKey: ["/leagues", leagueId],
    queryFn: () => api.leagues.get(leagueId!),
    enabled: !!leagueId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/leagues", leagueId, "messages"],
    queryFn: async () => {
      const data = await api.chat.messages(leagueId!);
      api.chat.markRead(leagueId!).catch(() => {});
      return data;
    },
    enabled: !!leagueId,
    refetchInterval: 15_000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/leagues", leagueId, "members"],
    queryFn: () => api.leagues.members(leagueId!),
    enabled: !!leagueId,
  });

  const { data: avatars = {} as AvatarsResponse } = useQuery<AvatarsResponse>({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  /* ── Scroll to bottom on new messages ────────────────── */

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ── Actions ─────────────────────────────────────────── */

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      haptic("light");
      await api.chat.send(leagueId!, { content: newMessage.trim() });
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/leagues", leagueId, "messages"] });
    } catch (e: unknown) {
      toast.error(getApiError(e, "Erreur lors de l'envoi"));
    } finally {
      setSending(false);
    }
  };

  const refreshMessages = () => {
    haptic("light");
    queryClient.invalidateQueries({ queryKey: ["/leagues", leagueId, "messages"] });
    toast.success("Messages actualisés");
  };

  const getAvatarById = (avatarId: string | undefined) => {
    return avatars?.all?.find((a: { id: string }) => a.id === avatarId) || null;
  };

  const navigateToProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  /* ── Loading ─────────────────────────────────────────── */

  if (leagueLoading) return <ChatSkeleton />;

  if (!league) {
    return (
      <div className="min-h-screen bg-pk-carbon">
        <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
          <div className="px-4 pt-3 pb-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg">Discussion</h1>
          </div>
        </header>
        <EmptyFullPage
          Icon={MessageCircle}
          title="Ligue non trouvée"
          description="Cette ligue n'existe pas ou tu n'y as plus accès."
        />
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-pk-carbon flex flex-col" data-testid="league-chat-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
                data-testid="back-btn"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-pk-info" />
                  <h1 className="font-display text-base truncate max-w-[200px]">{league.name}</h1>
                </div>
                <p className="font-data text-[0.5625rem] text-pk-titane ml-6">
                  {members.length} membre{members.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <button
              onClick={refreshMessages}
              className="p-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Member strip */}
        <div className="flex gap-1 px-4 pb-2.5 overflow-x-auto scrollbar-none">
          {(members as LeagueMember[]).map((member, i) => (
            <motion.button
              key={member.id}
              onClick={() => navigateToProfile(member.id)}
              className="flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-white/[0.04] transition-colors min-w-[48px]"
              data-testid={`member-${member.id}`}
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.03 }}
            >
              <div className="relative">
                <AvatarDisplay
                  avatar={getAvatarById(member.avatar_id)}
                  customUrl={member.custom_avatar_url}
                  size="sm"
                />
                {member.is_owner && (
                  <Crown className="w-2.5 h-2.5 text-pk-amber absolute -top-0.5 -right-0.5" />
                )}
              </div>
              <span
                className={`font-data text-[0.5rem] truncate max-w-[44px] ${
                  member.id === user?.id ? "text-pk-red" : "text-pk-titane"
                }`}
              >
                {member.id === user?.id ? "Toi" : member.username}
              </span>
            </motion.button>
          ))}
        </div>
      </header>

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-28">
        <div className="max-w-2xl mx-auto space-y-2.5">
          {messages.length === 0 ? (
            <EmptyFullPage
              Icon={MessageCircle}
              title="Aucun message"
              description="Sois le premier à écrire !"
            />
          ) : (
            (messages as ChatMessageResponse[]).map((msg, index) => {
              const isMe = msg.user_id === user?.id;
              const prevMsg = (messages as ChatMessageResponse[])[index - 1];
              const showAvatar = index === 0 || prevMsg?.user_id !== msg.user_id;

              return (
                <motion.div
                  key={msg.id}
                  className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                  data-testid={`message-${msg.id}`}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Avatar */}
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

                  {/* Bubble */}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                    {showAvatar && (
                      <button
                        onClick={() => navigateToProfile(msg.user_id)}
                        className={`font-data text-[0.5625rem] mb-0.5 hover:underline block ${
                          isMe ? "text-pk-red text-right" : "text-pk-titane"
                        }`}
                      >
                        {isMe ? "Toi" : msg.username}
                      </button>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2 ${
                        isMe
                          ? "bg-pk-red text-white rounded-tr-md"
                          : "bg-pk-surface border border-white/[0.08] text-pk-piste rounded-tl-md"
                      }`}
                    >
                      <p className="text-sm break-words leading-snug">{msg.content}</p>
                    </div>
                    <p
                      className={`font-data text-[0.5rem] text-pk-titane mt-0.5 flex items-center gap-0.5 ${
                        isMe ? "justify-end" : ""
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input — fixed above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-pk-carbon/90 backdrop-blur-lg border-t border-white/[0.08] px-4 py-3">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écris un message..."
            maxLength={500}
            className="flex-1 h-11 px-4 bg-pk-surface border border-white/[0.08] rounded-full text-sm text-pk-piste placeholder:text-pk-titane/40 focus:outline-none focus:border-pk-red/40 focus:ring-1 focus:ring-pk-red/15 transition-colors"
            data-testid="message-input"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-11 h-11 rounded-full bg-pk-red text-white flex items-center justify-center shadow-glow-red active:scale-[0.93] transition-transform disabled:opacity-40 disabled:active:scale-100"
            data-testid="send-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
