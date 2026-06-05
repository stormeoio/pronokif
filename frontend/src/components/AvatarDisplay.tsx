/**
 * AvatarDisplay — Avatar rendering and selector for profile.
 * Broadcast Premium: pk-surface cards, pk-red accents, native inputs.
 */
import { useState } from "react";
import {
  Bird,
  Award,
  Crown,
  Star,
  Rocket,
  Flame,
  Zap,
  Target,
  Shield,
  Gem,
  Gamepad2,
  Trophy,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AvatarGenerator } from "./AvatarGenerator";
import { haptic } from "@/lib/haptics";

// ------------------------------------------------------------------ types ---

export interface AvatarObject {
  id: string;
  name?: string;
  category: "teams" | "drivers" | "animals" | "gaming" | "abstract" | string;
  icon?: string;
  colors?: [string, string];
  number?: string | number;
  /** F1 CDN headshot — present after admin seed. Renders Pronokif-branded pilot avatar. */
  photo_url?: string | null;
  /** Official F1 team logo URL */
  team_logo_url?: string | null;
}

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarDisplayProps {
  avatar?: AvatarObject | null;
  size?: AvatarSize;
  customUrl?: string | null;
}

export interface AvatarsData {
  all: AvatarObject[];
}

export interface AvatarSelectorProps {
  avatars?: AvatarsData;
  selectedId?: string;
  onSelect: (id: string) => void;
  customUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
}

// ---------------------------------------------------------- icon mapping ---

type IconKey = keyof typeof ICON_MAP;

const ICON_MAP: Record<string, LucideIcon> = {
  wolf: Bird,
  eagle: Bird,
  lion: Bird,
  shark: Bird,
  phoenix: Flame,
  gamepad: Gamepad2,
  trophy: Trophy,
  star: Star,
  crown: Crown,
  rocket: Rocket,
  flame: Flame,
  zap: Zap,
  target: Target,
  shield: Shield,
  gem: Gem,
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const iconSizes: Record<AvatarSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const textSizes: Record<AvatarSize, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

// --------------------------------------------------------- AvatarDisplay ---

export function AvatarDisplay({ avatar, size = "md", customUrl = null }: AvatarDisplayProps) {
  // Custom uploaded photo
  if (customUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden border-2 border-pk-red`}>
        <img src={customUrl} alt="Avatar personnalise" className="w-full h-full object-cover" />
      </div>
    );
  }

  // No avatar set - default
  if (!avatar) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg bg-pk-red border-2 border-pk-red/60 flex items-center justify-center`}
      >
        <User className={`${iconSizes[size]} text-white`} />
      </div>
    );
  }

  // Team avatar (gradient with team colors)
  if (avatar.category === "teams") {
    const colors = avatar.colors ?? ["#666", "#333"];
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 flex items-center justify-center`}
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          borderColor: colors[0],
        }}
      >
        <Shield className={`${iconSizes[size]} text-white drop-shadow-lg`} />
      </div>
    );
  }

  // Driver avatar — Pronokif-branded pilot card
  if (avatar.category === "drivers") {
    const colors = avatar.colors ?? ["#666", "#333"];

    // If we have a real headshot (from admin seed), render it with team-color framing.
    if (avatar.photo_url) {
      return (
        <div
          className={`${sizeClasses[size]} rounded-lg border-2 flex items-center justify-center relative overflow-hidden`}
          style={{ borderColor: colors[0] }}
        >
          {/* Headshot */}
          <img
            src={avatar.photo_url}
            alt={avatar.name ?? "Pilote"}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          {/* Subtle team-color gradient overlay at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/3"
            style={{ background: `linear-gradient(to top, ${colors[0]}cc, transparent)` }}
          />
          {/* Race number badge */}
          <span
            className="absolute bottom-0.5 right-0.5 font-data text-[0.45rem] font-bold text-white leading-none px-1 py-0.5 rounded"
            style={{ background: colors[0] }}
          >
            {avatar.number}
          </span>
        </div>
      );
    }

    // Fallback: gradient + helmet silhouette + number (no photo yet)
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 flex items-center justify-center relative overflow-hidden`}
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          borderColor: colors[0],
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ellipse cx="50" cy="60" rx="40" ry="35" fill="white" />
            <ellipse cx="50" cy="45" rx="35" ry="30" fill="white" />
            <rect x="30" y="65" width="40" height="20" rx="5" fill="white" />
          </svg>
        </div>
        <span className={`font-display ${textSizes[size]} text-white drop-shadow-lg z-10`}>
          {avatar.number}
        </span>
      </div>
    );
  }

  // Default icon avatar
  const Icon: LucideIcon = (avatar.icon ? ICON_MAP[avatar.icon] : undefined) ?? Star;
  return (
    <div
      className={`${sizeClasses[size]} rounded-lg bg-pk-surface border-2 border-white/[0.12] flex items-center justify-center`}
    >
      <Icon className={`${iconSizes[size]} text-pk-red`} />
    </div>
  );
}

// -------------------------------------------------------- AvatarSelector ---

interface Category {
  id: string;
  label: string;
}

export function AvatarSelector({ avatars, selectedId, onSelect, onUpload }: AvatarSelectorProps) {
  const [category, setCategory] = useState("generator");

  const categories: Category[] = [
    { id: "generator", label: "Générer Avatar" },
    { id: "drivers", label: "Pilotes" },
    { id: "teams", label: "Écuries" },
    { id: "default", label: "Classiques" },
  ];

  const filteredAvatars: AvatarObject[] =
    avatars?.all?.filter(
      (a) =>
        a.category === category ||
        (category === "default" && ["animals", "gaming", "abstract"].includes(a.category)),
    ) ?? [];

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              haptic("light");
              setCategory(cat.id);
            }}
            className={`px-4 py-2 rounded-lg font-display text-xs whitespace-nowrap transition-all ${
              category === cat.id
                ? "bg-pk-red text-white"
                : "bg-white/[0.04] text-pk-titane hover:text-pk-piste hover:bg-white/[0.06]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Generator or predefined avatar grid */}
      {category === "generator" ? (
        <AvatarGenerator
          onGenerated={async (file: File) => {
            await onUpload(file);
          }}
          onCancel={() => setCategory("drivers")}
        />
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {filteredAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => {
                haptic("light");
                onSelect(avatar.id);
              }}
              className={`p-2 rounded-lg border-2 transition-all ${
                selectedId === avatar.id
                  ? "border-pk-red bg-pk-red-subtle"
                  : "border-white/[0.08] hover:border-white/[0.15]"
              }`}
            >
              <AvatarDisplay avatar={avatar} size="md" />
              <p className="font-data text-[0.5625rem] text-pk-titane mt-1 truncate">
                {avatar.name}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AvatarDisplay;
