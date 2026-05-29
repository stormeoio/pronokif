/**
 * Admin activity logs tab — operational traceability for admin actions.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, ChevronLeft, ChevronRight, Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ActivityLog = {
  id: string;
  actor_email?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

function formatDateTime(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metadataSummary(metadata?: Record<string, unknown>) {
  if (!metadata) return "—";
  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 4);
  if (!entries.length) return "—";
  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ActivityLogsTab() {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const limit = 40;

  const params = {
    q: q.trim() || undefined,
    entity_type: entityType || undefined,
    action: action || undefined,
    skip: page * limit,
    limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "activity-logs", params],
    queryFn: () => adminApi.activityLogs.list(params),
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      adminApi.activityLogs.exportCsv({
        q: q.trim() || undefined,
        entity_type: entityType || undefined,
        action: action || undefined,
        export_limit: 5000,
      }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-admin-activity.csv");
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const logs = (data?.logs ?? []) as ActivityLog[];
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Activité</h2>
          <p className="font-body text-xs text-gray-500">
            Historique des actions admin sur les pronostics et utilisateurs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="text-xs text-gray-300 hover:text-white"
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <span className="font-data text-sm text-gray-500">{total} entrées</span>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_210px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher action, admin, entité..."
              className="border-gray-700 bg-gray-900 pl-10 text-white"
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Toutes entités</option>
            <option value="prediction">Pronostics</option>
            <option value="user">Utilisateurs</option>
            <option value="race">Courses</option>
            <option value="championship">Championnats</option>
          </select>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Toutes actions</option>
            <option value="prediction.update">Prono modifié</option>
            <option value="prediction.lock">Prono verrouillé</option>
            <option value="prediction.unlock">Prono ouvert</option>
            <option value="prediction.delete">Prono supprimé</option>
            <option value="prediction.batch.lock">Batch verrouillage</option>
            <option value="prediction.batch.set_review_status">Batch revue</option>
            <option value="user.update">Utilisateur modifié</option>
            <option value="race.reminders">Relance course</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setEntityType("");
              setAction("");
              setPage(0);
            }}
            className="text-xs text-gray-400"
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Activity className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">Aucune activité enregistrée</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Admin</th>
                  <th className="p-3 text-left">Entité</th>
                  <th className="p-3 text-left">Contexte</th>
                  <th className="p-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-white/5">
                    <td className="p-3 font-data text-xs uppercase text-white">
                      {log.action ?? "—"}
                    </td>
                    <td className="p-3 font-body text-gray-300">{log.actor_email ?? "—"}</td>
                    <td className="p-3">
                      <p className="font-body text-gray-200">{log.entity_type ?? "—"}</p>
                      <p className="max-w-[220px] truncate font-data text-[11px] text-gray-500">
                        {log.entity_id ?? "—"}
                      </p>
                    </td>
                    <td className="max-w-[360px] truncate p-3 font-body text-xs text-gray-500">
                      {metadataSummary(log.metadata)}
                    </td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      {formatDateTime(log.created_at)}
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
