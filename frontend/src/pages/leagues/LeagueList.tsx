import { useNavigate } from "react-router-dom";
import { Users, Copy, Share2, Check, MessageCircle, ChevronRight, Star } from "lucide-react";
import { Button } from "../../components/ui/button";

// ------------------------------------------------------------------ types ---

export interface LeagueMember {
  id: string | number;
  [key: string]: unknown;
}

export interface LeagueItem {
  id: string | number;
  name: string;
  code: string;
  members?: LeagueMember[];
  [key: string]: unknown;
}

export interface LeagueListProps {
  leagues: LeagueItem[];
  loading: boolean;
  userId: string | number;
  currentLeagueId: string | number | null | undefined;
  copied: string | null;
  unreadByLeague: Record<string | number, number>;
  onCopyCode: (code: string) => void;
  onShareLeague: (league: LeagueItem) => void;
  onSelectLeague: (id: string | number) => void;
}

// ----------------------------------------------------------- component ---

export default function LeagueList({
  leagues,
  loading,
  userId,
  currentLeagueId,
  copied,
  unreadByLeague,
  onCopyCode,
  onShareLeague,
  onSelectLeague,
}: LeagueListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="card-arcade p-8 text-center mb-6">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="card-arcade p-6 text-center mb-6">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="font-body text-gray-400">Tu n'as pas encore de ligue</p>
        <p className="font-body text-gray-500 text-sm">Cree ou rejoins une ligue ci-dessous</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {leagues.map((league) => {
        const isActive = currentLeagueId === league.id;
        const unreadCount = unreadByLeague[league.id] ?? 0;
        return (
          <div
            key={league.id as string}
            className={`card-arcade p-4 transition-all ${
              isActive ? "border-2 border-yellow-500 bg-yellow-500/10" : "hover:border-cyan-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isActive ? "bg-gradient-to-br from-yellow-500 to-yellow-700" : "bg-gray-800"
                  }`}
                >
                  {isActive ? (
                    <Star className="w-5 h-5 text-white" />
                  ) : (
                    <Users className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-white text-sm truncate">{league.name}</h3>
                    {isActive && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-heading">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {league.members?.length ?? 0}
                    </span>
                    <span className="font-data">{league.code}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareLeague(league);
                  }}
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-8 w-8"
                  title="Partager"
                >
                  <Share2 className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyCode(league.code);
                  }}
                  className="text-gray-500 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  {copied === league.code ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/league/${league.id}/chat`);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 w-8 relative"
                >
                  <MessageCircle className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {isActive ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/league/${league.id}/details`)}
                    className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white h-8 px-3"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onSelectLeague(league.id)}
                    className="bg-gray-700 hover:bg-gray-600 text-white h-8 px-3"
                  >
                    Activer
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
