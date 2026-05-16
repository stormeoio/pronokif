import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1628] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
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
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            disabled={deleting}
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            disabled={deleting}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
