import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AvatarDisplay, type AvatarObject } from "@/components/AvatarDisplay";
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

function useAvatar(avatarId?: string | null): AvatarObject | null {
  const { data } = useQuery({
    queryKey: queryKeys.avatars.list(),
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  return useMemo(() => {
    if (!avatarId) return null;
    return (
      (data?.all?.find((avatar) => avatar.id === avatarId) as AvatarObject | undefined) ?? null
    );
  }, [avatarId, data]);
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
  children,
  className,
  textClassName,
  "data-testid": dataTestId,
}: UserIdentityProps) {
  const avatar = useAvatar(user.avatar_id);
  const href = linked ? profileHref(user, surface) : null;
  const name = userNameFor(user);
  const email = userEmailFor(user);
  const level = user.level ?? null;

  const content = (
    <>
      <AvatarDisplay
        avatar={avatar}
        customUrl={user.custom_avatar_url}
        size={avatarSizeByIdentitySize[size]}
      />
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

  if (!href) {
    return (
      <span className={baseClassName} data-testid={dataTestId}>
        {content}
      </span>
    );
  }

  return (
    <Link to={href} className={baseClassName} data-testid={dataTestId}>
      {content}
    </Link>
  );
}

export default UserIdentity;
