import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Root ────────────────────────────────────────────── */

const BottomSheet = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
BottomSheet.displayName = "BottomSheet";

/* ── Trigger / Close / Portal ────────────────────────── */

const BottomSheetTrigger = DrawerPrimitive.Trigger;
const BottomSheetClose = DrawerPrimitive.Close;
const BottomSheetPortal = DrawerPrimitive.Portal;

/* ── Overlay ─────────────────────────────────────────── */

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/70 backdrop-blur-sm", className)}
    {...props}
  />
));
BottomSheetOverlay.displayName = "BottomSheetOverlay";

/* ── Content ─────────────────────────────────────────── */

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <BottomSheetPortal>
    <BottomSheetOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col",
        "rounded-t-2xl border border-white/[0.08] border-b-0",
        "bg-pk-surface",
        className,
      )}
      {...props}
    >
      {/* Handle bar */}
      <div className="mx-auto mt-2.5 mb-1 h-1 w-9 rounded-full bg-white/[0.15]" />
      {children}
    </DrawerPrimitive.Content>
  </BottomSheetPortal>
));
BottomSheetContent.displayName = "BottomSheetContent";

/* ── Header ──────────────────────────────────────────── */

interface BottomSheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show close X button (default true) */
  showClose?: boolean;
}

const BottomSheetHeader = React.forwardRef<HTMLDivElement, BottomSheetHeaderProps>(
  ({ className, children, showClose = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between px-5 pb-3", className)}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {showClose && (
        <DrawerPrimitive.Close className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-pk-titane hover:text-pk-piste transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
          <span className="sr-only">Fermer</span>
        </DrawerPrimitive.Close>
      )}
    </div>
  ),
);
BottomSheetHeader.displayName = "BottomSheetHeader";

/* ── Title ───────────────────────────────────────────── */

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title ref={ref} className={cn("font-display text-base", className)} {...props} />
));
BottomSheetTitle.displayName = "BottomSheetTitle";

/* ── Description ─────────────────────────────────────── */

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-[0.8125rem] text-pk-titane leading-relaxed", className)}
    {...props}
  />
));
BottomSheetDescription.displayName = "BottomSheetDescription";

/* ── Body ────────────────────────────────────────────── */

const BottomSheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-5 pb-5", className)} {...props} />
);
BottomSheetBody.displayName = "BottomSheetBody";

/* ── Actions ─────────────────────────────────────────── */

const BottomSheetActions = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2", className)} {...props} />
);
BottomSheetActions.displayName = "BottomSheetActions";

/* ── Action Button ───────────────────────────────────── */

type ActionVariant = "danger" | "primary" | "success" | "ghost";

interface BottomSheetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
}

const variantStyles: Record<ActionVariant, string> = {
  danger: "bg-pk-red text-white shadow-glow-red",
  primary: "bg-pk-red text-white shadow-glow-red",
  success: "bg-pk-emerald text-white",
  ghost: "bg-white/[0.04] border border-white/[0.08] text-pk-piste",
};

const BottomSheetButton = React.forwardRef<HTMLButtonElement, BottomSheetButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "h-12 rounded-lg text-sm font-semibold flex items-center justify-center gap-2",
        "active:scale-[0.97] transition-transform",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);
BottomSheetButton.displayName = "BottomSheetButton";

/* ── Warning Callout ─────────────────────────────────── */

interface BottomSheetCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "warning" | "danger" | "info";
}

const calloutStyles = {
  warning: "bg-pk-amber/[0.06] border-pk-amber/[0.15]",
  danger: "bg-pk-red/[0.06] border-pk-red/[0.15]",
  info: "bg-pk-info/[0.06] border-pk-info/[0.15]",
};

const BottomSheetCallout = React.forwardRef<HTMLDivElement, BottomSheetCalloutProps>(
  ({ className, variant = "warning", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-start gap-2 px-3 py-2.5 rounded-lg border mb-4",
        calloutStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
BottomSheetCallout.displayName = "BottomSheetCallout";

/* ── Exports ─────────────────────────────────────────── */

export {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetBody,
  BottomSheetActions,
  BottomSheetButton,
  BottomSheetCallout,
};
