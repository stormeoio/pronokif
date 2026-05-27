import { Trash2, AlertTriangle } from "lucide-react";
import { haptic } from "@/lib/haptics";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetBody,
  BottomSheetActions,
  BottomSheetButton,
  BottomSheetCallout,
} from "@/components/ui/bottom-sheet";

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
    <BottomSheet open onOpenChange={(open) => !open && onCancel()}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>Supprimer les pronos</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody>
          <BottomSheetCallout variant="danger">
            <AlertTriangle className="w-4 h-4 text-pk-red flex-shrink-0 mt-0.5" />
            <span className="text-[0.6875rem] text-pk-titane leading-snug">
              Tes pronostics pour <strong className="text-pk-piste">{raceName}</strong> seront
              definitivement effaces. Cette action est irreversible.
            </span>
          </BottomSheetCallout>

          <BottomSheetActions>
            <BottomSheetButton
              variant="danger"
              onClick={() => {
                haptic("heavy");
                onConfirm();
              }}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Suppression..." : "Supprimer"}
            </BottomSheetButton>
            <BottomSheetButton
              variant="ghost"
              onClick={() => {
                haptic("light");
                onCancel();
              }}
              disabled={deleting}
            >
              Annuler
            </BottomSheetButton>
          </BottomSheetActions>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
