/**
 * Admin invitations tab — acquisition funnel and invite operations.
 */
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit2,
  Loader2,
  Mail,
  RefreshCcw,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Invitation = {
  id: string;
  email: string;
  message?: string | null;
  sent_by?: string;
  accepted?: boolean;
  revoked?: boolean;
  status?: "pending" | "accepted" | "expired" | "revoked";
  created_at?: string;
  expires_at?: string;
  accepted_at?: string;
  last_resent_at?: string;
  resend_count?: number;
  admin_note?: string | null;
  review_status?: string | null;
};

type InvitationDraft = {
  message: string;
  admin_note: string;
  review_status: string;
};

const EMPTY_DRAFT: InvitationDraft = {
  message: "",
  admin_note: "",
  review_status: "",
};

const EMAIL_SPLIT_PATTERN = /[\s,;]+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(input: string) {
  const unique = Array.from(
    new Set(
      input
        .split(EMAIL_SPLIT_PATTERN)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  return {
    valid: unique.filter((email) => EMAIL_PATTERN.test(email)),
    invalid: unique.filter((email) => !EMAIL_PATTERN.test(email)),
  };
}

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

function invitationToDraft(invitation: Invitation): InvitationDraft {
  return {
    message: invitation.message ?? "",
    admin_note: invitation.admin_note ?? "",
    review_status: invitation.review_status ?? "",
  };
}

function statusLabel(status?: string) {
  switch (status) {
    case "accepted":
      return "Acceptée";
    case "expired":
      return "Expirée";
    case "revoked":
      return "Révoquée";
    default:
      return "En attente";
  }
}

function statusTone(status?: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-500/15 text-emerald-300";
    case "expired":
      return "bg-amber-500/15 text-amber-300";
    case "revoked":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-cyan-500/15 text-cyan-300";
  }
}

function statusIcon(status?: string) {
  if (status === "accepted") return <Check className="h-3.5 w-3.5" />;
  if (status === "revoked") return <Ban className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
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

export default function InvitationsTab() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [emailsInput, setEmailsInput] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [draft, setDraft] = useState<InvitationDraft>(EMPTY_DRAFT);
  const limit = 20;

  const parsedEmails = useMemo(() => parseEmails(emailsInput), [emailsInput]);
  const filterParams = {
    search: search.trim() || undefined,
    status: status || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "invitations", filterParams, page],
    queryFn: () => adminApi.invitations.list({ ...filterParams, skip: page * limit, limit }),
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-bo", "invitations", "analytics", filterParams],
    queryFn: () => adminApi.invitations.analytics(filterParams),
  });

  const invitations = (data?.invitations ?? []) as Invitation[];
  const total = data?.total ?? 0;
  const summary = analytics?.summary ?? {};

  const invalidateInvitations = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "invitations"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
  };

  const sendMutation = useMutation({
    mutationFn: () => adminApi.invitations.send({ email, message: message.trim() || undefined }),
    onSuccess: () => {
      toast.success("Invitation envoyée");
      setEmail("");
      invalidateInvitations();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi");
    },
  });

  const batchMutation = useMutation({
    mutationFn: () =>
      adminApi.invitations.sendBatch({
        emails: parsedEmails.valid,
        message: message.trim() || undefined,
      }),
    onSuccess: (result) => {
      const sent = result.sent ?? 0;
      const skipped = result.skipped?.length ?? 0;
      const failed = result.failed?.length ?? 0;
      if (sent > 0) {
        toast.success(`${sent} invitation${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}`);
        setEmailsInput("");
      }
      if (skipped || failed) {
        toast.warning(`${skipped} ignorée(s), ${failed} échouée(s)`);
      }
      invalidateInvitations();
    },
    onError: () => toast.error("Envoi groupé impossible"),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedInvitation?.id) throw new Error("Invitation id missing");
      return adminApi.invitations.update(selectedInvitation.id, {
        message: draft.message.trim() || null,
        admin_note: draft.admin_note.trim() || null,
        review_status: draft.review_status.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Invitation mise à jour");
      setSelectedInvitation(null);
      setDraft(EMPTY_DRAFT);
      invalidateInvitations();
    },
    onError: () => toast.error("Impossible de modifier l'invitation"),
  });

  const resendMutation = useMutation({
    mutationFn: (invitation: Invitation) =>
      adminApi.invitations.resend(invitation.id, { message: invitation.message ?? undefined }),
    onSuccess: () => {
      toast.success("Invitation renvoyée");
      invalidateInvitations();
    },
    onError: () => toast.error("Impossible de renvoyer l'invitation"),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => adminApi.invitations.revoke(invitationId),
    onSuccess: () => {
      toast.success("Invitation révoquée");
      invalidateInvitations();
    },
    onError: () => toast.error("Impossible de révoquer l'invitation"),
  });

  const deleteMutation = useMutation({
    mutationFn: (invitationId: string) => adminApi.invitations.delete(invitationId),
    onSuccess: () => {
      toast.success("Invitation supprimée");
      invalidateInvitations();
    },
    onError: () => toast.error("Impossible de supprimer l'invitation"),
  });

  const exportMutation = useMutation({
    mutationFn: () => adminApi.invitations.exportCsv({ ...filterParams, export_limit: 5000 }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-invitations.csv");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Renseignez une adresse email");
      return;
    }
    sendMutation.mutate();
  };

  const handleBatchSend = (event: FormEvent) => {
    event.preventDefault();
    if (parsedEmails.invalid.length) {
      toast.error(`${parsedEmails.invalid.length} adresse(s) invalide(s)`);
      return;
    }
    if (!parsedEmails.valid.length) {
      toast.error("Ajoutez au moins une adresse email");
      return;
    }
    batchMutation.mutate();
  };

  const openEditor = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setDraft(invitationToDraft(invitation));
  };

  const handleRevoke = (invitation: Invitation) => {
    if (!confirm(`Révoquer l'invitation pour ${invitation.email} ?`)) return;
    revokeMutation.mutate(invitation.id);
  };

  const handleDelete = (invitation: Invitation) => {
    if (!confirm(`Supprimer l'invitation pour ${invitation.email} ?`)) return;
    deleteMutation.mutate(invitation.id);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Invitations</h2>
          <p className="font-body text-xs text-gray-500">
            Pilotage acquisition, relances et qualité des accès bêta.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="text-xs text-gray-300 hover:text-white"
            data-testid="invitations-export"
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
        <StatCard label="En attente" value={summary.pending} tone="text-cyan-300" />
        <StatCard label="Acceptées" value={summary.accepted} tone="text-emerald-400" />
        <StatCard label="Expirées" value={summary.expired} tone="text-amber-400" />
        <StatCard label="Révoquées" value={summary.revoked} tone="text-red-300" />
        <StatCard label="Taux" value={`${summary.acceptance_rate ?? 0}%`} tone="text-orange-300" />
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="card-arcade border border-cyan-500/25 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-heading text-sm uppercase text-cyan-300">
            <Send className="h-4 w-4" />
            Envoyer
          </h3>
          <form onSubmit={handleSend} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pilote@example.com"
              className="border-gray-700 bg-gray-900 text-white"
              data-testid="invitation-email"
            />
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message commun optionnel"
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Button
              type="submit"
              disabled={sendMutation.isPending}
              size="sm"
              className="btn-racing text-xs"
              data-testid="invitation-send"
            >
              {sendMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-1 h-4 w-4" />
              )}
              Envoyer l'invitation
            </Button>
          </form>
        </section>

        <section className="card-arcade border border-white/10 p-4">
          <h3 className="mb-3 font-heading text-sm uppercase text-white">Envoi groupé</h3>
          <form onSubmit={handleBatchSend} className="space-y-3">
            <Textarea
              value={emailsInput}
              onChange={(event) => setEmailsInput(event.target.value)}
              placeholder="emails séparés par virgules, espaces ou retours ligne"
              rows={5}
              className="border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
              data-testid="invitation-batch-emails"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-xs text-gray-500">
                {parsedEmails.valid.length} valide(s)
                {parsedEmails.invalid.length ? ` · ${parsedEmails.invalid.length} invalide(s)` : ""}
              </p>
              <Button
                type="submit"
                disabled={batchMutation.isPending || parsedEmails.valid.length === 0}
                size="sm"
                variant="ghost"
                className="text-xs text-emerald-300"
                data-testid="invitation-batch-send"
              >
                {batchMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1 h-4 w-4" />
                )}
                Envoyer le lot
              </Button>
            </div>
          </form>
        </section>
      </div>

      {selectedInvitation && (
        <section className="card-arcade mb-4 border border-orange-500/25 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-lg uppercase text-white">
                {selectedInvitation.email}
              </h3>
              <p className="font-body text-xs text-gray-500">
                {statusLabel(selectedInvitation.status)} · envoyée par{" "}
                {selectedInvitation.sent_by ?? "—"}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedInvitation(null)}
              className="text-xs text-gray-400"
            >
              Fermer
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Textarea
              value={draft.message}
              onChange={(event) => setDraft({ ...draft, message: event.target.value })}
              placeholder="Message de l'invitation"
              rows={4}
              className="border-gray-700 bg-gray-900 text-white"
            />
            <select
              value={draft.review_status}
              onChange={(event) => setDraft({ ...draft, review_status: event.target.value })}
              className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            >
              <option value="">Non classée</option>
              <option value="target">Cible prioritaire</option>
              <option value="follow_up">À relancer</option>
              <option value="partner">Partenaire</option>
              <option value="low_fit">Fit faible</option>
            </select>
          </div>
          <Textarea
            value={draft.admin_note}
            onChange={(event) => setDraft({ ...draft, admin_note: event.target.value })}
            placeholder="Note admin, contexte, source, prochaine action..."
            rows={3}
            className="mt-3 border-gray-700 bg-gray-900 text-white"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="text-xs text-emerald-300"
              data-testid="invitation-save"
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Enregistrer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={resendMutation.isPending || selectedInvitation.status === "accepted"}
              onClick={() =>
                resendMutation.mutate({ ...selectedInvitation, message: draft.message })
              }
              className="text-xs text-cyan-300"
            >
              <RefreshCcw className="mr-1 h-4 w-4" />
              Renvoyer
            </Button>
          </div>
        </section>
      )}

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Rechercher email, expéditeur, message..."
              className="border-gray-700 bg-gray-900 pl-10 text-white"
              data-testid="invitations-search"
            />
          </div>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            data-testid="invitations-status-filter"
          >
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="accepted">Acceptées</option>
            <option value="expired">Expirées</option>
            <option value="revoked">Révoquées</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setStatus("");
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
      ) : invitations.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Mail className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">Aucune invitation envoyée</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="p-3 text-left">Invitation</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Expéditeur</th>
                  <th className="p-3 text-left">Dates</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-gray-800/50 hover:bg-white/5">
                    <td className="max-w-xl p-3">
                      <p className="font-body text-sm text-white">{invitation.email}</p>
                      {invitation.message && (
                        <p className="mt-0.5 line-clamp-1 font-body text-xs text-gray-500">
                          {invitation.message}
                        </p>
                      )}
                      {invitation.admin_note && (
                        <p className="mt-0.5 line-clamp-1 font-body text-xs text-cyan-300">
                          Note : {invitation.admin_note}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 font-data text-[11px] uppercase ${statusTone(
                          invitation.status,
                        )}`}
                      >
                        {statusIcon(invitation.status)}
                        {statusLabel(invitation.status)}
                      </span>
                      {invitation.resend_count ? (
                        <p className="mt-1 font-body text-[11px] text-gray-500">
                          {invitation.resend_count} renvoi(s)
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 font-body text-gray-400">{invitation.sent_by ?? "—"}</td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      <p>Créée : {formatDateTime(invitation.created_at)}</p>
                      <p>Expire : {formatDateTime(invitation.expires_at)}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditor(invitation)}
                          className="h-8 px-2 text-amber-300"
                          title="Éditer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={resendMutation.isPending || invitation.status === "accepted"}
                          onClick={() => resendMutation.mutate(invitation)}
                          className="h-8 px-2 text-cyan-300"
                          title="Renvoyer"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={
                            revokeMutation.isPending ||
                            invitation.status === "accepted" ||
                            invitation.status === "revoked"
                          }
                          onClick={() => handleRevoke(invitation)}
                          className="h-8 px-2 text-red-300"
                          title="Révoquer"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(invitation)}
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
