/**
 * Admin leagues tab — league overview.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, Network, Search } from "lucide-react";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type League = Record<string, unknown>;

function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LeaguesTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "leagues", search, page],
    queryFn: () => adminApi.leagues.list({ search, skip: page * limit, limit }),
  });

  const leagues = data?.leagues ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Leagues</h2>
        <span className="font-data text-sm text-gray-500">{total} au total</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Rechercher par nom ou code..."
          className="border-gray-700 bg-gray-900 pl-10 text-white"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : leagues.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Network className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">No league found</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="p-3 text-left">Ligue</th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Members</th>
                  <th className="p-3 text-left">Creator</th>
                  <th className="p-3 text-left">Created on</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((league: League) => (
                  <tr
                    key={String(league.id)}
                    className="border-b border-gray-800/50 hover:bg-white/5"
                  >
                    <td className="p-3">
                      <p className="font-body text-white">{String(league.name ?? "Sans nom")}</p>
                      {league.description ? (
                        <p className="mt-0.5 max-w-md truncate font-body text-xs text-gray-500">
                          {String(league.description)}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 font-data text-cyan-400">{String(league.code ?? "—")}</td>
                    <td className="p-3 font-data text-orange-400">
                      {String(league.members_count ?? 0)}
                    </td>
                    <td className="p-3 font-body text-gray-400">
                      {String(league.owner_email ?? league.created_by ?? "—")}
                    </td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      {formatDate(league.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between border-t border-gray-800 p-3">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-gray-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-body text-xs text-gray-500">
                Page {page + 1} / {Math.ceil(total / limit)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(page + 1)}
                className="text-gray-400"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
