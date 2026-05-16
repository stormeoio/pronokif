import { useNavigate } from "react-router-dom";
import {
  Trophy,
  ChevronRight,
  Users,
  Star,
  Plus,
  MessageCircle,
  HelpCircle,
  Share2,
} from "lucide-react";
import { Button } from "../../components/ui/button";

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

export function LeaguesList({ userLeagues, user, unreadChatByLeague }: LeaguesListProps) {
  const navigate = useNavigate();

  if (userLeagues.length === 0) return null;

  return (
    <div className="card-arcade overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-600/20 to-transparent p-3 border-b border-yellow-500/30">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base text-white uppercase flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Mes Ligues
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/league")}
            className="text-green-400 font-body text-xs hover:text-green-300 hover:bg-green-500/10"
            data-testid="add-league-btn"
          >
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {userLeagues.map((leagueItem) => {
          const unreadCount = unreadChatByLeague[leagueItem.id] || 0;
          const isActive = leagueItem.id === user?.current_league_id;

          const handleShare = (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const shareUrl = `${window.location.origin}/join/${leagueItem.code}`;
            if (navigator.share) {
              navigator.share({ title: `Rejoins ${leagueItem.name} sur PRONOKIF!`, url: shareUrl });
            } else {
              navigator.clipboard.writeText(shareUrl);
            }
          };

          return (
            <div
              key={leagueItem.id}
              onClick={() => navigate(`/league/${leagueItem.id}/details`)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20"
                  : "bg-white/5 hover:bg-white/10"
              }`}
              data-testid={`league-item-${leagueItem.id}`}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center shadow">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-white uppercase truncate flex items-center gap-1">
                  {leagueItem.name}
                  {isActive && (
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  )}
                </p>
                <p className="font-body text-xs text-gray-400">
                  {leagueItem.member_count || leagueItem.members?.length || 0} membres
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/league/${leagueItem.id}/chat`);
                  }}
                  className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-colors relative"
                  data-testid={`league-chat-${leagueItem.id}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors"
                  data-testid={`league-share-${leagueItem.id}`}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-2 bg-kerb-stripe" />
    </div>
  );
}

export function NoLeagueCTA() {
  const navigate = useNavigate();
  return (
    <div className="card-gold p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl">
        <Users className="w-8 h-8 text-yellow-900" />
      </div>
      <h3 className="font-heading text-2xl text-yellow-800 uppercase mb-2">Rejoins une Ligue !</h3>
      <p className="font-body text-yellow-700 text-sm mb-5">
        Crée ou rejoins une ligue pour jouer avec tes amis
      </p>
      <Button onClick={() => navigate("/league")} className="btn-racing px-8 py-3">
        C'est parti !
      </Button>
    </div>
  );
}

interface HelpAdminCardProps {
  onClick: () => void;
}

export function HelpAdminCard({ onClick }: HelpAdminCardProps) {
  return (
    <div
      onClick={onClick}
      className="card-arcade p-4 cursor-pointer hover:ring-2 hover:ring-cyan-500/50 transition-all"
      data-testid="help-admin-card"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl flex items-center justify-center shadow-lg">
          <HelpCircle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-sm text-white uppercase">Aider l'administrateur</h3>
          <p className="font-body text-xs text-gray-400">
            Signalez un bug, faites une suggestion ou partagez votre avis
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-cyan-400" />
      </div>
    </div>
  );
}
