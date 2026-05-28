/**
 * Admin Users management tab.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Trash2,
  Edit2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MailPlus,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EMAIL_SPLIT_PATTERN = /[\s,;]+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseInviteEmails(input: string) {
  const entries = input
    .split(EMAIL_SPLIT_PATTERN)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(entries));

  return {
    valid: unique.filter((email) => EMAIL_PATTERN.test(email)),
    invalid: unique.filter((email) => !EMAIL_PATTERN.test(email)),
  };
}

export default function UsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const limit = 20;

  const inviteEmails = useMemo(() => parseInviteEmails(inviteInput), [inviteInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "users", search, page],
    queryFn: () => adminApi.users.list({ search, skip: page * limit, limit }),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const batchInviteMutation = useMutation({
    mutationFn: () =>
      adminApi.invitations.sendBatch({
        emails: inviteEmails.valid,
        message: inviteMessage.trim() || undefined,
      }),
    onSuccess: (result) => {
      const sent = result.sent ?? result.created?.length ?? 0;
      const skipped = result.skipped?.length ?? 0;
      const failed = result.failed?.length ?? 0;

      if (sent > 0) {
        toast.success(`${sent} invitation${sent > 1 ? "s" : ""} sent`);
        setInviteInput("");
        setInviteMessage("");
      }

      if (skipped > 0 || failed > 0) {
        toast.warning(`${skipped} skipped, ${failed} failed`);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-bo", "invitations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Unable to send invitations");
    },
  });

  const handleBatchInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmails.invalid.length > 0) {
      toast.error(`${inviteEmails.invalid.length} invalid email address(es)`);
      return;
    }
    if (inviteEmails.valid.length === 0) {
      toast.error("Add at least one email address");
      return;
    }
    batchInviteMutation.mutate();
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}" and all their data ?`)) return;
    try {
      await adminApi.users.delete(userId);
      toast.success("User deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
    } catch {
      toast.error("Error while deleting");
    }
  };

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    try {
      await adminApi.users.update(userId, { is_banned: !currentlyBanned });
      toast.success(currentlyBanned ? "User unbanned" : "User banned");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
    } catch {
      toast.error("Error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await adminApi.users.update(editingUser.id as string, {
        username: editingUser.username,
        email: editingUser.email,
      });
      toast.success("User updated");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
    } catch {
      toast.error("Error while updating");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Users</h2>
        <span className="font-data text-sm text-gray-500">{total} au total</span>
      </div>

      {/* Batch invitations */}
      <form onSubmit={handleBatchInvite} className="card-arcade mb-4 border border-cyan-500/25 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm uppercase text-cyan-400">Inviter des testeurs</h3>
            <p className="font-body text-xs text-gray-500">
              Paste multiple addresses separated by a comma, a space, or a new line.
            </p>
          </div>
          <span className="font-data text-xs text-gray-500">
            {inviteEmails.valid.length} valide{inviteEmails.valid.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <Textarea
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="driver.com, paddock.com"
            rows={3}
            className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
          />
          <div className="grid gap-3">
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Message optionnel"
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Button
              type="submit"
              disabled={inviteEmails.valid.length === 0 || batchInviteMutation.isPending}
              size="sm"
              className="btn-racing text-xs"
            >
              {batchInviteMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="mr-1 h-4 w-4" />
              )}
              Send invitations
            </Button>
          </div>
        </div>
        {inviteEmails.invalid.length > 0 && (
          <p className="mt-2 font-body text-xs text-red-400">
            Adresses invalides : {inviteEmails.invalid.slice(0, 4).join(", ")}
            {inviteEmails.invalid.length > 4 ? "..." : ""}
          </p>
        )}
      </form>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Rechercher par nom ou email..."
          className="pl-10 bg-gray-900 border-gray-700 text-white"
        />
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="card-arcade p-4 mb-4 border border-orange-500/30">
          <h3 className="font-heading text-sm text-orange-400 uppercase mb-3">Edit user</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              value={(editingUser.username as string) || ""}
              onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
              placeholder="Pseudo"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={(editingUser.email as string) || ""}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              placeholder="Email"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="btn-racing text-xs">
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingUser(null)}
              className="text-gray-400 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 font-body text-xs uppercase">
                  <th className="text-left p-3">Pseudo</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Niveau</th>
                  <th className="text-left p-3">XP</th>
                  <th className="text-left p-3">Inscrit le</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: Record<string, unknown>) => (
                  <tr
                    key={user.id as string}
                    className="border-b border-gray-800/50 hover:bg-white/5"
                  >
                    <td className="p-3 text-white font-body">
                      {user.username ? (
                        String(user.username)
                      ) : (
                        <span className="text-gray-600 italic">not set</span>
                      )}
                      {!!user.is_banned && (
                        <span className="ml-2 text-xs text-red-400 bg-red-500/20 px-1 rounded">
                          banni
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-400 font-body">{user.email as string}</td>
                    <td className="p-3 font-data text-cyan-400">{user.level as number}</td>
                    <td className="p-3 font-data text-orange-400">{user.xp as number}</td>
                    <td className="p-3 text-gray-500 font-body text-xs">
                      {user.created_at
                        ? new Date(user.created_at as string).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-gray-400 hover:text-cyan-400 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleBan(user.id as string, !!user.is_banned)}
                          className={`p-1.5 rounded ${user.is_banned ? "text-green-400 hover:text-green-300" : "text-yellow-400 hover:text-yellow-300"}`}
                          title={user.is_banned ? "Unban" : "Ban"}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              user.id as string,
                              (user.username as string) || (user.email as string),
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-body">
                      No user found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between p-3 border-t border-gray-800">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-gray-400"
              >
                <ChevronLeft className="w-4 h-4" />
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
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
