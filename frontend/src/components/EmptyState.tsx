import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { fadeUp, getReducedMotionProps } from "@/lib/motion";

/* ── Inline Empty State ──────────────────────────────── */

interface InlineEmptyProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Compact inline empty state — icon + text + optional CTA link.
 * For use inside cards, lists, sections.
 */
export function EmptyInline({ icon, title, description, actionLabel, onAction }: InlineEmptyProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3.5 p-5 bg-pk-surface border border-dashed border-white/[0.10] rounded-lg"
      {...rmProps}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-white/[0.03]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[0.8125rem] mb-0.5">{title}</p>
        <p className="text-[0.6875rem] text-pk-titane leading-snug">{description}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="mt-1.5 inline-flex items-center gap-1 font-data text-[0.5625rem] text-pk-red font-semibold"
          >
            {actionLabel}
            <ChevronRight className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Card CTA Empty State ────────────────────────────── */

interface CardCTAEmptyProps {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

/**
 * Prominent empty state with CTA button — red-subtle background.
 * For urgent actions (submit picks, join league).
 */
export function EmptyCardCTA({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: CardCTAEmptyProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="bg-pk-red-subtle border border-pk-red/[0.15] rounded-lg p-5 text-center"
      {...rmProps}
    >
      <div className="text-[2rem] mb-2">{icon}</div>
      <p className="font-display text-base mb-1">{title}</p>
      <p className="text-xs text-pk-titane leading-relaxed mb-3">{description}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-pk-red text-white font-data text-[0.625rem] font-bold uppercase active:scale-[0.97] transition-transform"
      >
        {actionLabel}
      </button>
    </motion.div>
  );
}

/* ── Placeholder Rows ────────────────────────────────── */

interface PlaceholderRowsProps {
  count?: number;
  message: string;
}

/**
 * Ghost placeholder rows — used for chat, leaderboard lists, etc.
 * Shows faded skeleton-like rows with a message below.
 */
export function EmptyPlaceholderRows({ count = 3, message }: PlaceholderRowsProps) {
  return (
    <div>
      <div className="space-y-0.5 mb-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3.5 py-3 bg-pk-surface border border-white/[0.08] rounded-md opacity-40"
          >
            <div className="w-7 h-7 rounded-full bg-pk-anthracite" />
            <div className="flex-1 space-y-1">
              <div
                className="h-1.5 rounded-full bg-pk-anthracite"
                style={{ width: `${60 + i * 10}%` }}
              />
              <div className="h-1.5 rounded-full bg-pk-anthracite w-[50%]" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-pk-titane py-2">{message}</p>
    </div>
  );
}

/* ── Minimal Centered ────────────────────────────────── */

interface MinimalEmptyProps {
  icon: string;
  message: string;
}

/**
 * Minimal centered empty state — icon + one-liner.
 * For small sections (badges grid, mini lists).
 */
export function EmptyMinimal({ icon, message }: MinimalEmptyProps) {
  return (
    <div className="text-center py-8 px-6">
      <div className="text-[1.75rem] mb-2 opacity-60">{icon}</div>
      <p className="text-[0.8125rem] text-pk-titane">{message}</p>
    </div>
  );
}

/* ── Full-page Empty ─────────────────────────────────── */

interface FullPageEmptyProps {
  Icon?: LucideIcon;
  emoji?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Full-page empty state — centered with icon, title, description, optional CTA.
 * For completely empty pages.
 */
export function EmptyFullPage({
  Icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
}: FullPageEmptyProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center text-center py-20 px-6"
      {...rmProps}
    >
      <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        {Icon ? (
          <Icon className="w-6 h-6 text-pk-titane" />
        ) : (
          <span className="text-2xl">{emoji}</span>
        )}
      </div>
      <p className="font-display text-base text-pk-titane mb-1">{title}</p>
      <p className="text-xs text-pk-titane/60 max-w-[260px] leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
