/**
 * Roadmap Tab -- types, constants, and default seed data.
 */
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Circle,
  Clock,
  GitBranch,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskCategory =
  | "bug"
  | "perf"
  | "ux"
  | "a11y"
  | "refactor"
  | "feature"
  | "security"
  | "devops";
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
  done: { label: "Terminé", color: "text-green-400", icon: CheckCircle2 },
  blocked: { label: "Bloqué", color: "text-red-400", icon: AlertTriangle },
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
  feature: { label: "Fonctionnalité", icon: Sparkles, color: "text-yellow-400" },
  security: { label: "Sécurité", icon: AlertTriangle, color: "text-red-400" },
  devops: { label: "DevOps", icon: GitBranch, color: "text-emerald-400" },
};

// ── Default seed data ────────────────────────────────────────────────────────
// Phase names plus task titles/descriptions are display copy. IDs and phase
// references are canonical keys to keep future i18n extraction straightforward.

export const DEFAULT_PHASES: Phase[] = [
  {
    id: "audit",
    name: "Audit & Diagnostic",
    color: "#f97316",
    order: 0,
    startDate: "2026-04-17",
    endDate: "2026-05-15",
  },
  {
    id: "refactor",
    name: "Refactorisation",
    color: "#8b5cf6",
    order: 1,
    startDate: "2026-05-15",
    endDate: "2026-06-15",
  },
  {
    id: "ux-polish",
    name: "UX Polish",
    color: "#06b6d4",
    order: 2,
    startDate: "2026-06-01",
    endDate: "2026-06-30",
  },
  {
    id: "perf",
    name: "Performance",
    color: "#22c55e",
    order: 3,
    startDate: "2026-06-15",
    endDate: "2026-07-15",
  },
  {
    id: "features",
    name: "Nouvelles fonctionnalités",
    color: "#eab308",
    order: 4,
    startDate: "2026-07-01",
    endDate: "2026-08-31",
  },
  {
    id: "beta",
    name: "Beta publique",
    color: "#ec4899",
    order: 5,
    startDate: "2026-06-15",
    endDate: "2026-07-01",
  },
  {
    id: "predictions-pipeline",
    name: "Parcours pronostics",
    color: "#E10600",
    order: 6,
    startDate: "2026-05-30",
    endDate: "2026-05-30",
  },
  {
    id: "admin-operations",
    name: "Back-office métier",
    color: "#10b981",
    order: 7,
    startDate: "2026-05-31",
    endDate: "2026-05-31",
  },
  {
    id: "knowledge-media",
    name: "Médias & RAG",
    color: "#f59e0b",
    order: 8,
    startDate: "2026-05-31",
    endDate: "2026-05-31",
  },
  {
    id: "release-reliability",
    name: "Release reliability",
    color: "#22c55e",
    order: 9,
    startDate: "2026-05-31",
    endDate: "2026-06-07",
  },
  {
    id: "docs-release",
    name: "Documentation & changelog",
    color: "#38bdf8",
    order: 10,
    startDate: "2026-05-31",
    endDate: "2026-05-31",
  },
];

