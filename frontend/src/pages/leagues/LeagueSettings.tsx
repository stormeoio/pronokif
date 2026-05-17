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
import { Button } from "../../components/ui/button";
import { api, getApiError } from "@/lib/api";

interface LeagueSettingsProps {
  league: Record<string, any>;
  leagueId: string | undefined;
  members: Record<string, any>[];
  avatars: Record<string, any> | null;
  userId: string;
  isOwner: boolean;
  onRefresh: () => void;
}

export default function LeagueSettings({
  league,
  leagueId,
  members,
  avatars,
  userId,
  isOwner,
  onRefresh,
}: LeagueSettingsProps) {
  const navigate = useNavigate();

  // Leave league
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Delete league
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Transfer ownership
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);

  const leaveLeague = async () => {
    setLeaving(true);
    try {
      await api.leagues.leave(leagueId!);
      toast.success("Tu as quitté la ligue");
      navigate("/league");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Erreur lors du départ"));
    } finally {
      setLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  const deleteLeague = async () => {
    setDeleting(true);
    try {
      await api.leagues.delete(leagueId!);
      toast.success("La ligue a été supprimée");
      navigate("/league");
    } catch (e: unknown) {
      toast.error(getApiError(e, "Erreur lors de la suppression"));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const transferOwnership = async () => {
    if (!selectedNewOwner) {
      toast.error("Sélectionne un nouveau propriétaire");
      return;
    }

    setTransferring(true);
    try {
      await api.leagues.transfer(leagueId!, {
        new_owner_id: selectedNewOwner,
      });
      toast.success("Propriété transférée !");
      setShowTransferModal(false);
      setSelectedNewOwner(null);
      onRefresh();
    } catch (e: unknown) {
      toast.error(getApiError(e, "Erreur lors du transfert"));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <>
      {/* Action buttons */}
      <motion.div
        className="mt-8 pt-6 border-t border-gray-700/50 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {isOwner && (
          <div className="space-y-2 mb-4">
            <p className="font-heading text-xs text-yellow-400 uppercase flex items-center gap-2">
              <Crown className="w-3 h-3" />
              Actions du créateur
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowTransferModal(true)}
                variant="outline"
                className="flex-1 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500"
                data-testid="transfer-ownership-btn"
              >
                <UserCog className="w-4 h-4 mr-2" />
                Transférer
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
                data-testid="delete-league-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </div>
        )}

        {!isOwner && (
          <Button
            onClick={() => setShowLeaveConfirm(true)}
            variant="outline"
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
            data-testid="leave-league-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Quitter la ligue
          </Button>
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
            className="w-full max-w-md card-arcade overflow-hidden max-h-[80vh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            <div className="bg-gradient-to-r from-cyan-600/20 to-transparent px-4 py-3 border-b border-cyan-500/30 flex items-center justify-between">
              <h3 className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Transférer la propriété
              </h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedNewOwner(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <p className="font-body text-sm text-gray-300">
                Sélectionne le nouveau propriétaire de la ligue{" "}
                <span className="text-yellow-400 font-semibold">{league.name}</span>
              </p>

              <div className="space-y-2">
                {members
                  .filter((m) => m.id !== userId)
                  .map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedNewOwner(member.id)}
                      className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                        selectedNewOwner === member.id
                          ? "bg-cyan-500/20 border-cyan-500"
                          : "bg-gray-800/30 border-gray-700/50 hover:border-cyan-500/50"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading"
                        style={{ backgroundColor: avatars?.[member.id]?.color || "#3b82f6" }}
                      >
                        {avatars?.[member.id]?.emoji ||
                          member.username?.charAt(0)?.toUpperCase() ||
                          "?"}
                      </div>
                      <div className="flex-1">
                        <p className="font-heading text-sm text-white">
                          {member.username || "Sans pseudo"}
                        </p>
                        <p className="font-body text-xs text-gray-500">
                          Niveau {member.level || 1}
                        </p>
                      </div>
                      {selectedNewOwner === member.id && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </button>
                  ))}

                {members.filter((m) => m.id !== userId).length === 0 && (
                  <div className="text-center py-6">
                    <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="font-body text-sm text-gray-500">
                      Aucun autre membre à qui transférer
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedNewOwner(null);
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={transferring}
                >
                  Annuler
                </Button>
                <Button
                  onClick={transferOwnership}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={transferring || !selectedNewOwner}
                  data-testid="confirm-transfer-btn"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Transfert...
                    </>
                  ) : (
                    <>
                      <UserCog className="w-4 h-4 mr-2" /> Transférer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Delete League Confirmation Modal */}
      <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md card-arcade overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/30">
              <h3 className="font-heading text-sm uppercase text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Supprimer la ligue
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="font-body text-gray-300">
                Es-tu sûr(e) de vouloir supprimer{" "}
                <span className="text-white font-semibold">{league.name}</span> ?
              </p>
              <p className="font-body text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                Cette action est irréversible. Tous les membres seront retirés et les données de la
                ligue (messages, classement) seront supprimées.
              </p>
              {members.length > 1 && (
                <p className="font-body text-sm text-yellow-400 bg-yellow-500/10 p-3 rounded-lg">
                  {members.length - 1} autre{members.length > 2 ? "s" : ""} membre
                  {members.length > 2 ? "s" : ""} sera{members.length > 2 ? "ont" : ""} retiré
                  {members.length > 2 ? "s" : ""} de la ligue.
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={deleting}
                >
                  Annuler
                </Button>
                <Button
                  onClick={deleteLeague}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleting}
                  data-testid="confirm-delete-league-btn"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
      {showLeaveConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md card-arcade overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
          >
            <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/30">
              <h3 className="font-heading text-sm uppercase text-red-400 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Quitter la ligue
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <p className="font-body text-gray-300">
                Es-tu sûr(e) de vouloir quitter{" "}
                <span className="text-white font-semibold">{league.name}</span> ?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowLeaveConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                  disabled={leaving}
                >
                  Annuler
                </Button>
                <Button
                  onClick={leaveLeague}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={leaving}
                  data-testid="confirm-leave-btn"
                >
                  {leaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Départ...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" /> Quitter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
