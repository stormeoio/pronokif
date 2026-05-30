import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type EntityTokenTone =
  | "driver"
  | "player"
  | "race"
  | "team"
  | "circuit"
  | "date"
  | "championship"
  | "neutral";

type EntityTokenMeta = {
  label: string;
  value?: string | number | null;
  href?: string;
  ariaLabel?: string;
};

interface EntityTokenProps {
  compactLabel: string;
  label: string;
  kindLabel: string;
  href?: string;
  description?: string;
  meta?: EntityTokenMeta[];
  tone?: EntityTokenTone;
  className?: string;
  defaultOpen?: boolean;
  focusable?: boolean;
}

const tokenTones: Record<EntityTokenTone, string> = {
  driver: "border-pk-red/35 bg-pk-red-subtle text-pk-piste hover:border-pk-red/70",
  player: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:border-cyan-300/70",
  race: "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-300/70",
  team: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-300/70",
  circuit: "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:border-sky-300/70",
  date: "border-violet-400/30 bg-violet-500/10 text-violet-100 hover:border-violet-300/70",
  championship: "border-pk-red/35 bg-pk-red-subtle text-pk-piste hover:border-pk-red/70",
  neutral: "border-white/12 bg-white/[0.04] text-pk-piste hover:border-white/25",
};

export function EntityToken({
  compactLabel,
  label,
  kindLabel,
  href,
  description,
  meta = [],
  tone = "neutral",
  className,
  defaultOpen = false,
  focusable = true,
}: EntityTokenProps) {
  const triggerClassName = cn(
    "inline-flex min-h-6 items-center rounded-sm border px-1.5 py-0.5 align-middle font-data text-[0.625rem] leading-none tracking-wider transition-colors",
    tokenTones[tone],
    href &&
      "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pk-red/50",
    className,
  );

  const trigger = href ? (
    <Link to={href} className={triggerClassName} aria-label={`${kindLabel}: ${label}`}>
      {compactLabel}
    </Link>
  ) : (
    <span
      className={triggerClassName}
      tabIndex={focusable ? 0 : undefined}
      aria-label={`${kindLabel}: ${label}`}
    >
      {compactLabel}
    </span>
  );

  const visibleMeta = meta.filter(
    (item) => item.value !== undefined && item.value !== null && item.value !== "",
  );

  return (
    <HoverCard openDelay={120} closeDelay={80} defaultOpen={defaultOpen}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-64 rounded-md border border-white/10 bg-pk-surface p-3 text-pk-piste shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-data text-[0.5625rem] uppercase tracking-wider text-pk-titane">
              {kindLabel}
            </p>
            <p className="mt-1 truncate font-body text-sm font-semibold text-white">{label}</p>
          </div>
          {href ? <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 text-pk-red" /> : null}
        </div>

        {description ? (
          <p className="mt-2 text-xs leading-relaxed text-pk-titane">{description}</p>
        ) : null}

        {visibleMeta.length ? (
          <div className="mt-3 grid gap-1.5">
            {visibleMeta.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                  {item.label}
                </span>
                {item.href ? (
                  <Link
                    to={item.href}
                    className="inline-flex min-w-0 items-center gap-1 truncate text-right font-body text-xs font-medium text-pk-red hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pk-red/50"
                    aria-label={item.ariaLabel ?? `${item.label}: ${item.value}`}
                  >
                    <span className="truncate">{item.value}</span>
                    <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                  </Link>
                ) : (
                  <span className="truncate text-right font-body text-xs text-pk-piste">
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
