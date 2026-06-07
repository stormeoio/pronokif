import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Users, RefreshCw } from "lucide-react";
import { DeleteConfirmModal, MemberDetailsModal } from "./MembersSubComponents";
import { api } from "@/lib/api";
import { UserIdentity } from "@/components/users/UserIdentity";

interface MemberListItem {
  id: number;
  username: string | null;
  email: string;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  level: number;
  predictions_count: number;
}

interface MemberDetails {
  id: number;
  username: string | null;
  email: string;
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

interface MemberActivity {
  sessions: Array<{
    id?: number;
    login_at: string;
    ip_address?: string;
    user_agent?: string;
  }>;
}

export default function MembersTab() {
  const queryClient = useQueryClient();

  const {
    data: membersList = [],
    isLoading: loadingMembers,
    refetch: fetchMembers,
  } = useQuery({
    queryKey: ["/admin/members"],
    queryFn: (): Promise<MemberListItem[]> => api.admin.members(),
  });

  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [memberActivity, setMemberActivity] = useState<MemberActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [memberDetailTab, setMemberDetailTab] = useState("info");

  const fetchMemberDetails = async (memberId: number) => {
    setLoadingMemberDetails(true);
    setMemberDetailTab("info");
    setMemberActivity(null);
    try {
      const data = await api.admin.member(String(memberId));
      setMemberDetails(data as MemberDetails);
    } catch (error: unknown) {
      console.error(error);
      toast.error("Error while loading des details");
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const fetchMemberActivity = async (memberId: number | null) => {
    setLoadingActivity(true);
    try {
      const data = await api.admin.memberActivity(String(memberId));
      setMemberActivity(data as unknown as MemberActivity);
    } catch (error: unknown) {
      console.error(error);
      toast.error("Error while loading de l'activite");
    } finally {
      setLoadingActivity(false);
    }
  };

  const deleteMember = async (memberId: number | null) => {
    setDeletingMember(true);
    try {
      await api.admin.deleteMember(String(memberId));
      toast.success("Member deleted successfully");
      setSelectedMember(null);
      setMemberDetails(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["/admin/members"] });
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Error while deleting");
    } finally {
      setDeletingMember(false);
    }
  };

  const closeModal = () => {
    setSelectedMember(null);
    setMemberDetails(null);
    setMemberActivity(null);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && memberDetails && (
        <DeleteConfirmModal
          memberDetails={memberDetails}
          deletingMember={deletingMember}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => deleteMember(selectedMember)}
        />
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <MemberDetailsModal
          loadingMemberDetails={loadingMemberDetails}
          memberDetails={memberDetails}
          memberDetailTab={memberDetailTab}
          setMemberDetailTab={setMemberDetailTab}
          memberActivity={memberActivity}
          loadingActivity={loadingActivity}
          selectedMember={selectedMember}
          fetchMemberActivity={fetchMemberActivity}
          onClose={closeModal}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {/* Members List */}
      <div className="card-arcade overflow-hidden">
        <div className="bg-gradient-to-r from-green-600/20 to-transparent px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="font-heading text-sm uppercase text-green-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Members inscrits
            <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-data">
              {membersList.length}
            </span>
          </h3>
          <button
            onClick={() => fetchMembers()}
            className="text-gray-400 hover:text-white"
            aria-label="Refresh member list"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMembers ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingMembers ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto" />
          </div>
        ) : membersList.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="font-body text-gray-500">No registered members</p>
          </div>
        ) : (
          <motion.div
            className="divide-y divide-gray-800 max-h-96 overflow-y-auto"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
          >
            {membersList.map((member) => (
              <motion.button
                key={member.id}
                onClick={() => {
                  setSelectedMember(member.id);
                  fetchMemberDetails(member.id);
                }}
                className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                whileTap={{ scale: 0.98 }}
              >
                <UserIdentity
                  user={{
                    id: String(member.id),
                    username: member.username,
                    email: member.email,
                    avatar_id: member.avatar_id,
                    custom_avatar_url: member.custom_avatar_url,
                    level: member.level,
                  }}
                  surface="admin"
                  linked={false}
                  size="md"
                  showEmail
                  className="flex-1"
                  data-testid={`admin-user-row-identity-${member.id}`}
                />
                <div className="text-right">
                  <p className="font-data text-sm text-cyan-400">Niv. {member.level || 1}</p>
                  <p className="font-body text-xs text-gray-500">
                    {member.predictions_count || 0} pronos
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
