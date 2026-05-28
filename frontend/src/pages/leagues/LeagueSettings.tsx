/**
 * LeagueSettings — Owner/member actions (transfer, delete, leave).
 * Broadcast Premium theme: pk-* modals, native buttons.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Crown,
  LogOut,
  Trash2,
  UserCog,
  Users,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { api, getApiError } from "@/lib/api";
import { haptic } from "@/lib/haptics";

/* ── Types ─────────────────────────────────────────────── */

interface SettingsLeague {
  name: string;
}

interface SettingsMember {
  id: string;
  username?: string;
  level?: number;
}

interface LeagueSettingsProps {
  league: SettingsLeague;
  leagueId: string | undefined;
  members: SettingsMember[];
  avatars: unknown;
  userId: string;
  isOwner: boolean;
  onRefresh: () => void;
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueSettings({
  league,
  leagueId,
  members,
  userId,
  isOwner,
  onRefresh,
}: LeagueSettingsProps) {
  const navigate = useNavigate();

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);

  /* ── Actions ─────────────────────────────────────────── */

  const leaveLeague = async () => {
    setLeaving(true);
    try {
      haptic("heavy");
      await api.leagues.leave(leagueId!);
      toast.success("You left the league");
      navigate("/league");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Error while leaving"));
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const deleteLeague = async () => {
    setDeleting(true);
    try {
      haptic("heavy");
      await api.leagues.delete(leagueId!);
      toast.success("The league has been deleted");
      navigate("/league");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Error while deleting"));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const transferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error("Selectionne un nouveau proprietaire");
      return;
    }
    setTransferring(true);
    try {
      haptic("success");
      await api.leagues.transfer(leagueId!, { new_owner_id: selectedNewOwner });
      toast.success("Propriete transferee !");
      setShowTransferModal(false);
      setSelectedNewOwner(null);
      onRefresh();
    } catch (e: unknown) {
      toast.error(getApiError(e, "Error while transferring"));
    } finally {
      setTransferring(false);
    }
  };

  /* ── Render ──────────────────────────────────────────── */

  return (
    <>
      {/* Action buttons */}
      <motion.div
        className="mt-6 pt-5 border-t border-white/[0.08] space-y-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isOwner && (
          <div className="space-y-2 mb-3">
            <p className="font-data text-[0.5625rem] text-pk-amber uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3 h-3" />
              Actions du createur
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex-1 h-10 rounded-lg border border-pk-info/30 text-pk-info font-display text-sm flex items-center justify-center gap-1.5 hover:bg-pk-info/[0.08] transition-colors"
                data-testid="transfer-ownership-btn"
              >
                <UserCog className="w-3.5 h-3.5" />
                Transferer
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 h-10 rounded-lg border border-pk-red/30 text-pk-red font-display text-sm flex items-center justify-center gap-1.5 hover:bg-pk-red/[0.08] transition-colors"
                data-testid="delete-league-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        )}

        {!isOwner && (
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full h-10 rounded-lg border border-pk-red/30 text-pk-red font-display text-sm flex items-center justify-center gap-1.5 hover:bg-pk-red/[0.08] transition-colors"
            data-testid="leave-league-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave league
          </button>
        )}
      </motion.div>

      {/* Transfer Ownership Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden max-h-[80vh] flex flex-col"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
                <h3 className="font-display text-sm flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-pk-info" />
                  Transferer la propriete
                </h3>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedNewOwner(null);
                  }}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                <p className="text-xs text-pk-titane">
                  Selectionne le nouveau proprietaire de{" "}
                  <span className="text-pk-piste font-semibold">{league.name}</span>
                </p>

                <div className="space-y-1.5">
                  {members
                    .filter((m) => String(m.id) !== userId)
                    .map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedNewOwner(member.id)}
                        className={`w-full p-3 rounded-lg border transition-colors text-left flex items-center gap-3 ${
                          selectedNewOwner === member.id
                            ? "bg-pk-info/[0.1] border-pk-info/30"
                            : "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.14]"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-pk-anthracite flex items-center justify-center font-display text-sm">
                          {(member.username ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-display text-sm">{member.username ?? "No username"}</p>
                          <p className="font-data text-[0.5625rem] text-pk-titane">
                            Niveau {member.level ?? 1}
                          </p>
                        </div>
                        {selectedNewOwner === member.id && (
                          <Check className="w-4 h-4 text-pk-info" />
                        )}
                      </button>
                    ))}

                  {members.filter((m) => String(m.id) !== userId).length === 0 && (
                    <div className="text-center py-6">
                      <Users className="w-8 h-8 text-pk-titane mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-pk-titane">No other member</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setSelectedNewOwner(null);
                    }}
                    disabled={transferring}
                    className="flex-1 h-10 rounded-lg border border-white/[0.08] text-pk-titane font-display text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={transferOwnership}
                    disabled={transferring || !selectedNewOwner}
                    className="flex-1 h-10 rounded-lg bg-pk-info text-white font-display text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.97] transition-transform"
                    data-testid="confirm-transfer-btn"
                  >
                    {transferring ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transfert...
                      </>
                    ) : (
                      <>
                        <UserCog className="w-3.5 h-3.5" /> Transferer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete League Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <h3 className="font-display text-sm flex items-center gap-2 text-pk-red">
                  <AlertTriangle className="w-4 h-4" />
                  Delete league
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-pk-titane">
                  Are you sure you want to delete{" "}
                  <span className="text-pk-piste font-semibold">{league.name}</span> ?
                </p>
                <p className="text-xs text-pk-red bg-pk-red/[0.08] border border-pk-red/15 p-3 rounded-lg leading-relaxed">
                  This action cannot be undone. All members will be removed and the data seront
                  supprimees.
                </p>
                {members.length > 1 && (
                  <p className="text-xs text-pk-amber bg-pk-amber/[0.08] border border-pk-amber/15 p-3 rounded-lg">
                    {members.length - 1} other member{members.length > 2 ? "s" : ""}
                    {members.length > 2 ? "s" : ""} sera{members.length > 2 ? "ont" : ""} retire
                    {members.length > 2 ? "s" : ""}.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="flex-1 h-10 rounded-lg border border-white/[0.08] text-pk-titane font-display text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteLeague}
                    disabled={deleting}
                    className="flex-1 h-10 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.97] transition-transform"
                    data-testid="confirm-delete-league-btn"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suppression...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <h3 className="font-display text-sm flex items-center gap-2 text-pk-red">
                  <LogOut className="w-4 h-4" />
                  Leave league
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-pk-titane">
                  Are you sure you want to leave{" "}
                  <span className="text-pk-piste font-semibold">{league.name}</span> ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    disabled={leaving}
                    className="flex-1 h-10 rounded-lg border border-white/[0.08] text-pk-titane font-display text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={leaveLeague}
                    disabled={leaving}
                    className="flex-1 h-10 rounded-lg bg-pk-red text-white font-display text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.97] transition-transform"
                    data-testid="confirm-leave-btn"
                  >
                    {leaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Depart...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-3.5 h-3.5" /> Quitter
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
