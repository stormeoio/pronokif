import {
  ClipboardList,
  Database,
  Languages,
  Map,
  MessageSquare,
  Scale,
  Shield,
} from "lucide-react";
import FeedbacksTab from "./FeedbacksTab";
import KnowledgeTab from "./KnowledgeTab";
import LegalPwaTab from "./LegalPwaTab";
import TranslationsTab from "./TranslationsTab";
import AuditTab from "./AuditTab";
import RoadmapTab from "./RoadmapTab";

export type DevOpsSectionKey =
  | "beta"
  | "knowledge"
  | "translations"
  | "legal"
  | "audit"
  | "roadmap";

type DevOpsTabProps = {
  activeSection: DevOpsSectionKey;
  currentAdminEmail: string;
  onSectionChange: (section: DevOpsSectionKey) => void;
};

const SECTIONS: Array<{
  key: DevOpsSectionKey;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}> = [
  {
    key: "beta",
    label: "Beta",
    description: "Feedbacks, bugs et réponses utilisateurs.",
    icon: MessageSquare,
  },
  {
    key: "knowledge",
    label: "Base RAG",
    description: "Connaissances et embeddings.",
    icon: Database,
  },
  {
    key: "translations",
    label: "Traductions",
    description: "Complétion FR/EN.",
    icon: Languages,
  },
  {
    key: "legal",
    label: "Légal & PWA",
    description: "Pages publiques et publication.",
    icon: Scale,
  },
  {
    key: "audit",
    label: "Audit",
    description: "Qualité, sécurité et monitoring.",
    icon: Shield,
  },
  {
    key: "roadmap",
    label: "Roadmap",
    description: "Plan produit et technique.",
    icon: Map,
  },
];

export function devOpsSectionFromKey(key: string | null | undefined): DevOpsSectionKey | null {
  const normalized = String(key ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (normalized === "feedbacks" || normalized === "retours") return "beta";
  if (normalized === "rag") return "knowledge";
  if (normalized === "legal-pwa") return "legal";
  if (normalized === "feuille-de-route") return "roadmap";
  return SECTIONS.some((section) => section.key === normalized)
    ? (normalized as DevOpsSectionKey)
    : null;
}

export default function DevOpsTab({
  activeSection,
  currentAdminEmail,
  onSectionChange,
}: DevOpsTabProps) {
  const active = SECTIONS.find((section) => section.key === activeSection) ?? SECTIONS[0];

  const renderSection = () => {
    switch (active.key) {
      case "beta":
        return <FeedbacksTab currentAdminEmail={currentAdminEmail} />;
      case "knowledge":
        return <KnowledgeTab currentAdminEmail={currentAdminEmail} />;
      case "translations":
        return <TranslationsTab />;
      case "legal":
        return <LegalPwaTab />;
      case "audit":
        return <AuditTab />;
      case "roadmap":
        return <RoadmapTab />;
      default:
        return <FeedbacksTab currentAdminEmail={currentAdminEmail} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-pk-red" />
            <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-red">
              Interface DevOps
            </p>
          </div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">DevOps</h2>
          <p className="mt-1 font-body text-sm text-gray-500">
            Pilotage bêta, support, contenu technique, conformité et suivi de livraison.
          </p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        {SECTIONS.map(({ key, label, description, icon: Icon }) => {
          const isActive = active.key === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSectionChange(key)}
              data-testid={`devops-tab-${key}`}
              className={`min-h-24 rounded-md border p-3 text-left transition-all ${
                isActive
                  ? "border-pk-red/45 bg-pk-red-subtle text-white shadow-[0_0_20px_rgba(225,6,0,.12)]"
                  : "border-white/[0.08] bg-pk-surface/80 text-pk-titane hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Icon className={`h-4 w-4 ${isActive ? "text-pk-red" : "text-pk-titane"}`} />
                {isActive && <span className="h-2 w-2 rounded-full bg-pk-red" />}
              </div>
              <p className="font-heading text-sm uppercase tracking-wide">{label}</p>
              <p className="mt-1 font-body text-xs leading-snug text-gray-500">{description}</p>
            </button>
          );
        })}
      </div>

      {renderSection()}
    </div>
  );
}
