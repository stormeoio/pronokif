/**
 * Admin feedbacks tab — support triage, bulk actions and exports.
 */
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bug,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  Inbox,
  Lightbulb,
  Loader2,
  MessageSquare,
  Save,
  Search,
  Send,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserIdentity } from "@/components/users/UserIdentity";

type Feedback = {
  id: string;
  user_id?: string;
  username?: string;
  email?: string;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  category?: string;
  message?: string;
  read?: boolean;
  status?: string;
  priority?: string;
  assigned_to?: string;
  admin_note?: string;
  admin_reply?: string;
  admin_reply_by?: string;
  admin_reply_at?: string;
  admin_reply_sent_at?: string;
  admin_reply_delivery?: string;
  created_at?: string;
  updated_at?: string;
};

type FeedbackDraft = {
  category: string;
  status: string;
  priority: string;
  assigned_to: string;
  admin_note: string;
  admin_reply: string;
  read: boolean;
};

const EMPTY_DRAFT: FeedbackDraft = {
  category: "feedback",
  status: "new",
  priority: "normal",
  assigned_to: "",
  admin_note: "",
  admin_reply: "",
  read: false,
};

function formatDateTime(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function feedbackToDraft(feedback: Feedback): FeedbackDraft {
  return {
    category: feedback.category ?? "feedback",
    status: feedback.status ?? "new",
    priority: feedback.priority ?? "normal",
    assigned_to: feedback.assigned_to ?? "",
    admin_note: feedback.admin_note ?? "",
    admin_reply: feedback.admin_reply ?? "",
    read: !!feedback.read,
  };
}

function draftToPayload(draft: FeedbackDraft) {
  return {
    category: draft.category,
    status: draft.status,
    priority: draft.priority,
    assigned_to: draft.assigned_to.trim(),
    admin_note: draft.admin_note.trim(),
    admin_reply: draft.admin_reply.trim(),
    read: draft.read,
  };
}

function categoryIcon(category?: string) {
  switch (category) {
    case "bug":
      return <Bug className="h-4 w-4 text-red-400" />;
    case "suggestion":
      return <Lightbulb className="h-4 w-4 text-amber-400" />;
    default:
      return <MessageSquare className="h-4 w-4 text-cyan-400" />;
  }
}

function categoryLabel(category?: string) {
  switch (category) {
    case "bug":
      return "Bug";
    case "suggestion":
      return "Suggestion";
    default:
      return "Feedback";
  }
}

function priorityTone(priority?: string) {
  if (priority === "urgent") return "text-red-300";
  if (priority === "high") return "text-amber-300";
  if (priority === "low") return "text-gray-500";
  return "text-cyan-300";
}

function statusLabel(status?: string) {
  switch (status) {
    case "in_progress":
      return "Pris en charge";
    case "in_review":
      return "En revue";
    case "planned":
      return "Planifié";
    case "resolved":
      return "Résolu";
    case "wont_fix":
      return "Écarté";
    default:
      return "Nouveau";
  }
}

function priorityLabel(priority?: string) {
  switch (priority) {
    case "urgent":
      return "Urgente";
    case "high":
      return "Haute";
    case "low":
      return "Basse";
    default:
      return "Normale";
  }
}

function StatCard({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: unknown;
  tone?: string;
}) {
  return (
    <div className="card-arcade border-l-4 border-pk-red p-3">
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-1 font-data text-2xl ${tone}`}>{String(value ?? 0)}</p>
    </div>
  );
}

type FeedbacksTabProps = {
  currentAdminEmail?: string;
};

export default function FeedbacksTab({ currentAdminEmail = "" }: FeedbacksTabProps) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [readStatus, setReadStatus] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [owner, setOwner] = useState("");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [draft, setDraft] = useState<FeedbackDraft>(EMPTY_DRAFT);
  const [batchStatus, setBatchStatus] = useState("in_progress");
  const [batchPriority, setBatchPriority] = useState("normal");
  const limit = 20;

  const filterParams = {
    q: q.trim() || undefined,
    category: category || undefined,
    read_status: readStatus || undefined,
    status: status || undefined,
    priority: priority || undefined,
    owner: owner || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "feedbacks", filterParams, page],
    queryFn: () => adminApi.feedbacks.list({ ...filterParams, skip: page * limit, limit }),
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-bo", "feedbacks", "analytics", filterParams],
    queryFn: () => adminApi.feedbacks.analytics(filterParams),
  });

  const feedbacks = (data?.feedbacks ?? []) as Feedback[];
  const total = data?.total ?? 0;
  const summary = analytics?.summary ?? {};
  const pageIds = feedbacks.map((feedback) => feedback.id).filter(Boolean);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const invalidateFeedbacks = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "feedbacks"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedFeedback?.id) throw new Error("Feedback id missing");
      return adminApi.feedbacks.update(selectedFeedback.id, draftToPayload(draft));
    },
    onSuccess: () => {
      toast.success("Retour mis à jour");
      setSelectedFeedback(null);
      setDraft(EMPTY_DRAFT);
      invalidateFeedbacks();
    },
    onError: () => toast.error("Impossible de modifier ce retour"),
  });

  const batchMutation = useMutation({
    mutationFn: (payload: {
      action: "mark_read" | "mark_unread" | "delete" | "set_status" | "set_priority" | "assign";
      status?: string;
      priority?: string;
      assigned_to?: string;
    }) => adminApi.feedbacks.batch({ ids: selectedIds, ...payload }),
    onSuccess: (result) => {
      toast.success(`${result.matched ?? result.deleted ?? 0} retour(s) traité(s)`);
      setSelectedIds([]);
      invalidateFeedbacks();
    },
    onError: () => toast.error("Action de masse impossible"),
  });

  const exportMutation = useMutation({
    mutationFn: () => adminApi.feedbacks.exportCsv({ ...filterParams, export_limit: 5000 }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-feedbacks.csv");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const replyMutation = useMutation({
    mutationFn: () => {
      if (!selectedFeedback?.id) throw new Error("Feedback id missing");
      return adminApi.feedbacks.reply(selectedFeedback.id, {
        reply: draft.admin_reply.trim(),
        status: draft.status,
        mark_read: true,
      });
    },
    onSuccess: (result) => {
      if (result.email_sent) {
        toast.success("Réponse envoyée au joueur");
      } else if (result.delivery_status === "missing_email") {
        toast.warning("Réponse enregistrée, aucun email joueur disponible");
      } else {
        toast.warning("Réponse enregistrée, email non envoyé");
      }
      if (result.feedback) {
        setSelectedFeedback(result.feedback);
        setDraft(feedbackToDraft(result.feedback));
      }
      invalidateFeedbacks();
    },
    onError: () => toast.error("Impossible d'envoyer cette réponse"),
  });

  const markReadMutation = useMutation({
    mutationFn: (feedback: Feedback) =>
      feedback.read
        ? adminApi.feedbacks.markUnread(feedback.id)
        : adminApi.feedbacks.markRead(feedback.id),
    onSuccess: () => invalidateFeedbacks(),
    onError: () => toast.error("Impossible de modifier la lecture"),
  });

  const deleteMutation = useMutation({
    mutationFn: (feedbackId: string) => adminApi.feedbacks.delete(feedbackId),
    onSuccess: () => {
      toast.success("Retour supprimé");
      invalidateFeedbacks();
    },
    onError: () => toast.error("Impossible de supprimer ce retour"),
  });

  const openEditor = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setDraft(feedbackToDraft(feedback));
  };

  const toggleFeedback = (feedbackId: string) => {
    setSelectedIds((current) =>
      current.includes(feedbackId)
        ? current.filter((id) => id !== feedbackId)
        : [...current, feedbackId],
    );
  };

  const togglePage = () => {
    setSelectedIds((current) => {
      if (allPageSelected) return current.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const runBatchDelete = () => {
    if (!selectedIds.length) return;
    if (!confirm(`Supprimer ${selectedIds.length} retour(s) sélectionné(s) ?`)) return;
    batchMutation.mutate({ action: "delete" });
  };

  const handleDelete = (feedback: Feedback) => {
    if (!confirm("Supprimer ce retour utilisateur ?")) return;
    deleteMutation.mutate(feedback.id);
  };

  const handleEditorSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateMutation.mutate();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">
            Feedbacks Beta
          </h2>
          <p className="font-body text-xs text-gray-500">
            Triage support, réponses aux joueurs et prise en charge des bugs bêta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="text-xs text-gray-300 hover:text-white"
            data-testid="feedback-export"
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <span className="font-data text-sm text-gray-500">{total} au total</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Total" value={summary.total ?? total} />
        <StatCard label="Non lus" value={summary.unread} tone="text-amber-400" />
        <StatCard
          label="Bugs ouverts"
          value={summary.open_bugs ?? summary.bugs}
          tone="text-red-300"
        />
        <StatCard label="Prioritaires" value={summary.high_priority} tone="text-orange-300" />
        <StatCard label="Pris en charge" value={summary.assigned} tone="text-cyan-300" />
        <StatCard label="Réponses" value={summary.replied} tone="text-emerald-400" />
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_150px_140px_150px_140px_150px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(0);
              }}
              placeholder="Rechercher message, pseudo, note..."
              className="border-gray-700 bg-gray-900 pl-10 text-white"
              data-testid="feedback-search"
            />
          </div>
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            data-testid="feedback-category-filter"
          >
            <option value="">Toutes catégories</option>
            <option value="bug">Bugs</option>
            <option value="suggestion">Suggestions</option>
            <option value="feedback">Feedback</option>
          </select>
          <select
            value={readStatus}
            onChange={(event) => {
              setReadStatus(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Lecture</option>
            <option value="unread">Non lus</option>
            <option value="read">Lus</option>
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Tous statuts</option>
            <option value="new">Nouveau</option>
            <option value="in_progress">Pris en charge</option>
            <option value="in_review">En revue</option>
            <option value="planned">Planifié</option>
            <option value="resolved">Résolu</option>
            <option value="wont_fix">Écarté</option>
          </select>
          <select
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Priorité</option>
            <option value="urgent">Urgente</option>
            <option value="high">Haute</option>
            <option value="normal">Normale</option>
            <option value="low">Basse</option>
          </select>
          <select
            value={owner}
            onChange={(event) => {
              setOwner(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Prise en charge</option>
            <option value="mine">À moi</option>
            <option value="unassigned">Non assignés</option>
            <option value="assigned">Assignés</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setCategory("");
              setReadStatus("");
              setStatus("");
              setPriority("");
              setOwner("");
              setPage(0);
            }}
            className="text-xs text-gray-400"
            data-testid="feedback-reset-filters"
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <section className="card-arcade mb-4 border border-pk-red/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm uppercase text-white">Actions de masse</h3>
              <p className="font-body text-xs text-gray-500">
                {selectedIds.length} retour(s) sélectionné(s)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={batchStatus}
                onChange={(event) => setBatchStatus(event.target.value)}
                className="h-9 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-xs text-white"
              >
                <option value="in_progress">Pris en charge</option>
                <option value="in_review">En revue</option>
                <option value="planned">Planifié</option>
                <option value="resolved">Résolu</option>
                <option value="wont_fix">Écarté</option>
              </select>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate({ action: "set_status", status: batchStatus })}
                className="text-xs text-cyan-300"
              >
                Statut
              </Button>
              <select
                value={batchPriority}
                onChange={(event) => setBatchPriority(event.target.value)}
                className="h-9 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-xs text-white"
              >
                <option value="urgent">Urgente</option>
                <option value="high">Haute</option>
                <option value="normal">Normale</option>
                <option value="low">Basse</option>
              </select>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() =>
                  batchMutation.mutate({ action: "set_priority", priority: batchPriority })
                }
                className="text-xs text-amber-300"
              >
                Priorité
              </Button>
              {currentAdminEmail && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={batchMutation.isPending}
                  onClick={() =>
                    batchMutation.mutate({ action: "assign", assigned_to: currentAdminEmail })
                  }
                  className="text-xs text-cyan-300"
                >
                  <UserCheck className="mr-1 h-4 w-4" />
                  Me l'assigner
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate({ action: "mark_read" })}
                className="text-xs text-emerald-300"
              >
                <Check className="mr-1 h-4 w-4" />
                Lus
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={runBatchDelete}
                className="text-xs text-red-300"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Supprimer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Annuler
              </Button>
            </div>
          </div>
        </section>
      )}

      {selectedFeedback && (
        <form
          onSubmit={handleEditorSubmit}
          className="card-arcade mb-4 border border-cyan-500/25 p-4"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-lg uppercase text-white">Retour sélectionné</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <UserIdentity
                  user={{
                    id: selectedFeedback.user_id,
                    username: selectedFeedback.username,
                    email: selectedFeedback.email,
                    avatar_id: selectedFeedback.avatar_id,
                    custom_avatar_url: selectedFeedback.custom_avatar_url,
                  }}
                  surface="admin"
                  size="sm"
                  showEmail
                  className="max-w-[280px]"
                  data-testid="admin-selected-feedback-user"
                />
                <span className="font-body text-xs text-gray-500">
                  {formatDateTime(selectedFeedback.created_at)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedFeedback(null)}
              className="text-xs text-gray-400"
            >
              Fermer
            </Button>
          </div>
          <p className="mb-4 whitespace-pre-wrap rounded-sm border border-white/10 bg-gray-950/60 p-3 font-body text-sm text-gray-200">
            {selectedFeedback.message}
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            >
              <option value="feedback">Feedback</option>
              <option value="bug">Bug</option>
              <option value="suggestion">Suggestion</option>
            </select>
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            >
              <option value="new">Nouveau</option>
              <option value="in_progress">Pris en charge</option>
              <option value="in_review">En revue</option>
              <option value="planned">Planifié</option>
              <option value="resolved">Résolu</option>
              <option value="wont_fix">Écarté</option>
            </select>
            <select
              value={draft.priority}
              onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
              className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            >
              <option value="urgent">Urgente</option>
              <option value="high">Haute</option>
              <option value="normal">Normale</option>
              <option value="low">Basse</option>
            </select>
            <label className="flex items-center gap-2 font-body text-sm text-gray-300">
              <input
                type="checkbox"
                checked={draft.read}
                onChange={(event) => setDraft({ ...draft, read: event.target.checked })}
                className="h-4 w-4 accent-pk-red"
              />
              Lu
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              value={draft.assigned_to}
              onChange={(event) => setDraft({ ...draft, assigned_to: event.target.value })}
              placeholder="Assigné à (email admin)"
              className="border-gray-700 bg-gray-900 text-white"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!currentAdminEmail}
              onClick={() =>
                setDraft({
                  ...draft,
                  assigned_to: currentAdminEmail,
                  status: draft.status === "new" ? "in_progress" : draft.status,
                })
              }
              className="h-10 text-xs text-cyan-300"
            >
              <UserCheck className="mr-1 h-4 w-4" />
              Me l'assigner
            </Button>
          </div>
          <Textarea
            value={draft.admin_note}
            onChange={(event) => setDraft({ ...draft, admin_note: event.target.value })}
            placeholder="Note admin, contexte, décision produit..."
            rows={3}
            className="mt-3 border-gray-700 bg-gray-900 text-white"
          />
          <Textarea
            value={draft.admin_reply}
            onChange={(event) => setDraft({ ...draft, admin_reply: event.target.value })}
            placeholder="Réponse au joueur..."
            rows={4}
            className="mt-3 border-gray-700 bg-gray-900 text-white"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-xs text-gray-500">
              {selectedFeedback.admin_reply_sent_at
                ? `Dernière réponse envoyée ${formatDateTime(selectedFeedback.admin_reply_sent_at)}`
                : selectedFeedback.admin_reply_delivery === "not_sent"
                  ? "Dernière réponse enregistrée, email non envoyé."
                  : "La réponse est enregistrable, puis envoyable par email si une adresse est disponible."}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={replyMutation.isPending || !draft.admin_reply.trim()}
              onClick={() => replyMutation.mutate()}
              className="text-xs text-cyan-300"
              data-testid="feedback-send-reply"
            >
              {replyMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Envoyer la réponse
            </Button>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={updateMutation.isPending}
              className="text-xs text-emerald-300"
              data-testid="feedback-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Inbox className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">Aucun retour</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      className="h-4 w-4 accent-pk-red"
                      data-testid="feedback-select-page"
                    />
                  </th>
                  <th className="p-3 text-left">Retour</th>
                  <th className="p-3 text-left">Triage</th>
                  <th className="p-3 text-left">Joueur</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((feedback) => (
                  <tr
                    key={feedback.id}
                    className={`border-b border-gray-800/50 hover:bg-white/5 ${
                      !feedback.read ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(feedback.id)}
                        onChange={() => toggleFeedback(feedback.id)}
                        className="h-4 w-4 accent-pk-red"
                      />
                    </td>
                    <td className="max-w-xl p-3">
                      <div className="mb-1 flex items-center gap-2">
                        {categoryIcon(feedback.category)}
                        <span className="font-body text-xs text-gray-400">
                          {categoryLabel(feedback.category)}
                        </span>
                        {!feedback.read && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                      </div>
                      <p className="line-clamp-2 whitespace-pre-wrap font-body text-sm text-gray-200">
                        {feedback.message}
                      </p>
                      {feedback.admin_note && (
                        <p className="mt-1 line-clamp-1 font-body text-xs text-cyan-300">
                          Note : {feedback.admin_note}
                        </p>
                      )}
                      {feedback.admin_reply && (
                        <p className="mt-1 line-clamp-1 font-body text-xs text-emerald-300">
                          Réponse : {feedback.admin_reply}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="font-data text-xs uppercase text-gray-300">
                        {statusLabel(feedback.status)}
                      </p>
                      <p
                        className={`font-data text-[11px] uppercase ${priorityTone(feedback.priority)}`}
                      >
                        {priorityLabel(feedback.priority)}
                      </p>
                      {feedback.assigned_to && (
                        <p className="mt-1 line-clamp-1 font-body text-[11px] text-cyan-300">
                          {feedback.assigned_to}
                        </p>
                      )}
                      {feedback.admin_reply_sent_at && (
                        <p className="mt-1 font-data text-[10px] uppercase text-emerald-300">
                          Répondu
                        </p>
                      )}
                    </td>
                    <td className="p-3 font-body text-gray-400">
                      <UserIdentity
                        user={{
                          id: feedback.user_id,
                          username: feedback.username,
                          email: feedback.email,
                          avatar_id: feedback.avatar_id,
                          custom_avatar_url: feedback.custom_avatar_url,
                        }}
                        surface="admin"
                        size="sm"
                        showEmail
                        className="max-w-[220px]"
                        data-testid={`admin-feedback-user-${feedback.id}`}
                      />
                    </td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      {formatDateTime(feedback.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditor(feedback)}
                          className="h-8 px-2 text-cyan-300"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditor(feedback)}
                          className="h-8 px-2 text-amber-300"
                          title="Éditer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={markReadMutation.isPending}
                          onClick={() => markReadMutation.mutate(feedback)}
                          className="h-8 px-2 text-emerald-300"
                          title={feedback.read ? "Marquer non lu" : "Marquer lu"}
                        >
                          {feedback.read ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(feedback)}
                          className="h-8 px-2 text-red-300"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
