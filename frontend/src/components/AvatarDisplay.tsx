import { useState } from "react";
import {
  Bird, Award, Crown, Star, Rocket, Flame, Zap, Target, Shield, Gem,
  Gamepad2, Trophy, User
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ChangeEvent } from "react";

// ------------------------------------------------------------------ types ---

export interface AvatarObject {
  id: string;
  name?: string;
  category: "teams" | "drivers" | "animals" | "gaming" | "abstract" | string;
  icon?: string;
  colors?: [string, string];
  number?: string | number;
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
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden border-2 border-orange-500`}>
        <img src={customUrl} alt="Avatar" className="w-full h-full object-cover" />
      </div>
    );
  }

  // No avatar set - default
  if (!avatar) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-b from-orange-500 to-orange-700 border-2 border-orange-400 flex items-center justify-center`}>
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

  // Driver avatar (silhouette with number)
  if (avatar.category === "drivers") {
    const colors = avatar.colors ?? ["#666", "#333"];
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 flex items-center justify-center relative overflow-hidden`}
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          borderColor: colors[0],
        }}
      >
        {/* Helmet silhouette background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <ellipse cx="50" cy="60" rx="40" ry="35" fill="white" />
            <ellipse cx="50" cy="45" rx="35" ry="30" fill="white" />
            <rect x="30" y="65" width="40" height="20" rx="5" fill="white" />
          </svg>
        </div>
        <span className={`font-heading ${textSizes[size]} text-white drop-shadow-lg z-10`}>
          {avatar.number}
        </span>
      </div>
    );
  }

  // Default icon avatar
  const Icon: LucideIcon = (avatar.icon ? ICON_MAP[avatar.icon] : undefined) ?? Star;
  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center`}>
      <Icon className={`${iconSizes[size]} text-orange-500`} />
    </div>
  );
}

// -------------------------------------------------------- AvatarSelector ---

interface Category {
  id: string;
  label: string;
}

export function AvatarSelector({ avatars, selectedId, onSelect, customUrl, onUpload }: AvatarSelectorProps) {
  const [category, setCategory] = useState("default");
  const [uploading, setUploading] = useState(false);

  const categories: Category[] = [
    { id: "default", label: "Classiques" },
    { id: "teams", label: "Écuries" },
    { id: "drivers", label: "Pilotes" },
    { id: "custom", label: "Photo" },
  ];

  const filteredAvatars: AvatarObject[] =
    avatars?.all?.filter(
      (a) =>
        a.category === category ||
        (category === "default" && ["animals", "gaming", "abstract"].includes(a.category))
    ) ?? [];

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      alert("Image trop grande (max 500KB)");
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-heading text-sm uppercase whitespace-nowrap transition-all ${
              category === cat.id
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Avatar grid or upload */}
      {category === "custom" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg">
            <label className="cursor-pointer text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-lg bg-gray-800 flex items-center justify-center">
                  {customUrl ? (
                    <img src={customUrl} alt="Current" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <User className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <p className="font-body text-gray-400 text-sm">
                  {uploading ? "Envoi en cours..." : "Cliquer pour importer une photo"}
                </p>
                <p className="font-body text-gray-500 text-xs">Max 500KB, JPG/PNG</p>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {filteredAvatars.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => onSelect(avatar.id)}
              className={`p-2 rounded-lg border-2 transition-all ${
                selectedId === avatar.id
                  ? "border-orange-500 bg-orange-500/20"
                  : "border-gray-700 hover:border-gray-500"
              }`}
            >
              <AvatarDisplay avatar={avatar} size="md" />
              <p className="font-body text-xs text-gray-400 mt-1 truncate">{avatar.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default AvatarDisplay;
