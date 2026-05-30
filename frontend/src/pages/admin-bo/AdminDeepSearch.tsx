import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Database,
  Flag,
  Keyboard,
  Languages,
  LayoutDashboard,
  Loader2,
  Map,
  Route,
  Search,
  Shield,
  Trophy,
  User,
} from "lucide-react";
import { adminApi } from "./adminApi";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { OPEN_DEEP_SEARCH_EVENT } from "@/components/search/deepSearchEvents";
import {
  filterDeepSearchItems,
  groupDeepSearchItems,
  isEditableSearchTarget,
  type DeepSearchItem,
} from "@/components/search/deepSearchIndex";
import { UserIdentity } from "@/components/users/UserIdentity";

type KnowledgeSearchDocument = {
  id: string;
  title: string;
  content?: string;
  entity_type?: string;
  entity_id?: string;
  retrieval_score?: number;
  source_refs?: string[];
};

type AdminSearchRace = {
  id: string;
  name: string;
  circuit?: string;
  country?: string;
  date?: string;
  season?: number;
  status?: string;
  round_number?: number;
};

type AdminSearchUser = {
  id: string;
  username?: string | null;
  email?: string;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  level?: number;
  xp?: number;
};

const GROUP_ICONS = {
  "Back-office": LayoutDashboard,
  "Base RAG": Database,
} satisfies Record<string, typeof Search>;

function shortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl F";
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘F" : "Ctrl F";
}

function adminNavigationItems(): DeepSearchItem[] {
  return [
    {
      id: "admin-dashboard",
      title: "Tableau de bord",
      subtitle: "Vue d'ensemble business, opérations et alertes",
      href: "/admin?tab=dashboard",
      group: "Back-office",
      type: "admin",
      keywords: ["dashboard", "stats", "business"],
      priority: 40,
    },
    {
      id: "admin-users",
      title: "Utilisateurs",
      subtitle: "Joueurs, statistiques, bans, export et invitations",
      href: "/admin?tab=users",
      group: "Back-office",
      type: "admin",
      keywords: ["joueurs", "users", "comptes"],
      priority: 38,
    },
    {
      id: "admin-predictions",
      title: "Pronostics",
      subtitle: "Administration des pronostics et états de complétion",
      href: "/admin?tab=predictions",
      group: "Back-office",
      type: "admin",
      keywords: ["predictions", "pronos"],
      priority: 37,
    },
    {
      id: "admin-races",
      title: "Courses",
      subtitle: "Calendrier, rappels, résultats et pronostics soumis",
      href: "/admin?tab=races",
      group: "Back-office",
      type: "admin",
      keywords: ["grand prix", "circuit", "course"],
      priority: 36,
    },
    {
      id: "admin-circuits",
      title: "Cartes circuits",
      subtitle: "Hotspots, SVG, premiers virages et review des cartes",
      href: "/admin?tab=circuitMaps",
      group: "Back-office",
      type: "admin",
      keywords: ["maps", "hotspots", "virages", "premier virage"],
      priority: 35,
    },
    {
      id: "admin-championships",
      title: "Championnats",
      subtitle: "Saisons, championnats et rattachement des courses",
      href: "/admin?tab=championships",
      group: "Back-office",
      type: "admin",
      keywords: ["saison", "annee", "f1 2026"],
      priority: 34,
    },
    {
      id: "admin-knowledge",
      title: "Base RAG",
      subtitle: "Entités, documents, embeddings et briefs métier",
      href: "/admin?tab=knowledge",
      group: "Back-office",
      type: "admin",
      keywords: ["rag", "mcp", "knowledge", "documents", "entites"],
      priority: 33,
    },
    {
      id: "admin-translations",
      title: "Traductions",
      subtitle: "Préparation FR/EN et audit i18n",
      href: "/admin?tab=translations",
      group: "Back-office",
      type: "admin",
      keywords: ["i18n", "langues", "internationalisation"],
      priority: 31,
    },
    {
      id: "admin-legal",
      title: "Légal & PWA",
      subtitle: "Mentions légales, CGU, confidentialité et publication PWA",
      href: "/admin?tab=legal",
      group: "Back-office",
      type: "admin",
      keywords: ["cgu", "mentions legales", "confidentialite"],
      priority: 30,
    },
    {
      id: "admin-activity",
      title: "Activité",
      subtitle: "Logs admin, événements et audit opérationnel",
      href: "/admin?tab=activity",
      group: "Back-office",
      type: "admin",
      keywords: ["logs", "audit", "historique"],
      priority: 29,
    },
  ];
}

