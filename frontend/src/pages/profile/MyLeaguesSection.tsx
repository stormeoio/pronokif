import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Copy, Share2, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { api } from "@/lib/api";

interface MyLeaguesSectionProps {
  leagues: Record<string, any>[];
  currentLeagueId: string | null;
}

export function MyLeaguesSection({ leagues, currentLeagueId }: MyLeaguesSectionProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success("Code copié !");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async (league: Record<string, any>) => {
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
        if ((e as DOMException).name !== "AbortError") copyCode(league.code);
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
        "_blank",
      );
    }
  };

  const selectLeague = async (leagueId: string) => {
    try {
      await api.leagues.select(leagueId);
      toast.success("Ligue sélectionnée !");
      window.location.reload();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="card-arcade overflow-hidden">
      <div className="h-2 bg-kerb-stripe" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Mes ligues
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/league")}
            className="text-cyan-400 font-body text-sm hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {leagues.map((league) => (
            <div
              key={league.id}
              className={`p-3 rounded-lg ${league.id === currentLeagueId ? "bg-blue-500/20 border border-blue-500/50" : "bg-white/5"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p
                    className={`font-heading text-sm uppercase ${league.id === currentLeagueId ? "text-blue-400" : "text-gray-300"}`}
                  >
                    {league.name}
                    {league.id === currentLeagueId && (
                      <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-yellow-500" />
                    )}
                  </p>
                  <p className="font-body text-xs text-gray-400">
                    {league.members.length} membres • Code:{" "}
                    <span className="font-data text-cyan-400">{league.code}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyCode(league.code)}
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
                    onClick={() => shareLeague(league)}
                    className="text-gray-500 hover:text-white hover:bg-white/10 h-8 w-8"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {league.id !== currentLeagueId && (
                <Button
                  onClick={() => selectLeague(league.id)}
                  className="w-full mt-2 btn-neon text-xs h-8"
                >
                  Sélectionner
                </Button>
              )}
            </div>
          ))}
          {leagues.length === 0 && (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="font-body text-gray-400 text-sm">Aucune ligue</p>
              <Button onClick={() => navigate("/league")} className="mt-3 btn-racing" size="sm">
                Créer / Rejoindre
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