export const DEFAULT_TASKS: RoadmapTask[] = [
  // Audit phase
  {
    id: "a1",
    title: "Traduction complète FR",
    description: "Toutes les notices en français",
    status: "done",
    priority: "high",
    category: "ux",
    phase: "audit",
    createdAt: "2026-05-01",
    completedAt: "2026-05-17",
  },
  {
    id: "a2",
    title: "Accessibilité ARIA",
    description: "Rôles, labels, gestion du focus",
    status: "done",
    priority: "high",
    category: "a11y",
    phase: "audit",
    createdAt: "2026-05-01",
    completedAt: "2026-05-17",
  },
  {
    id: "a3",
    title: "Retour haptique complet",
    description: "Retour haptique sur toutes les interactions",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "audit",
    createdAt: "2026-05-01",
    completedAt: "2026-05-17",
  },
  {
    id: "a4",
    title: "Page 404 thématisée",
    description: "NotFoundPage style arcade",
    status: "done",
    priority: "low",
    category: "ux",
    phase: "audit",
    createdAt: "2026-05-01",
    completedAt: "2026-05-17",
  },
  {
    id: "a5",
    title: "Indicateur réseau hors-ligne",
    description: "Bannière NetworkStatus PWA",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "audit",
    createdAt: "2026-05-01",
    completedAt: "2026-05-17",
  },
  {
    id: "a6",
    title: "Back-office d'administration",
    description: "Authentification magic link + CRUD complet",
    status: "done",
    priority: "critical",
    category: "feature",
    phase: "audit",
    createdAt: "2026-05-17",
    completedAt: "2026-05-17",
  },
  // Refactor phase
  {
    id: "r1",
    title: "Découpage AdminPage monolithique",
    description: "AdminPage ramenée sous 400 lignes avec routes et composants extraits",
    status: "done",
    priority: "high",
    category: "refactor",
    phase: "refactor",
    createdAt: "2026-05-17",
    completedAt: "2026-05-17",
  },
  {
    id: "r2",
    title: "Typage strict des réponses API",
    description: "Typer toutes les réponses API avec Zod",
    status: "todo",
    priority: "high",
    category: "refactor",
    phase: "refactor",
    createdAt: "2026-05-17",
  },
  {
    id: "r3",
    title: "Error boundaries par route",
    description: "Capture + interface de repli par section",
    status: "done",
    priority: "medium",
    category: "refactor",
    phase: "refactor",
    createdAt: "2026-05-17",
    completedAt: "2026-05-16",
  },
  {
    id: "r4",
    title: "Chargement différé des images",
    description: "Lazy loading déployé sur les médias clés, placeholders à généraliser",
    status: "in_progress",
    priority: "medium",
    category: "perf",
    phase: "refactor",
    createdAt: "2026-05-17",
  },
  {
    id: "r5",
    title: "Pattern factory pour les query keys",
    description: "Centraliser les queryKeys TanStack",
    status: "done",
    priority: "low",
    category: "refactor",
    phase: "refactor",
    createdAt: "2026-05-17",
    completedAt: "2026-05-16",
  },
  // UX Polish
  {
    id: "u1",
    title: "Animations de transition entre pages",
    description: "Animations de mise en page partagées avec Framer",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "ux-polish",
    createdAt: "2026-05-17",
    completedAt: "2026-05-17",
  },
  {
    id: "u2",
    title: "Squelettes de chargement partout",
    description: "Squelettes livrés sur les pages clés, couverture globale à compléter",
    status: "in_progress",
    priority: "medium",
    category: "ux",
    phase: "ux-polish",
    createdAt: "2026-05-17",
  },
  {
    id: "u3",
    title: "Pull-to-refresh natif",
    description: "Hook + indicateur livrés, intégration sur les écrans clés à finaliser",
    status: "in_progress",
    priority: "high",
    category: "ux",
    phase: "ux-polish",
    createdAt: "2026-05-17",
  },
  {
    id: "u4",
    title: "Assistant d'accueil",
    description: "Tooltip premier pronostic livré, tutoriel global premier lancement à compléter",
    status: "in_progress",
    priority: "high",
    category: "feature",
    phase: "ux-polish",
    createdAt: "2026-05-17",
  },
  // Performance
  {
    id: "p1",
    title: "Découpage du bundle Three.js",
    description: "Import différé des scènes 3D uniquement si visibles",
    status: "done",
    priority: "critical",
    category: "perf",
    phase: "perf",
    createdAt: "2026-05-17",
    completedAt: "2026-05-28",
  },
  {
    id: "p2",
    title: "Stratégie de cache Service Worker",
    description: "Runtime caching API NetworkFirst + caches fonts et images courses",
    status: "done",
    priority: "high",
    category: "perf",
    phase: "perf",
    createdAt: "2026-05-17",
    completedAt: "2026-05-30",
  },
  {
    id: "p3",
    title: "Optimiser les re-renders des pronostics",
    description: "Memo + useMemo sur la grille des pilotes",
    status: "todo",
    priority: "medium",
    category: "perf",
    phase: "perf",
    createdAt: "2026-05-17",
  },
  // Features
  {
    id: "f1",
    title: "Notifications push web",
    description: "Web Push API + notifications côté serveur",
    status: "todo",
    priority: "high",
    category: "feature",
    phase: "features",
    createdAt: "2026-05-17",
  },
  {
    id: "f2",
    title: "Mode sombre/clair",
    description: "Hors scope v1 : le design system Pronokif est dark-only",
    status: "blocked",
    priority: "low",
    category: "feature",
    phase: "features",
    createdAt: "2026-05-17",
  },
  {
    id: "f3",
    title: "Export PDF du classement",
    description: "Générer un PDF du classement",
    status: "todo",
    priority: "low",
    category: "feature",
    phase: "features",
    createdAt: "2026-05-17",
  },
  {
    id: "f4",
    title: "Statistiques avancées",
    description: "Historique de points livré, graphiques de progression à enrichir",
    status: "in_progress",
    priority: "medium",
    category: "feature",
    phase: "features",
    createdAt: "2026-05-17",
  },
  // Livrables Pronokif 2026
  {
    id: "pp1",
    title: "Parcours pronostics multi-étapes compact",
    description: "Pipeline accordéon, feedback bas de page et navigation visuelle.",
    status: "done",
    priority: "high",
    category: "ux",
    phase: "predictions-pipeline",
    createdAt: "2026-05-30",
    completedAt: "2026-05-30",
  },
  {
    id: "pp2",
    title: "Scroll wizard après validation d'étape",
    description: "Remontée automatique du conteneur après changement d'étape.",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "predictions-pipeline",
    createdAt: "2026-05-30",
    completedAt: "2026-05-30",
  },
  {
    id: "pp3",
    title: "Couverture tests pronostics complète",
    description: "Sauvegarde complète, bonus, sprint complet et suppression existante.",
    status: "done",
    priority: "high",
    category: "feature",
    phase: "predictions-pipeline",
    createdAt: "2026-05-30",
    completedAt: "2026-05-30",
  },
  {
    id: "ao1",
    title: "Dashboard admin compact",
    description: "KPIs sur une ligne et cockpit exploitation plus dense.",
    status: "done",
    priority: "high",
    category: "ux",
    phase: "admin-operations",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "ao2",
    title: "Dashboard admin données récentes",
    description: "Derniers inscrits, derniers pronostics, derniers logs et raccourcis métier.",
    status: "done",
    priority: "high",
    category: "feature",
    phase: "admin-operations",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "ao3",
    title: "Deep links admin métier",
    description: "Navigation directe vers fiches joueurs, pronostics, courses et scoring ciblé.",
    status: "done",
    priority: "high",
    category: "feature",
    phase: "admin-operations",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "ao4",
    title: "Watchlist courses et santé pronostics",
    description:
      "GP à surveiller, filtres verrouillés/à revoir/7j/24h et horodatage de dépôt réel.",
    status: "done",
    priority: "high",
    category: "feature",
    phase: "admin-operations",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "ao5",
    title: "Logo admin vers dashboard home",
    description: "Retour dashboard depuis le wordmark Pronokif en haut à gauche.",
    status: "done",
    priority: "medium",
    category: "ux",
    phase: "admin-operations",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "km1",
    title: "Médiathèque admin avec dossiers",
    description: "Uploads de vignettes, organisation par dossiers et réutilisation des médias.",
    status: "done",
    priority: "high",
    category: "feature",
    phase: "knowledge-media",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "km2",
    title: "Sélecteurs médias pour fiches admin",
    description: "Branding, icône PWA et avatars utilisateurs éditables depuis la médiathèque.",
    status: "done",
    priority: "high",
    category: "feature",
    phase: "knowledge-media",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "km3",
    title: "Visuels dans le RAG et les briefs",
    description: "Médias liés aux entités de connaissance et affichés dans les briefs course.",
    status: "done",
    priority: "medium",
    category: "feature",
    phase: "knowledge-media",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "rr1",
    title: "CI GitHub verte sur main",
    description: "Workflow CI terminé avec succès sur le commit d'audit v0.4.",
    status: "done",
    priority: "high",
    category: "devops",
    phase: "release-reliability",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "rr2",
    title: "Production pronokif.eu live",
    description: "Healthcheck 200, branding endpoint OK et bundle v0.4.2 servi par la production.",
    status: "done",
    priority: "high",
    category: "devops",
    phase: "release-reliability",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "rr3",
    title: "Trigger CD StormDeploy GitHub vert",
    description: "Le job Trigger StormDeploy reste rouge malgré une prod saine.",
    status: "blocked",
    priority: "critical",
    category: "devops",
    phase: "release-reliability",
    createdAt: "2026-05-31",
  },
  {
    id: "rr4",
    title: "Canary post-deploy automatisé",
    description:
      "Automatiser la vérification health, index asset, chunk admin et route d'auth admin après chaque release.",
    status: "todo",
    priority: "high",
    category: "devops",
    phase: "release-reliability",
    createdAt: "2026-05-31",
  },
  {
    id: "rr5",
    title: "Validation upload médias admin",
    description: "MIME, taille 5 Mo, admin auth, dossiers et tests backend en place.",
    status: "done",
    priority: "high",
    category: "security",
    phase: "release-reliability",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "rr6",
    title: "Durcissement SVG et cache médias",
    description:
      "Sanitiser ou désactiver les SVG uploadés, puis définir une politique cache-control.",
    status: "todo",
    priority: "high",
    category: "security",
    phase: "release-reliability",
    createdAt: "2026-05-31",
  },
  {
    id: "rr7",
    title: "Smoke prod final v0.4.2",
    description:
      "Contrôle manuel health, branding, bundle, /admin/settings et /mentions-legales après deploy.",
    status: "done",
    priority: "high",
    category: "devops",
    phase: "release-reliability",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "dr1",
    title: "Documentation projet actualisée",
    description: "README, roadmap, changelog, audit, runbook et guide de déploiement mis à jour.",
    status: "done",
    priority: "high",
    category: "devops",
    phase: "docs-release",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
  {
    id: "dr2",
    title: "Fiche back-office admin",
    description: "Inventaire des fonctionnalités et chantiers BO livré dans docs/BACK_OFFICE.md.",
    status: "done",
    priority: "medium",
    category: "feature",
    phase: "docs-release",
    createdAt: "2026-05-31",
    completedAt: "2026-05-31",
  },
];
