import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton — Broadcast Premium V2.
 * Uses the `animate-shimmer` keyframes from tailwind.config.cjs
 * (gradient sweep instead of opacity pulse).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded bg-pk-anthracite animate-shimmer", className)} {...props} />;
}

/* ── Preset skeletons ────────────────────────────────── */

/** Full-page spinner with loading text */
function SkeletonSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 border-[3px] border-white/[0.08] border-t-pk-red rounded-full animate-spin mb-3" />
      <span className="font-data text-[0.625rem] text-pk-titane">{text}</span>
    </div>
  );
}

/** Three-dot bounce loader (inline) */
function SkeletonDots() {
  return (
    <div className="flex gap-1 justify-center py-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-pk-red animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

/** Card skeleton — generic card with header + body placeholder */
function SkeletonCard() {
  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-2.5 w-3/4" />
    </div>
  );
}

/** Stats row skeleton — three stat boxes */
function SkeletonStats() {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-1 bg-pk-surface border border-white/[0.08] rounded-lg p-3.5 text-center"
        >
          <Skeleton className="h-5 w-10 mx-auto mb-1.5" />
          <Skeleton className="h-2 w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/** List item skeleton */
function SkeletonListItem() {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3 bg-pk-surface border border-white/[0.08] rounded-md">
      <Skeleton className="w-7 h-7 rounded-md" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-16" />
      </div>
      <Skeleton className="w-12 h-5 rounded" />
    </div>
  );
}

/** Calendar row skeleton */
function SkeletonCalendarRow() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 bg-pk-surface border border-white/[0.08] rounded-lg">
      <Skeleton className="w-7 h-7 rounded-md" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-18" />
      </div>
      <Skeleton className="w-12 h-5 rounded" />
    </div>
  );
}

/** Profile skeleton — avatar + name + badge */
function SkeletonProfile() {
  return (
    <div className="flex items-center gap-3.5 p-4 bg-pk-surface border border-white/[0.08] rounded-lg">
      <Skeleton className="w-14 h-14 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-2.5 w-36" />
      </div>
      <Skeleton className="w-12 h-12 rounded-lg" />
    </div>
  );
}

/** Leaderboard row skeleton */
function SkeletonLeaderboardRow() {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3 bg-pk-surface border border-white/[0.08] rounded-md">
      <Skeleton className="w-5 h-3.5" />
      <Skeleton className="w-8 h-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2 w-12" />
      </div>
      <Skeleton className="w-10 h-3.5" />
    </div>
  );
}

export {
  Skeleton,
  SkeletonSpinner,
  SkeletonDots,
  SkeletonCard,
  SkeletonStats,
  SkeletonListItem,
  SkeletonCalendarRow,
  SkeletonProfile,
  SkeletonLeaderboardRow,
};
