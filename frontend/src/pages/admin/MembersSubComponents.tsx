import { motion } from "framer-motion";
import {
  Loader2,
  Users,
  X,
  AlertTriangle,
  Info,
  Trash2,
  History,
  Globe,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserIdentity } from "@/components/users/UserIdentity";

interface MemberDetails {
  id: number;
  username: string | null;
  email: string;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  created_at: string;
  level: number;
  xp: number;
  stats?: {
    predictions_count?: number;
    correct_poles?: number;
    correct_winners?: number;
    perfect_top10?: number;
    races_participated?: number;
  };
  leagues?: Array<{ id: number; name: string; members_count: number }>;
}

interface MemberSession {
  id?: number;
  login_at: string;
  ip_address?: string;
  user_agent?: string;
}

interface MemberActivity {
  sessions: MemberSession[];
}

interface DeleteConfirmModalProps {
  memberDetails: MemberDetails;
  deletingMember: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  memberDetails,
  deletingMember,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-md card-arcade overflow-hidden"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/30">
          <h3 className="font-heading text-sm uppercase text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Confirm deletion
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="font-body text-gray-300">
            <p className="mb-3">Are you sure you want to delete this account?</p>
            <UserIdentity
              user={{
                id: String(memberDetails.id),
                username: memberDetails.username,
                email: memberDetails.email,
                avatar_id: memberDetails.avatar_id,
                custom_avatar_url: memberDetails.custom_avatar_url,
                level: memberDetails.level,
              }}
              surface="admin"
              size="md"
              showEmail
            />
          </div>
          <p className="font-body text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
            {"⚠️"} This action cannot be undone. All data for this member will be deleted :
            predictions, scores, statistiques, etc.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              disabled={deletingMember}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={deletingMember}
              data-testid="confirm-delete-member-btn"
            >
              {deletingMember ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface MemberDetailsModalProps {
  loadingMemberDetails: boolean;
  memberDetails: MemberDetails | null;
  memberDetailTab: string;
  setMemberDetailTab: (tab: string) => void;
  memberActivity: MemberActivity | null;
  loadingActivity: boolean;
  selectedMember: number | null;
  fetchMemberActivity: (memberId: number | null) => void;
  onClose: () => void;
  onDelete: () => void;
}

export function MemberDetailsModal({
  loadingMemberDetails,
  memberDetails,
  memberDetailTab,
  setMemberDetailTab,
  memberActivity,
  loadingActivity,
  selectedMember,
  fetchMemberActivity,
  onClose,
  onDelete,
}: MemberDetailsModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-lg card-arcade overflow-hidden max-h-[85vh] flex flex-col"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="bg-gradient-to-r from-green-600/20 to-transparent px-4 py-3 border-b border-gray-700/50 flex items-center justify-between sticky top-0 bg-[#0c1525] z-10">
          <h3 className="font-heading text-sm uppercase text-green-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Member details
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingMemberDetails ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto" />
          </div>
        ) : (
          memberDetails && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Basic Info Header */}
                <UserIdentity
                  user={{
                    id: String(memberDetails.id),
                    username: memberDetails.username,
                    email: memberDetails.email,
                    avatar_id: memberDetails.avatar_id,
                    custom_avatar_url: memberDetails.custom_avatar_url,
                    level: memberDetails.level,
                  }}
                  surface="admin"
                  size="lg"
                  showEmail
                  textClassName="font-heading text-lg"
                >
                  <span className="mt-1 block font-body text-xs text-gray-500">
                    Inscrit le {new Date(memberDetails.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </UserIdentity>

                {/* Tab Selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setMemberDetailTab("info")}
                    className={`flex-1 p-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      memberDetailTab === "info"
                        ? "bg-green-500/20 border-2 border-green-500 text-green-400"
                        : "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    <Info className="w-4 h-4" />
                    Infos
                  </button>
                  <button
                    onClick={() => {
                      setMemberDetailTab("activity");
                      if (!memberActivity) {
                        fetchMemberActivity(selectedMember);
                      }
                    }}
                    className={`flex-1 p-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      memberDetailTab === "activity"
                        ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400"
                        : "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Activite
                  </button>
                </div>

                {memberDetailTab === "info" && <MemberInfoContent memberDetails={memberDetails} />}

                {memberDetailTab === "activity" && (
                  <MemberActivityContent
                    loadingActivity={loadingActivity}
                    memberActivity={memberActivity}
                  />
                )}

                {/* Delete Button */}
                <div className="pt-4 border-t border-gray-700/50">
                  <Button
                    onClick={onDelete}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
                    data-testid="delete-member-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete this account
                  </Button>
                </div>
              </div>
            </div>
          )
        )}
      </motion.div>
    </motion.div>
  );
}

