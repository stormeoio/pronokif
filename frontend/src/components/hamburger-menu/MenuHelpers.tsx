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
      <div
        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="font-heading text-lg text-white uppercase">{title}</h3>
        <p className="font-body text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}
