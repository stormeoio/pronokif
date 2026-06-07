/**
 * FeedbackFab — discreet "add feedback" toggle shown in the footer of every
 * front-end page. Opens the global FeedbackModal (text + screenshots).
 *
 * Mounted once in AppLayout and gated on auth there, so it appears app-wide
 * without each page wiring it up.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus } from "lucide-react";
import FeedbackModal from "./FeedbackModal";
import { haptic } from "@/lib/haptics";

export default function FeedbackFab() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic("light");
          setOpen(true);
        }}
        aria-label={t("feedback.fab_label", "Donner mon avis")}
        title={t("feedback.fab_label", "Donner mon avis")}
        data-testid="feedback-fab"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] left-3 z-40
          flex h-9 w-9 items-center justify-center rounded-full
          border border-white/[0.1] bg-pk-surface/80 text-pk-titane
          opacity-60 backdrop-blur-md transition-all duration-pk-short
          hover:w-auto hover:gap-1.5 hover:px-3 hover:text-pk-info hover:opacity-100
          focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-info/40
          active:scale-95 group"
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        <span className="hidden whitespace-nowrap font-data text-[0.625rem] uppercase tracking-[0.08em] group-hover:inline">
          {t("feedback.fab_label", "Donner mon avis")}
        </span>
      </button>
      <FeedbackModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