function typeLabel(type?: string) {
  if (type === "championship") return "Championnat";
  if (type === "season") return "Saison";
  if (type === "race") return "Course";
  if (type === "circuit") return "Circuit";
  if (type === "location") return "Lieu";
  if (type === "country") return "Pays";
  if (type === "team") return "Écurie";
  if (type === "constructor") return "Constructeur";
  if (type === "driver") return "Pilote";
  if (type === "technical_team") return "Technique";
  return "Document";
}

function compactExcerpt(value?: string) {
  const clean = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "Document de connaissance F1 2026";
  return clean.length > 150 ? `${clean.slice(0, 147)}...` : clean;
}

function formatAdminRaceDate(value?: string | null) {
  if (!value) return "date à confirmer";
  return new Date(value.includes("T") ? value : `${value}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function adminRaceItems(races: AdminSearchRace[]): DeepSearchItem[] {
  return races.map((race) => ({
    id: `admin-race-${race.id}`,
    title: race.name,
    subtitle: `${race.circuit || "Circuit à compléter"} • ${race.country || "Pays à compléter"} • ${formatAdminRaceDate(race.date)}`,
    badge: race.round_number ? `R${race.round_number}` : "Course",
    href: `/admin?tab=races&race=${encodeURIComponent(race.id)}`,
    group: "Back-office",
    type: "race",
    keywords: [race.id, race.circuit, race.country, race.season, race.status],
    priority: 27,
  }));
}

function adminUserItems(users: AdminSearchUser[]): DeepSearchItem[] {
  return users.map((user) => ({
    id: `admin-user-${user.id}`,
    title: user.username || user.email || "Joueur",
    subtitle: `${user.email || "email non renseigné"} • niveau ${user.level ?? "?"} • ${user.xp ?? 0} XP`,
    badge: "Joueur",
    href: `/admin?tab=users&user=${encodeURIComponent(user.id)}`,
    group: "Back-office",
    type: "player",
    userIdentity: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_id: user.avatar_id,
      custom_avatar_url: user.custom_avatar_url,
      level: user.level,
    },
    keywords: [user.id, user.email, user.username, user.level, user.xp],
    priority: 25,
  }));
}

function knowledgeItems(documents: KnowledgeSearchDocument[], query: string): DeepSearchItem[] {
  return documents.map((document) => ({
    id: `knowledge-${document.id}`,
    title: document.title,
    subtitle: compactExcerpt(document.content),
    badge: typeLabel(document.entity_type),
    href: `/admin?tab=knowledge&q=${encodeURIComponent(query)}`,
    group: "Base RAG",
    type: document.entity_type || "knowledge",
    keywords: [
      document.entity_id,
      document.source_refs?.join(" "),
      document.retrieval_score ? `score ${document.retrieval_score}` : null,
    ],
    priority: 24 + Math.round((document.retrieval_score || 0) * 2),
  }));
}

function groupIcon(group: string, type?: string) {
  if (type === "championship") return Trophy;
  if (type === "season") return Calendar;
  if (type === "driver") return User;
  if (type === "race") return Flag;
  if (type === "circuit") return Route;
  if (type === "team" || type === "constructor") return Trophy;
  if (type === "location" || type === "country") return Map;
  if (group === "Base RAG") return Database;
  if (type === "translations") return Languages;
  if (type === "activity") return Shield;
  return GROUP_ICONS[group as keyof typeof GROUP_ICONS] || Search;
}

export default function AdminDeepSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hasQuery = query.trim().length >= 2;

  useEffect(() => {
    const openSearch = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f") return;
      if (isEditableSearchTarget(event.target)) return;
      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener(OPEN_DEEP_SEARCH_EVENT, openSearch);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_DEEP_SEARCH_EVENT, openSearch);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const ragQuery = useQuery({
    queryKey: ["admin-bo", "deep-search", query],
    queryFn: () => adminApi.knowledge.search({ q: query.trim(), limit: 16, mode: "hybrid" }),
    enabled: open && hasQuery,
    staleTime: 45 * 1000,
  });

  const racesQuery = useQuery({
    queryKey: ["admin-bo", "deep-search", "races"],
    queryFn: () => adminApi.races.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-bo", "deep-search", "users", query],
    queryFn: () => adminApi.users.list({ search: query.trim(), skip: 0, limit: 12 }),
    enabled: open && hasQuery,
    staleTime: 30 * 1000,
  });

  const items = useMemo(
    () => [
      ...adminNavigationItems(),
      ...adminRaceItems((racesQuery.data || []) as AdminSearchRace[]),
      ...adminUserItems((usersQuery.data?.users || []) as AdminSearchUser[]),
      ...knowledgeItems((ragQuery.data?.results || []) as KnowledgeSearchDocument[], query),
    ],
    [query, racesQuery.data, ragQuery.data?.results, usersQuery.data?.users],
  );

  const visibleItems = useMemo(() => filterDeepSearchItems(items, query, 42), [items, query]);
  const groupedItems = useMemo(() => groupDeepSearchItems(visibleItems), [visibleItems]);

  const selectItem = (item: DeepSearchItem) => {
    setOpen(false);
    setQuery("");
    navigate(item.href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[10vh] max-h-[80vh] max-w-4xl translate-y-0 overflow-hidden border-white/[0.08] bg-pk-surface p-0 text-pk-piste shadow-2xl shadow-black/50 sm:rounded-md"
        data-testid="admin-deep-search-dialog"
      >
        <DialogTitle className="sr-only">Recherche profonde admin</DialogTitle>
        <DialogDescription className="sr-only">
          Rechercher dans les modules admin et la base RAG F1 2026.
        </DialogDescription>
        <Command shouldFilter={false} className="bg-transparent">
          <div className="border-b border-white/[0.08]">
            <div className="flex items-start justify-between gap-3 px-4 pt-3">
              <div>
                <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-red">
                  Recherche profonde admin
                </p>
                <p className="font-body text-xs text-pk-titane">
                  Modules back-office, entités F1 2026, circuits, pilotes, écuries et documents RAG.
                </p>
              </div>
              <span className="rounded-sm border border-white/[0.08] px-2 py-1 font-data text-[10px] text-pk-titane">
                {shortcutLabel()}
              </span>
            </div>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              autoFocus
              placeholder="Rechercher pilote, circuit, ville, écurie, année, log, module..."
              className="h-14 font-body text-base text-white placeholder:text-pk-titane"
              data-testid="admin-deep-search-input"
            />
          </div>
          <CommandList className="max-h-[58vh] px-2 py-2">
            <CommandEmpty className="py-10 text-center font-body text-sm text-pk-titane">
              Aucun résultat. Essayez un nom de pilote, circuit, ville, course ou module admin.
            </CommandEmpty>
            {Object.entries(groupedItems).map(([group, groupItems]) => (
              <CommandGroup
                key={group}
                heading={
                  <span className="flex items-center gap-2">
                    {(() => {
                      const Icon = groupIcon(group);
                      return <Icon className="h-3.5 w-3.5" />;
                    })()}
                    {group}
                  </span>
                }
              >
                {groupItems.map((item) => {
                  const Icon = groupIcon(group, item.type);
                  const isPlayer = item.type === "player" && item.userIdentity;
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.group}-${item.title}-${item.subtitle || ""}`}
                      onSelect={() => selectItem(item)}
                      className="min-h-14 cursor-pointer gap-3 rounded-md border border-transparent px-3 py-2 text-pk-piste data-[selected=true]:border-pk-red/35 data-[selected=true]:bg-pk-red-subtle data-[selected=true]:text-white"
                      data-testid={`admin-deep-search-result-${item.id}`}
                    >
                      {!isPlayer ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/[0.08] bg-black/25">
                          <Icon className="h-4 w-4 text-pk-red" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          {isPlayer ? (
                            <UserIdentity
                              user={item.userIdentity!}
                              surface="admin"
                              linked={false}
                              showEmail={false}
                              showLevel={false}
                              size="md"
                              className="min-w-0 flex-1"
                            />
                          ) : (
                            <p className="truncate font-body text-sm font-semibold">{item.title}</p>
                          )}
                          {item.badge ? (
                            <span className="shrink-0 rounded-sm border border-white/[0.08] px-1.5 py-0.5 font-data text-[9px] uppercase text-pk-titane">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        {item.subtitle ? (
                          <p className="truncate font-body text-xs text-pk-titane">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </div>
                      <CommandShortcut>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {ragQuery.isFetching || racesQuery.isFetching || usersQuery.isFetching ? (
              <div className="flex items-center justify-center gap-2 py-4 font-body text-xs text-pk-titane">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Recherche hybride dans le back-office...
              </div>
            ) : null}
          </CommandList>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-4 py-2 font-body text-[11px] text-pk-titane">
            <span>Entrée pour ouvrir • Échap pour fermer</span>
            <span className="inline-flex items-center gap-1">
              <Keyboard className="h-3 w-3" />
              Modules + RAG local
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
