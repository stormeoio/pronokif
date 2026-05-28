/**
 * MyLeaguesSection — Profile sub-section showing user's leagues.
 * Broadcast Premium: pk-surface cards, pk-red active highlight.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Plus, Copy, Share2, Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { League } from "@/types/api";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer } from "@/lib/motion";

interface MyLeaguesSectionProps {
  leagues: League[];
  currentLeagueId: string | null;
}

export function MyLeaguesSection({ leagues, currentLeagueId }: MyLeaguesSectionProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      haptic("light");
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success("Code copie !");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async (league: League) => {
    const shareUrl = `${window.location.origin}/join/${league.code}`;
    const shareText = `Join my F1 league "${league.name}" sur PRONOKIF !`;
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
      haptic("medium");
      await api.leagues.select(leagueId);
      toast.success("Ligue selectionnee !");
      window.location.reload();
    } catch {
      toast.error("Error");
    }
  };

  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-pk-info/[0.12] flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-pk-info" />
          </div>
          <span className="font-display text-sm">My leagues</span>
        </div>
        <button
          onClick={() => navigate("/league")}
          className="flex items-center gap-1 font-data text-[0.5625rem] text-pk-red font-semibold"
          data-testid="profile-add-league"
        >
          <Plus className="w-3 h-3" />
          Ajouter
        </button>
      </div>

      <div className="p-3">
        {leagues.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-pk-titane mx-auto mb-2 opacity-40" />
            <p className="text-xs text-pk-titane mb-3">No league</p>
            <button
              onClick={() => navigate("/league")}
              className="h-9 px-4 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform"
            >
              Creer / Join
            </button>
          </div>
        ) : (
          <motion.div
            className="space-y-1.5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {leagues.map((league) => {
              const isActive = league.id === currentLeagueId;

              return (
                <motion.div
                  key={league.id}
                  variants={fadeUp}
                  className={`p-3 rounded-md transition-colors ${
                    isActive
                      ? "bg-pk-red-subtle border border-pk-red/20"
                      : "bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`font-display text-sm truncate ${isActive ? "text-pk-red" : ""}`}
                        >
                          {league.name}
                        </p>
                        {isActive && <Crown className="w-3 h-3 text-pk-red flex-shrink-0" />}
                      </div>
                      <p className="font-data text-[0.5625rem] text-pk-titane mt-0.5">
                        {league.members?.length ?? 0} members ·{" "}
                        <span className="text-pk-info">{league.code}</span>
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => copyCode(league.code)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
                      >
                        {copied === league.code ? (
                          <Check className="w-3 h-3 text-pk-emerald" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => shareLeague(league)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {!isActive && (
                    <button
                      onClick={() => selectLeague(league.id)}
                      className="w-full mt-2 h-8 rounded-md bg-white/[0.04] border border-white/[0.08] text-pk-piste font-data text-[0.5625rem] font-bold active:scale-[0.97] transition-transform"
                    >
                      Selectionner
                    </button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
