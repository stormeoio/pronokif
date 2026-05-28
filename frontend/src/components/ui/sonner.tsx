import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Broadcast Premium Toaster — dark-only, V2 banner style.
 * Renders Sonner with PronoKif brand tokens.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-lg !border !border-white/[0.08] !bg-pk-surface !text-pk-piste !shadow-lg !font-body !text-[0.8125rem]",
          title: "!font-bold !text-[0.8125rem]",
          description: "!text-pk-titane !text-[0.6875rem] !leading-snug",
          actionButton:
            "!bg-pk-red !text-white !font-data !text-[0.5625rem] !font-semibold !rounded-md !px-3 !py-1.5",
          cancelButton:
            "!bg-white/[0.06] !text-pk-piste !border !border-white/[0.08] !font-data !text-[0.5625rem] !rounded-md !px-3 !py-1.5",
          success:
            "!bg-pk-emerald/[0.06] !border-pk-emerald/[0.15] !border-l-[3px] !border-l-pk-emerald",
          error: "!bg-pk-red/[0.05] !border-pk-red/[0.15] !border-l-[3px] !border-l-pk-red",
          warning: "!bg-pk-amber/[0.05] !border-pk-amber/[0.15] !border-l-[3px] !border-l-pk-amber",
          info: "!bg-pk-info/[0.05] !border-pk-info/[0.15] !border-l-[3px] !border-l-pk-info",
        },
      }}
      {...props}
    />
  );
};

/* ── Themed toast helpers ────────────────────────────── */

/** Success toast with checkmark */
const toastSuccess = (title: string, description?: string) => toast.success(title, { description });

/** Error toast */
const toastError = (title: string, description?: string) => toast.error(title, { description });

/** Warning toast */
const toastWarning = (title: string, description?: string) => toast.warning(title, { description });

/** Info toast */
const toastInfo = (title: string, description?: string) => toast.info(title, { description });

/** Compact toast with undo action */
const toastUndo = (title: string, onUndo: () => void) =>
  toast(title, {
    action: {
      label: "Cancel",
      onClick: onUndo,
    },
  });

export { Toaster, toast, toastSuccess, toastError, toastWarning, toastInfo, toastUndo };
