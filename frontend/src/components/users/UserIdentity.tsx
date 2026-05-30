import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AvatarDisplay, type AvatarObject } from "@/components/AvatarDisplay";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

export type UserIdentityRecord = {
  id?: string | null;
  user_id?: string | null;
  username?: string | null;
  user_username?: string | null;
  email?: string | null;
  user_email?: string | null;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  level?: number | null;
};

type UserIdentitySize = "sm" | "md" | "lg" | "xl";

const avatarSizeByIdentitySize = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const;

const nameClassBySize: Record<UserIdentitySize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

function userIdFor(user: UserIdentityRecord): string | null {
  return user.id || user.user_id || null;
}

function userNameFor(user: UserIdentityRecord): string {
  return (
    user.username ||
    user.user_username ||
    user.email ||
    user.user_email ||
    userIdFor(user) ||
    "Joueur"
  );
}

function userEmailFor(user: UserIdentityRecord): string | null {
  return user.email || user.user_email || null;
}

function profileHref(user: UserIdentityRecord, surface: "app" | "admin"): string | null {
  const id = userIdFor(user);
  if (!id) return null;
  return surface === "admin" ? `/admin?tab=users&user=${encodeURIComponent(id)}` : `/profile/${id}`;
}

function useAvatar(
  avatarId?: string | null,
  avatarObject?: AvatarObject | null,
): AvatarObject | null {
  const { data } = useQuery({
    queryKey: queryKeys.avatars.list(),
    queryFn: () => api.avatars.list(),
    enabled: !!avatarId && avatarObject === undefined,
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    if (avatarObject !== undefined) return avatarObject;
    if (!avatarId) return null;
    return (
      (data?.all?.find((avatar) => avatar.id === avatarId) as AvatarObject | undefined) ?? null
    );
  }, [avatarId, avatarObject, data]);
}

type UserIdentityProps = {
  user: UserIdentityRecord;
  surface?: "app" | "admin";
  size?: UserIdentitySize;
  layout?: "horizontal" | "vertical";
  showEmail?: boolean;
  showLevel?: boolean;
  showName?: boolean;
  linked?: boolean;
  withHoverCard?: boolean;
  avatarObject?: AvatarObject | null;
  avatarAccessory?: ReactNode;
  children?: ReactNode;
  className?: string;
  textClassName?: string;
  "data-testid"?: string;
};

export function UserIdentity({
  user,
  surface = "app",
  size = "md",
  layout = "horizontal",
  showEmail = false,
  showLevel = false,
  showName = true,
  linked = true,
  withHoverCard = true,
  avatarObject,
  avatarAccessory,
  children,
  className,
  textClassName,
  "data-testid": dataTestId,
}: UserIdentityProps) {
  const avatar = useAvatar(user.avatar_id, avatarObject);
  const href = linked ? profileHref(user, surface) : null;
  const name = userNameFor(user);
  const email = userEmailFor(user);
  const level = user.level ?? null;

  const content = (
    <>
      <span className="relative inline-flex shrink-0">
        <AvatarDisplay
          avatar={avatar}
          customUrl={user.custom_avatar_url}
          size={avatarSizeByIdentitySize[size]}
        />
        {avatarAccessory}
      </span>
      {showName ? (
        <span
          className={cn("min-w-0", layout === "vertical" ? "block w-full text-center" : "flex-1")}
        >
          <span
            className={cn(
              "block truncate font-body font-semibold text-pk-piste",
              nameClassBySize[size],
              textClassName,
            )}
          >
            {name}
          </span>
          {(showEmail && email) || (showLevel && level) ? (
            <span className="mt-0.5 block truncate font-data text-[10px] uppercase tracking-[0.12em] text-pk-titane">
              {showEmail && email ? email : null}
              {showEmail && email && showLevel && level ? " · " : null}
              {showLevel && level ? `Niv. ${level}` : null}
            </span>
          ) : null}
          {children}
        </span>
      ) : null}
    </>
  );

  const baseClassName = cn(
    "inline-flex min-w-0 rounded-sm transition-colors",
    layout === "vertical" ? "flex-col items-center gap-1" : "items-center gap-2",
    href
      ? "hover:text-pk-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
      : "",
    className,
  );

  const trigger = href ? (
    <Link to={href} className={baseClassName} data-testid={dataTestId}>
      {content}
    </Link>
  ) : (
    <span className={baseClassName} data-testid={dataTestId}>
      {content}
    </span>
  );

  if (!withHoverCard) return trigger;

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-72 border-white/[0.08] bg-pk-surface p-3 text-pk-piste shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-3">
          <AvatarDisplay
            avatar={avatar}
            customUrl={user.custom_avatar_url}
            size={size === "xl" ? "lg" : "md"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base leading-tight">{name}</p>
            {email ? (
              <p className="mt-1 truncate font-body text-xs text-pk-titane">{email}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {level ? (
                <span className="rounded-sm border border-pk-info/20 bg-pk-info/[0.12] px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-pk-info">
                  Niv. {level}
                </span>
              ) : null}
              {userIdFor(user) ? (
                <span className="max-w-full truncate rounded-sm border border-white/[0.08] px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-pk-titane">
                  {surface === "admin" ? "Fiche admin" : "Profil joueur"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default UserIdentity;
