/**
 * PronoKif — Icon configuration
 * Source of truth: DESIGN.md (Lucide React, stroke-width 1.5)
 *
 * Centralizes icon imports and enforces consistent sizing/stroke.
 * Import from here instead of lucide-react directly.
 *
 * Usage:
 *   import { icons, iconProps } from "@/lib/icons";
 *   <icons.Home {...iconProps} />
 *   <icons.Trophy {...iconProps} className="text-pk-gold" />
 */
import {
  Home,
  Target,
  Radio,
  Trophy,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
  Flag,
  Star,
  Heart,
  Share2,
  Settings,
  Bell,
  Search,
  X,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Info,
  Zap,
  TrendingUp,
  TrendingDown,
  Award,
  Crown,
  Medal,
  Users,
  BarChart3,
  Activity,
  Timer,
  CircleDot,
  Flame,
  Gauge,
  type LucideProps,
} from "lucide-react";

/* Default icon props — DESIGN.md: 22px, stroke-width 1.5 */
export const iconProps: LucideProps = {
  size: 22,
  strokeWidth: 1.5,
};

/* Small icons (navigation labels, badges) */
export const iconSmall: LucideProps = {
  size: 16,
  strokeWidth: 1.5,
};

/* Large icons (empty states, hero) */
export const iconLarge: LucideProps = {
  size: 32,
  strokeWidth: 1.5,
};

/* Navigation icons (bottom nav — DESIGN.md: 22px) */
export const navIcons = {
  accueil: Home,
  predictions: Target,
  direct: Radio,
  classements: Trophy,
  profil: User,
} as const;

/* All icons re-exported for convenient access */
export const icons = {
  Home,
  Target,
  Radio,
  Trophy,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Clock,
  Calendar,
  Flag,
  Star,
  Heart,
  Share2,
  Settings,
  Bell,
  Search,
  X,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  Info,
  Zap,
  TrendingUp,
  TrendingDown,
  Award,
  Crown,
  Medal,
  Users,
  BarChart3,
  Activity,
  Timer,
  CircleDot,
  Flame,
  Gauge,
} as const;
