import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <BottomSheet open onOpenChange={(open) => !open && onCancel()}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t("custom_predictions.delete_title")}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody>
          <BottomSheetCallout variant="danger">
            <AlertTriangle className="w-4 h-4 text-pk-red flex-shrink-0 mt-0.5" />
            <span className="text-[0.6875rem] text-pk-titane leading-snug">
              {t("custom_predictions.delete_warning", { race: raceName })}
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
              {deleting ? t("custom_predictions.deleting") : t("custom_predictions.delete")}
            </BottomSheetButton>
            <BottomSheetButton
              variant="ghost"
              onClick={() => {
                haptic("light");
                onCancel();
              }}
              disabled={deleting}
            >
              {t("common.cancel")}
            </BottomSheetButton>
          </BottomSheetActions>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
