import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Users, Plus, MessageCircle, Share2, HelpCircle } from "lucide-react";
import { iconSmall } from "@/lib/icons";
import { fadeUp, staggerContainer } from "@/lib/motion";

// ----------------------------------------------------------- types ---

interface LeagueItem {
  id: string | number;
  name: string;
  code: string;
  member_count?: number;
  members?: unknown[];
}

interface LeaguesListProps {
  userLeagues: LeagueItem[];
  user: { current_league_id?: string | number } | null;
  unreadChatByLeague: Record<string | number, number>;
}

// ----------------------------------------------------------- LeaguesList ---

export function LeaguesList({ userLeagues, user, unreadChatByLeague }: LeaguesListProps) {
  const navigate = useNavigate();

  if (userLeagues.length === 0) return null;

  return (
    <div
      className="bg-pk-surface border border-white/[0.08] rounded-md overflow-hidden"
      data-testid="leagues-list"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between
          px-3.5 py-2.5
          bg-pk-red-subtle border-b border-white/[0.08]"
      >
        <h3 className="font-display text-[0.875rem] uppercase flex items-center gap-2">
          <Users size={16} strokeWidth={1.5} className="text-pk-red" />
          Mes ligues
        </h3>
        <button
          onClick={() => navigate("/league")}
          className="flex items-center gap-1
            font-mono text-[0.625rem] text-pk-red uppercase tracking-[0.1em]
            hover:underline"
          data-testid="add-league-btn"
        >
          <Plus size={12} strokeWidth={2} />
          Ajouter
        </button>
      </div>

      {/* List */}
      <motion.div
        className="p-2.5 space-y-1.5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {userLeagues.map((league) => {
          const unread = unreadChatByLeague[league.id] || 0;
          const isActive = league.id === user?.current_league_id;

          const handleShare = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const url = `${window.location.origin}/join/${league.code}`;
            if (navigator.share) {
              navigator.share({
                title: `Rejoins ${league.name} sur PronoKif!`,
                url,
              });
            } else {
              navigator.clipboard.writeText(url);
            }
          };

          return (
            <motion.div
              key={league.id}
              variants={fadeUp}
              onClick={() => navigate(`/league/${league.id}/details`)}
              className={`
                flex items-center gap-3 p-3 rounded-md
                cursor-pointer transition-all duration-pk-short
                ${
                  isActive
                    ? "bg-pk-red-subtle border border-[rgba(225,6,0,0.12)]"
                    : "hover:bg-white/[0.03]"
                }
              `}
              data-testid={`league-item-${league.id}`}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-10 h-10 rounded-md bg-pk-anthracite
                  flex items-center justify-center flex-shrink-0
                  border border-white/[0.06]"
              >
                <Users size={18} strokeWidth={1.5} className="text-pk-titane" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[0.8125rem] truncate">{league.name}</p>
                <p className="font-mono text-[0.625rem] text-pk-titane">
                  {league.member_count || (league.members as unknown[])?.length || 0} membres
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/league/${league.id}/chat`);
                  }}
                  className="relative p-2 rounded-md text-pk-titane
                    hover:text-pk-piste hover:bg-white/[0.04]
                    transition-colors duration-pk-short"
                  data-testid={`league-chat-${league.id}`}
                >
                  <MessageCircle size={15} strokeWidth={1.5} />
                  {unread > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5
                        bg-pk-red rounded-full
                        flex items-center justify-center
                        text-[8px] font-bold text-white"
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-md text-pk-titane
                    hover:text-pk-piste hover:bg-white/[0.04]
                    transition-colors duration-pk-short"
                  data-testid={`league-share-${league.id}`}
                >
                  <Share2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ----------------------------------------------------------- NoLeagueCTA ---

export function NoLeagueCTA() {
  const navigate = useNavigate();
  return (
    <div
      className="bg-pk-surface border border-white/[0.08] rounded-md
        p-6 text-center"
    >
      <div
        className="w-14 h-14 mx-auto mb-3 rounded-full
          bg-pk-red-subtle flex items-center justify-center"
      >
        <Users size={24} strokeWidth={1.5} className="text-pk-red" />
      </div>
      <h3 className="font-display text-[1.25rem] uppercase mb-1">Rejoins une Ligue !</h3>
      <p className="text-[0.8125rem] text-pk-titane mb-5">
        Crée ou rejoins une ligue pour jouer avec tes potes
      </p>
      <button onClick={() => navigate("/league")} className="btn-pk px-8">
        <Plus {...iconSmall} size={14} strokeWidth={2} />
        C'est parti !
      </button>
    </div>
  );
}

// ----------------------------------------------------------- HelpAdminCard ---

interface HelpAdminCardProps {
  onClick: () => void;
}

export function HelpAdminCard({ onClick }: HelpAdminCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-pk-surface border border-white/[0.08] rounded-md p-4
        cursor-pointer hover:border-white/[0.15]
        transition-colors duration-pk-short"
      data-testid="help-admin-card"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-md bg-pk-anthracite
            flex items-center justify-center flex-shrink-0
            border border-white/[0.06]"
        >
          <HelpCircle size={18} strokeWidth={1.5} className="text-pk-titane" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-[0.8125rem]">Aider l'administrateur</p>
          <p className="text-[0.6875rem] text-pk-titane mt-0.5">
            Signaler un bug ou partager un retour
          </p>
        </div>
        <ChevronRight size={16} strokeWidth={1.5} className="text-pk-titane" />
      </div>
    </div>
  );
}
