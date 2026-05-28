/**
 * MenuHelpers — Section header for hamburger menu content.
 * Broadcast Premium: pk-* colors, font-display headings.
 */
import type { LucideIcon } from "lucide-react";

export interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
}

export function SectionHeader({ icon: Icon, title, subtitle, color }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-display text-sm">{title}</h3>
        <p className="font-data text-[0.5625rem] text-pk-titane">{subtitle}</p>
      </div>
    </div>
  );
}
