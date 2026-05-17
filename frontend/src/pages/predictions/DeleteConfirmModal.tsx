import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

interface DeleteConfirmModalProps {
  raceName: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  raceName,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-[#0a1628] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full"
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"
            initial={{ rotate: -15, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.15 }}
          >
            <Trash2 className="w-6 h-6 text-red-400" />
          </motion.div>
          <div>
            <h3 className="font-heading text-lg text-white uppercase">Supprimer</h3>
            <p className="font-body text-xs text-gray-400">Cette action est irréversible</p>
          </div>
        </div>
        <p className="font-body text-sm text-gray-300 mb-6">
          Veux-tu vraiment supprimer tous tes pronostics pour le{" "}
          <strong className="text-white">{raceName}</strong> ?
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => { haptic("light"); onCancel(); }}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            disabled={deleting}
          >
            Annuler
          </Button>
          <Button
            onClick={() => { haptic("heavy"); onConfirm(); }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            disabled={deleting}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
