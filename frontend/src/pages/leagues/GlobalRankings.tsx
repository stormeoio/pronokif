/**
 * GlobalRankings — global Pronokif leaderboards shown under the user's leagues.
 *
 * Two views:
 *   - Ligues   : every league ranked by total points (member's leagues highlighted)
 *   - Joueurs  : every player ranked by total points (the current user highlighted)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Users, Crown, Medal, Award, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { UserIdentity } from "@/components/users/UserIdentity";
import type { LeagueLeaderboardEntry, LeaderboardEntry } from "@/types/api";

type View = "leagues" | "players";

function RankBadge({ position }: { position: number }) {
  if (position === 1)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pk-gold/15">
        <Crown className="h-3.5 w-3.5 text-pk-gold" />
      </span>
    );
  if (position === 2)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pk-silver/15">
        <Medal className="h-3.5 w-3.5 text-pk-silver" />
      </span>
    );
  if (position === 3)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-pk-bronze/15">
        <Award className="h-3.5 w-3.5 text-pk-bronze" />
      </span>
    );
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.04] font-data text-[0.6875rem] font-bold text-pk-titane">
      {position}
    </span>
  );
}

export default function GlobalRankings({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("leagues");

  const leaguesQuery = useQuery({
    queryKey: ["/leaderboard/leagues"],
    queryFn: () => api.leaderboard.leaguesGlobal(100),
    enabled: view === "leagues",
    staleTime: 60_000,
  });

  const playersQuery = useQuery({
    queryKey: ["/leaderboard/global"],
    queryFn: () => api.leaderboard.global(100),
    enabled: view === "players",
    staleTime: 60_000,
  });

  const myLeagueIds = new Set(leaguesQuery.data?.my_league_ids ?? []);
  const loading = view === "leagues" ? leaguesQuery.isLoading : playersQuery.isLoading;

  return (
    <section className="mt-5" data-testid="global-rankings">
      <div className="mb-2 flex items-center gap-2">
        <Globe className="h-4 w-4 text-pk-red" />
        <h2 className="font-display text-[1rem] uppercase leading-none">Classements globaux</h2>
      </div>

      {/* View toggle */}
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {(
          [
            { key: "leagues", label: "Ligues", Icon: Trophy },
            { key: "players", label: "Joueurs", Icon: Users },
          ] as { key: View; label: string; Icon: typeof Trophy }[]
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => {
              haptic("selection");
              setView(key);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-full border py-1.5 font-data text-[0.625rem] uppercase tracking-[0.08em] transition-colors ${
              view === key
                ? "border-pk-red/30 bg-pk-red-subtle text-pk-red"
                : "border-white/[0.08] bg-white/[0.04] text-pk-titane"
            }`}
            data-testid={`ranking-tab-${key}`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-white/[0.06] bg-pk-surface"
            />
          ))}
        </div>
      ) : view === "leagues" ? (
        <div className="space-y-1.5" data-testid="leagues-ranking-list">
          {(leaguesQuery.data?.leaderboard ?? []).map((lg: LeagueLeaderboardEntry) => {
            const mine = myLeagueIds.has(lg.league_id);
            return (
              <button
                key={lg.league_id}
                onClick={() => {
                  haptic("light");
                  navigate(`/league/${lg.league_id}/details`);
                }}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  mine
                    ? "border-pk-red/30 bg-pk-red/[0.06]"
                    : "border-white/[0.08] bg-pk-surface hover:border-white/[0.15]"
                }`}
              >
                <RankBadge position={lg.position} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-display text-[0.8125rem] uppercase text-pk-piste">
                    {lg.name}
                    {mine && (
                      <span className="rounded-sm bg-pk-red/15 px-1 py-px font-mono text-[0.5rem] font-bold uppercase tracking-[0.08em] text-pk-red">
                        Ma ligue
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[0.5625rem] uppercase tracking-[0.08em] text-pk-titane">
                    {lg.member_count} membre{lg.member_count > 1 ? "s" : ""} · {lg.average_points}{" "}
                    pts/membre
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-data text-[1rem] font-bold text-pk-gold">
                    {lg.total_points.toLocaleString("fr-FR")}
                  </p>
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    pts
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5" data-testid="players-ranking-list">
          {(playersQuery.data?.leaderboard ?? []).map((p: LeaderboardEntry) => {
            const me = p.user_id === userId;
            return (
              <div
                key={p.user_id}
                className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                  me ? "border-pk-red/30 bg-pk-red/[0.06]" : "border-white/[0.08] bg-pk-surface"
                }`}
              >
                <RankBadge position={p.position} />
                <div className="min-w-0 flex-1">
                  <UserIdentity
                    user={{
                      id: p.user_id,
                      username: p.username,
                      avatar_id: p.avatar_id,
                      custom_avatar_url: p.custom_avatar_url,
                      level: p.level,
                    }}
                    size="sm"
                    textClassName="font-display text-[0.8125rem] uppercase"
                  />
                </div>
                {me && (
                  <span className="rounded-sm bg-pk-red/15 px-1 py-px font-mono text-[0.5rem] font-bold uppercase tracking-[0.08em] text-pk-red">
                    Moi
                  </span>
                )}
                <div className="text-right">
                  <p className="font-data text-[1rem] font-bold text-pk-piste">
                    {p.total_points.toLocaleString("fr-FR")}
                  </p>
                  <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                    pts
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