interface MemberInfoContentProps {
  memberDetails: MemberDetails;
}

export function MemberInfoContent({ memberDetails }: MemberInfoContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="font-data text-xl text-cyan-400">{memberDetails.level}</p>
          <p className="font-body text-xs text-gray-500">Niveau</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="font-data text-xl text-yellow-400">{memberDetails.xp}</p>
          <p className="font-body text-xs text-gray-500">XP</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="font-data text-xl text-green-400">
            {memberDetails.stats?.predictions_count || 0}
          </p>
          <p className="font-body text-xs text-gray-500">Pronostics</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <p className="font-data text-xl text-purple-400">{memberDetails.leagues?.length || 0}</p>
          <p className="font-body text-xs text-gray-500">Leagues</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3">
        <h5 className="font-heading text-xs text-gray-400 uppercase mb-2">Performance</h5>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Poles exactes:</span>
            <span className="text-white">{memberDetails.stats?.correct_poles || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Winners exacts:</span>
            <span className="text-white">{memberDetails.stats?.correct_winners || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Top 10 parfaits:</span>
            <span className="text-white">{memberDetails.stats?.perfect_top10 || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Races:</span>
            <span className="text-white">{memberDetails.stats?.races_participated || 0}</span>
          </div>
        </div>
      </div>

      {(memberDetails.leagues?.length ?? 0) > 0 && (
        <div className="bg-white/5 rounded-lg p-3">
          <h5 className="font-heading text-xs text-gray-400 uppercase mb-2">Leagues</h5>
          <div className="space-y-1">
            {memberDetails.leagues?.map((league) => (
              <div key={league.id} className="flex justify-between text-sm">
                <span className="text-white">{league.name}</span>
                <span className="text-gray-500">{league.members_count} members</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface MemberActivityContentProps {
  loadingActivity: boolean;
  memberActivity: MemberActivity | null;
}

export function MemberActivityContent({
  loadingActivity,
  memberActivity,
}: MemberActivityContentProps) {
  return (
    <div className="space-y-3">
      {loadingActivity ? (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
          <p className="font-body text-sm text-gray-500 mt-2">Loading history...</p>
        </div>
      ) : (memberActivity?.sessions?.length ?? 0) > 0 ? (
        <>
          <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
            <p className="font-body text-sm text-cyan-400">
              <History className="w-4 h-4 inline mr-2" />
              {memberActivity!.sessions.length} sign-in(s) recorded
            </p>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {memberActivity!.sessions.map((session: MemberSession, index: number) => (
              <div
                key={session.id || index}
                className="bg-white/5 rounded-lg p-3 border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-sm text-white">
                    {new Date(session.login_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-body">
                      Derniere
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Globe className="w-3 h-3" />
                    <span className="font-mono">{session.ip_address || "IP non enregistree"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-500">
                    <Monitor className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="font-mono text-[10px] break-all line-clamp-2">
                      {session.user_agent || "User agent non enregistre"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="p-8 text-center bg-white/5 rounded-lg">
          <History className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="font-body text-gray-500">No sign-in history</p>
        </div>
      )}
    </div>
  );
}
