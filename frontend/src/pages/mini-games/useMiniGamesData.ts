/**
 * MiniGames data hook — fetches leaderboards, attempts, and handles submissions.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function useMiniGamesData() {
  const queryClient = useQueryClient();

  // ── Base queries ─────────────────────────────────────────────
  const { data: leagues = [] } = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my(),
  });

  const { data: nextRace = null } = useQuery({
    queryKey: ["/races/next"],
    queryFn: () => api.races.next(),
  });

  const { data: avatars = {} as { all?: any[] }, isLoading: loading } = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  const { data: globalReactionLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/global-leaderboard/reaction"],
    queryFn: async () => (await api.minigames.globalLeaderboard("reaction")).leaderboard || [],
  });

  const { data: globalBatakLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/global-leaderboard/batak"],
    queryFn: async () => (await api.minigames.globalLeaderboard("batak")).leaderboard || [],
  });

  // ── Dependent queries ─────────────────────────────────────────
  const { data: reactionAttempts = { used: 0, remaining: 3 } } = useQuery({
    queryKey: ["/minigames/attempts/reaction", nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.attempts("reaction", "global", nextRace!.id);
      return { used: res.attempts_used, remaining: res.attempts_remaining };
    },
    enabled: !!nextRace?.id,
  });

  const { data: batakAttempts = { used: 0, remaining: 3 } } = useQuery({
    queryKey: ["/minigames/attempts/batak", nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.attempts("batak", "global", nextRace!.id);
      return { used: res.attempts_used, remaining: res.attempts_remaining };
    },
    enabled: !!nextRace?.id,
  });

  const { data: reactionLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/leaderboard/reaction", leagues[0]?.id, nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.leaderboard("reaction", leagues[0]!.id, nextRace!.id);
      return res.leaderboard || [];
    },
    enabled: !!nextRace?.id && leagues.length > 0,
  });

  const { data: batakLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/leaderboard/batak", leagues[0]?.id, nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.leaderboard("batak", leagues[0]!.id, nextRace!.id);
      return res.leaderboard || [];
    },
    enabled: !!nextRace?.id && leagues.length > 0,
  });

  // ── Mutations ─────────────────────────────────────────────────
  const invalidateCompetition = () => {
    queryClient.invalidateQueries({ queryKey: ["/minigames/attempts"] });
    queryClient.invalidateQueries({ queryKey: ["/minigames/leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["/minigames/global-leaderboard"] });
  };

  const handleReactionSubmit = async (reactionTime: number, isTraining: boolean) => {
    try {
      await api.minigames.submitReaction({
        race_id: nextRace!.id,
        league_id: "global",
        reaction_time_ms: reactionTime,
        is_training: isTraining,
      });
      if (!isTraining) {
        toast.success(`Temps enregistré: ${reactionTime}ms`);
        invalidateCompetition();
      } else {
        toast.success(`Temps: ${reactionTime}ms (Entraînement)`);
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Erreur",
      );
    }
  };

  const handleBatakSubmit = async (score: number, timeSeconds: number, isTraining: boolean) => {
    try {
      await api.minigames.submitBatak({
        race_id: nextRace!.id,
        league_id: "global",
        score,
        time_seconds: timeSeconds,
        is_training: isTraining,
      });
      if (!isTraining) {
        toast.success(`Score enregistré: ${score} cibles`);
        invalidateCompetition();
      } else {
        toast.success(`Score: ${score} cibles (Entraînement)`);
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Erreur",
      );
    }
  };

  const getAvatarById = (avatarId: string | undefined) =>
    avatars?.all?.find((a: any) => a.id === avatarId) || null;

  return {
    loading,
    nextRace,
    avatars,
    leagues,
    reactionAttempts,
    batakAttempts,
    reactionLeaderboard,
    batakLeaderboard,
    globalReactionLeaderboard,
    globalBatakLeaderboard,
    handleReactionSubmit,
    handleBatakSubmit,
    getAvatarById,
  };
}
