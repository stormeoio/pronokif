/**
 * Roadmap Tab -- types, constants, and default seed data.
 */
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskCategory = "bug" | "perf" | "ux" | "a11y" | "refactor" | "feature" | "security";
export type ViewMode = "checklist" | "gantt" | "phases";

export interface RoadmapTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  phase: string;
  estimatedDays?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Phase {
  id: string;
  name: string;
  color: string;
  order: number;
  startDate?: string;
  endDate?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEY = "pronokif_admin_roadmap";

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; icon: typeof Circle }
> = {
  todo: { label: "A faire", color: "text-gray-400", icon: Circle },
  in_progress: { label: "En cours", color: "text-blue-400", icon: Clock },
  done: { label: "Termine", color: "text-green-400", icon: CheckCircle2 },
  blocked: { label: "Bloque", color: "text-red-400", icon: AlertTriangle },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  critical: { label: "Critique", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  high: { label: "Haute", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  medium: { label: "Moyenne", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  low: { label: "Basse", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export const CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; icon: typeof Bug; color: string }
> = {
  bug: { label: "Bug", icon: Bug, color: "text-red-400" },
  perf: { label: "Perf", icon: Zap, color: "text-green-400" },
  ux: { label: "UX", icon: Sparkles, color: "text-cyan-400" },
  a11y: { label: "A11y", icon: Circle, color: "text-purple-400" },
  refactor: { label: "Refacto", icon: Layers, color: "text-orange-400" },
  feature: { label: "Feature", icon: Sparkles, color: "text-yellow-400" },
  security: { label: "Securite", icon: AlertTriangle, color: "text-red-400" },
};

// ── Default seed data ────────────────────────────────────────────────────────

export const DEFAULT_PHASES: Phase[] = [
  {
    id: "audit",
    name: "Audit & Diagnostic",
    color: "#f97316",
    order: 0,
    startDate: "2025-05-01",
    endDate: "2025-05-15",
  },
  {
    id: "refactor",
    name: "Refactorisation",
    color: "#8b5cf6",
    order: 1,
    startDate: "2025-05-15",
    endDate: "2025-06-15",
  },
  {
    id: "ux-polish",
    name: "UX Polish",
    color: "#06b6d4",
    order: 2,
    startDate: "2025-06-01",
    endDate: "2025-06-30",
  },
  {
    id: "perf",
    name: "Performance",
    color: "#22c55e",
    order: 3,
    startDate: "2025-06-15",
    endDate: "2025-07-15",
  },
  {
    id: "features",
    name: "Nouvelles fonctionnalites",
    color: "#eab308",
    order: 4,
    startDate: "2025-07-01",
    endDate: "2025-08-31",
  },
  {
    id: "beta",
    name: "Beta publique",
    color: "#ec4899",
    order: 5,
    startDate: "2025-09-01",
    endDate: "2025-10-01",
  },
];

export const DEFAULT_TASKS: RoadmapTask[] = [
  // Audit phase
  {
    id: "a1",
    title: "Traduction complete FR",
    description: "Toutes les notices en francais",
    status: "done",
    priority: "high",
    category: "ux",
    phase: "audit",
    createdAt: "2025-05-01",
    completedAt: "2025-05-17",
  },
  {
    id: "a2",
    title: "Accessibilite ARIA",
    description: "Roles, labels, focus management",
    status: "done",
    priority: "high",
    category: "a11y",
    phase: "audit",
    createdAt: "2025-05-01",
    completedAt: "2025-05-17",
  },
  {
    id: "a3",
    title: "Haptic feedback complet",
    description: "Retour haptique sur toutes les interactions",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "audit",
    createdAt: "2025-05-01",
    completedAt: "2025-05-17",
  },
  {
    id: "a4",
    title: "Page 404 thematisee",
    description: "NotFoundPage arcade-style",
    status: "done",
    priority: "low",
    category: "ux",
    phase: "audit",
    createdAt: "2025-05-01",
    completedAt: "2025-05-17",
  },
  {
    id: "a5",
    title: "Indicateur reseau hors-ligne",
    description: "NetworkStatus banner PWA",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "audit",
    createdAt: "2025-05-01",
    completedAt: "2025-05-17",
  },
  {
    id: "a6",
    title: "Back-office administration",
    description: "Magic link auth + CRUD complet",
    status: "done",
    priority: "critical",
    category: "feature",
    phase: "audit",
    createdAt: "2025-05-17",
    completedAt: "2025-05-17",
  },
  // Refactor phase
  {
    id: "r1",
    title: "Decoupage AdminPage monolithique",
    description: "Extraire les sous-composants > 400L",
    status: "todo",
    priority: "high",
    category: "refactor",
    phase: "refactor",
    createdAt: "2025-05-17",
  },
  {
    id: "r2",
    title: "Type safety API responses",
    description: "Typer toutes les reponses API avec Zod",
    status: "todo",
    priority: "high",
    category: "refactor",
    phase: "refactor",
    createdAt: "2025-05-17",
  },
  {
    id: "r3",
    title: "Error boundaries par route",
    description: "Catch + fallback UI par section",
    status: "todo",
    priority: "medium",
    category: "refactor",
    phase: "refactor",
    createdAt: "2025-05-17",
  },
  {
    id: "r4",
    title: "Lazy loading images",
    description: "Intersection Observer + placeholders",
    status: "todo",
    priority: "medium",
    category: "perf",
    phase: "refactor",
    createdAt: "2025-05-17",
  },
  {
    id: "r5",
    title: "Query key factory pattern",
    description: "Centraliser les queryKeys TanStack",
    status: "todo",
    priority: "low",
    category: "refactor",
    phase: "refactor",
    createdAt: "2025-05-17",
  },
  // UX Polish
  {
    id: "u1",
    title: "Animations transitions pages",
    description: "Shared layout animations framer",
    status: "todo",
    priority: "medium",
    category: "ux",
    phase: "ux-polish",
    createdAt: "2025-05-17",
  },
  {
    id: "u2",
    title: "Skeleton loaders partout",
    description: "Remplacer les spinners par des skeletons",
    status: "todo",
    priority: "medium",
    category: "ux",
    phase: "ux-polish",
    createdAt: "2025-05-17",
  },
  {
    id: "u3",
    title: "Pull-to-refresh natif",
    description: "Ameliorer le geste de rafraichissement",
    status: "in_progress",
    priority: "high",
    category: "ux",
    phase: "ux-polish",
    createdAt: "2025-05-17",
  },
  {
    id: "u4",
    title: "Onboarding wizard",
    description: "Tutorial interactif premier lancement",
    status: "todo",
    priority: "high",
    category: "feature",
    phase: "ux-polish",
    createdAt: "2025-05-17",
  },
  // Performance
  {
    id: "p1",
    title: "Bundle splitting Three.js",
    description: "Lazy import scenes 3D uniquement si visibles",
    status: "todo",
    priority: "critical",
    category: "perf",
    phase: "perf",
    createdAt: "2025-05-17",
  },
  {
    id: "p2",
    title: "Service Worker cache strategie",
    description: "Stale-while-revalidate pour API",
    status: "todo",
    priority: "high",
    category: "perf",
    phase: "perf",
    createdAt: "2025-05-17",
  },
  {
    id: "p3",
    title: "Optimiser re-renders predictions",
    description: "Memo + useMemo driver grid",
    status: "todo",
    priority: "medium",
    category: "perf",
    phase: "perf",
    createdAt: "2025-05-17",
  },
  // Features
  {
    id: "f1",
    title: "Notifications push web",
    description: "Web Push API + backend notifications",
    status: "todo",
    priority: "high",
    category: "feature",
    phase: "features",
    createdAt: "2025-05-17",
  },
  {
    id: "f2",
    title: "Mode sombre/clair",
    description: "Theme toggle avec persistence",
    status: "todo",
    priority: "low",
    category: "feature",
    phase: "features",
    createdAt: "2025-05-17",
  },
  {
    id: "f3",
    title: "Export PDF classement",
    description: "Generer un PDF du leaderboard",
    status: "todo",
    priority: "low",
    category: "feature",
    phase: "features",
    createdAt: "2025-05-17",
  },
  {
    id: "f4",
    title: "Statistiques avancees",
    description: "Graphiques de progression, historique",
    status: "todo",
    priority: "medium",
    category: "feature",
    phase: "features",
    createdAt: "2025-05-17",
  },
];
