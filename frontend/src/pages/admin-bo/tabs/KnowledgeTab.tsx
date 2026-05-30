/**
 * Admin knowledge base tab.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Database,
  Edit3,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type KnowledgeEntity = {
  id: string;
  name: string;
  entity_type: string;
  data_status?: string;
  review_status?: string;
  owner_admin_email?: string;
  admin_notes?: string;
  search_terms?: string[];
  linked_race_ids?: string[];
  useful_links?: { label: string; url?: string; type: string }[];
};

type KnowledgeDocument = {
  id: string;
  title: string;
  entity_type: string;
  content: string;
  data_status?: string;
  review_status?: string;
  owner_admin_email?: string;
  admin_notes?: string;
  embedding?: { status?: string };
  source_refs?: string[];
};

type PredictionBrief = {
  title: string;
  sections: { id: string; title: string; content: string }[];
  source_document_ids?: string[];
};

type BriefKind = "race" | "team" | "driver";

type KnowledgeTabProps = {
  currentAdminEmail?: string;
};

type EntityDraft = {
  name: string;
  data_status: string;
  review_status: string;
  owner_admin_email: string;
  admin_notes: string;
};

type DocumentDraft = {
  title: string;
  content: string;
  data_status: string;
  review_status: string;
  owner_admin_email: string;
  admin_notes: string;
};

const ENTITY_TYPES = [
  { value: "", label: "Toutes" },
  { value: "race", label: "Courses" },
  { value: "circuit", label: "Circuits" },
  { value: "location", label: "Lieux" },
  { value: "country", label: "Pays" },
  { value: "team", label: "Écuries" },
  { value: "constructor", label: "Constructeurs" },
  { value: "driver", label: "Pilotes" },
  { value: "technical_team", label: "Technique" },
] as const;

const REVIEW_STATUS_OPTIONS = [
  { value: "", label: "Non revu" },
  { value: "in_review", label: "En revue" },
  { value: "needs_source", label: "Source à vérifier" },
  { value: "approved", label: "Validé" },
] as const;

function compactPayload(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function typeLabel(type: string) {
  return ENTITY_TYPES.find((item) => item.value === type)?.label || type;
}

export default function KnowledgeTab({ currentAdminEmail = "" }: KnowledgeTabProps) {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [entityType, setEntityType] = useState(() => searchParams.get("entity_type") || "");
  const [briefKind, setBriefKind] = useState<BriefKind>("race");
  const [briefEntityId, setBriefEntityId] = useState("madrid-2026");
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [entityDraft, setEntityDraft] = useState<EntityDraft>({
    name: "",
    data_status: "",
    review_status: "",
    owner_admin_email: "",
    admin_notes: "",
  });
  const [documentDraft, setDocumentDraft] = useState<DocumentDraft>({
    title: "",
    content: "",
    data_status: "",
    review_status: "",
    owner_admin_email: "",
    admin_notes: "",
  });

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    const nextEntityType = searchParams.get("entity_type") || "";
    if (nextQuery) {
      setQuery(nextQuery);
    }
    setEntityType(nextEntityType);
  }, [searchParams]);

  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      entity_type: entityType || undefined,
      limit: 16,
    }),
    [entityType, query],
  );

  const { data: entitiesData, isLoading: entitiesLoading } = useQuery({
    queryKey: ["admin-bo", "knowledge", "entities", params],
    queryFn: () => adminApi.knowledge.entities(params),
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["admin-bo", "knowledge", "documents", params],
    queryFn: () => adminApi.knowledge.documents(params),
  });

  const seedMutation = useMutation({
    mutationFn: () => adminApi.knowledge.seedF12026(),
    onSuccess: (data) => {
      toast.success(
        `Base RAG synchronisée : ${data.entities.total} entité(s), ${data.documents.total} document(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    },
    onError: () => toast.error("Impossible de synchroniser la base RAG F1 2026"),
  });

  const rebuildMutation = useMutation({
    mutationFn: () => adminApi.knowledge.rebuildEmbeddings({ force: false, limit: 1000 }),
    onSuccess: (data) => {
      toast.success(
        `Index RAG prêt : ${data.updated} document(s), ${data.remaining_pending} restant(s)`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
    },
    onError: () => toast.error("Impossible de reconstruire l'index RAG"),
  });

  const briefMutation = useMutation({
    mutationFn: () => {
      const id = briefEntityId.trim();
      if (briefKind === "team") return adminApi.knowledge.teamBrief(id);
      if (briefKind === "driver") return adminApi.knowledge.driverBrief(id);
      return adminApi.knowledge.predictionBrief(id);
    },
    onError: () => toast.error("Brief introuvable pour cette entité"),
  });

  const updateEntityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.knowledge.updateEntity(id, data),
    onSuccess: () => {
      toast.success("Entité RAG mise à jour");
      setEditingEntityId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
    },
    onError: () => toast.error("Impossible de mettre à jour l'entité RAG"),
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.knowledge.updateDocument(id, data),
    onSuccess: () => {
      toast.success("Document RAG mis à jour, réindexation requise");
      setEditingDocumentId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
    },
    onError: () => toast.error("Impossible de mettre à jour le document RAG"),
  });

  const claimEntityMutation = useMutation({
    mutationFn: (entity: KnowledgeEntity) =>
      adminApi.knowledge.claimEntity(entity.id, {
        owner_admin_email: currentAdminEmail || undefined,
        review_status: "in_review",
      }),
    onSuccess: () => {
      toast.success("Entité prise en main");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
    },
    onError: () => toast.error("Impossible de prendre en main cette entité"),
  });

  const claimDocumentMutation = useMutation({
    mutationFn: (document: KnowledgeDocument) =>
      adminApi.knowledge.claimDocument(document.id, {
        owner_admin_email: currentAdminEmail || undefined,
        review_status: "in_review",
      }),
    onSuccess: () => {
      toast.success("Document pris en main");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
    },
    onError: () => toast.error("Impossible de prendre en main ce document"),
  });

  const entities = (entitiesData?.entities || []) as KnowledgeEntity[];
  const documents = (documentsData?.documents || []) as KnowledgeDocument[];
  const brief = briefMutation.data as PredictionBrief | undefined;
  const totalEntities = entitiesData?.total ?? 0;
  const totalDocuments = documentsData?.total ?? 0;
  const embeddingSummary = documentsData?.embedding_summary;
  const pendingEmbeddings =
    embeddingSummary?.pending ??
    documents.filter((doc) => doc.embedding?.status !== "ready").length;
  const readyEmbeddings =
    embeddingSummary?.ready ?? documents.filter((doc) => doc.embedding?.status === "ready").length;

  const startEntityEdit = (entity: KnowledgeEntity) => {
    setEditingDocumentId(null);
    setEditingEntityId(entity.id);
    setEntityDraft({
      name: entity.name || "",
      data_status: entity.data_status || "",
      review_status: entity.review_status || "",
      owner_admin_email: entity.owner_admin_email || currentAdminEmail || "",
      admin_notes: entity.admin_notes || "",
    });
  };

  const startDocumentEdit = (document: KnowledgeDocument) => {
    setEditingEntityId(null);
    setEditingDocumentId(document.id);
    setDocumentDraft({
      title: document.title || "",
      content: document.content || "",
      data_status: document.data_status || "",
      review_status: document.review_status || "",
      owner_admin_email: document.owner_admin_email || currentAdminEmail || "",
      admin_notes: document.admin_notes || "",
    });
  };

  const saveEntity = (id: string) => {
    updateEntityMutation.mutate({
      id,
      data: compactPayload({
        name: entityDraft.name.trim(),
        data_status: entityDraft.data_status.trim() || undefined,
        review_status: entityDraft.review_status || undefined,
        owner_admin_email: entityDraft.owner_admin_email.trim() || undefined,
        admin_notes: entityDraft.admin_notes,
      }),
    });
  };

  const saveDocument = (id: string) => {
    updateDocumentMutation.mutate({
      id,
      data: compactPayload({
        title: documentDraft.title.trim(),
        content: documentDraft.content.trim(),
        data_status: documentDraft.data_status.trim() || undefined,
        review_status: documentDraft.review_status || undefined,
        owner_admin_email: documentDraft.owner_admin_email.trim() || undefined,
        admin_notes: documentDraft.admin_notes,
      }),
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Base RAG</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => rebuildMutation.mutate()}
            disabled={rebuildMutation.isPending}
            variant="ghost"
            className="text-purple-300 hover:text-purple-200 text-xs"
            size="sm"
            data-testid="rebuild-knowledge-embeddings"
          >
            {rebuildMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            Indexer
          </Button>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 text-xs"
            size="sm"
            data-testid="seed-f1-2026-knowledge"
          >
            {seedMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Seed F1 2026
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="card-arcade p-4">
          <Database className="mb-2 h-4 w-4 text-cyan-400" />
          <p className="font-data text-2xl text-white">{totalEntities}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Entités</p>
        </div>
        <div className="card-arcade p-4">
          <FileText className="mb-2 h-4 w-4 text-orange-400" />
          <p className="font-data text-2xl text-white">{totalDocuments}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Documents</p>
        </div>
        <div className="card-arcade p-4">
          <Sparkles className="mb-2 h-4 w-4 text-purple-400" />
          <p className="font-data text-2xl text-white">{pendingEmbeddings}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Embeddings pending</p>
        </div>
        <div className="card-arcade p-4">
          <Sparkles className="mb-2 h-4 w-4 text-green-400" />
          <p className="font-data text-2xl text-white">{readyEmbeddings}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Embeddings prêts</p>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une entité, un circuit, un pilote..."
              className="bg-gray-900 border-gray-700 pl-9 text-white"
            />
          </div>
          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            data-testid="knowledge-entity-filter"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type.value || "all"} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="font-heading text-sm uppercase text-white">Brief RAG</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
          <select
            value={briefKind}
            onChange={(event) => {
              const nextKind = event.target.value as BriefKind;
              setBriefKind(nextKind);
              setBriefEntityId(
                nextKind === "team" ? "mclaren" : nextKind === "driver" ? "norris" : "madrid-2026",
              );
            }}
            className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="race">Course</option>
            <option value="team">Écurie</option>
            <option value="driver">Pilote</option>
          </select>
          <Input
            value={briefEntityId}
            onChange={(event) => setBriefEntityId(event.target.value)}
            placeholder={
              briefKind === "team" ? "mclaren" : briefKind === "driver" ? "norris" : "madrid-2026"
            }
            className="bg-gray-900 border-gray-700 text-white"
          />
          <Button
            onClick={() => briefMutation.mutate()}
            disabled={briefMutation.isPending || !briefEntityId.trim()}
            variant="ghost"
            className="text-purple-300 hover:text-purple-200 text-xs"
            size="sm"
          >
            {briefMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-1 h-4 w-4" />
            )}
            Générer
          </Button>
        </div>
        {brief && (
          <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
            <p className="mb-2 font-body text-sm text-white">{brief.title}</p>
            <div className="space-y-2">
              {brief.sections.map((section) => (
                <div key={section.id}>
                  <p className="font-body text-xs uppercase text-gray-500">{section.title}</p>
                  <p className="font-body text-xs leading-relaxed text-gray-300">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card-arcade p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h3 className="font-heading text-sm uppercase text-white">Entités</h3>
          </div>
          {entitiesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            </div>
          ) : entities.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-gray-500">Aucune entité</p>
          ) : (
            <div className="space-y-2">
              {entities.map((entity) => (
                <article
                  key={entity.id}
                  className="rounded-md border border-white/10 bg-black/25 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-white">{entity.name}</p>
                      <p className="font-body text-xs text-gray-500">{entity.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        onClick={() => claimEntityMutation.mutate(entity)}
                        disabled={claimEntityMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-emerald-300 hover:text-emerald-200"
                        title="Prendre en main"
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Prendre
                      </Button>
                      <Button
                        onClick={() => startEntityEdit(entity)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-cyan-300 hover:text-cyan-200"
                        title="Éditer"
                      >
                        <Edit3 className="mr-1 h-3 w-3" />
                        Éditer
                      </Button>
                      <span className="rounded bg-cyan-500/10 px-2 py-1 font-body text-[10px] uppercase text-cyan-300">
                        {typeLabel(entity.entity_type)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 font-body text-[10px] text-gray-500">
                    {entity.data_status && <span>{entity.data_status}</span>}
                    {entity.review_status && <span>{entity.review_status}</span>}
                    {entity.owner_admin_email && <span>Owner : {entity.owner_admin_email}</span>}
                    {!!entity.linked_race_ids?.length && (
                      <span>{entity.linked_race_ids.length} course(s)</span>
                    )}
                    {!!entity.useful_links?.length && (
                      <span>{entity.useful_links.length} lien(s)</span>
                    )}
                  </div>
                  {entity.admin_notes && (
                    <p className="mt-2 line-clamp-2 font-body text-xs leading-relaxed text-gray-400">
                      {entity.admin_notes}
                    </p>
                  )}
                  {editingEntityId === entity.id && (
                    <div className="mt-3 grid gap-3 border-t border-white/10 pt-3">
                      <Input
                        value={entityDraft.name}
                        onChange={(event) =>
                          setEntityDraft({ ...entityDraft, name: event.target.value })
                        }
                        placeholder="Nom canonique"
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input
                          value={entityDraft.data_status}
                          onChange={(event) =>
                            setEntityDraft({ ...entityDraft, data_status: event.target.value })
                          }
                          placeholder="Statut data"
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                        <select
                          value={entityDraft.review_status}
                          onChange={(event) =>
                            setEntityDraft({ ...entityDraft, review_status: event.target.value })
                          }
                          className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
                        >
                          {REVIEW_STATUS_OPTIONS.map((status) => (
                            <option key={status.value || "empty"} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={entityDraft.owner_admin_email}
                          onChange={(event) =>
                            setEntityDraft({
                              ...entityDraft,
                              owner_admin_email: event.target.value,
                            })
                          }
                          placeholder="Admin propriétaire"
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                      <Textarea
                        value={entityDraft.admin_notes}
                        onChange={(event) =>
                          setEntityDraft({ ...entityDraft, admin_notes: event.target.value })
                        }
                        placeholder="Notes admin, sources à vérifier, décisions de curation..."
                        rows={3}
                        className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setEditingEntityId(null)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Annuler
                        </Button>
                        <Button
                          onClick={() => saveEntity(entity.id)}
                          disabled={updateEntityMutation.isPending || !entityDraft.name.trim()}
                          variant="ghost"
                          size="sm"
                          className="text-cyan-300 hover:text-cyan-200"
                        >
                          {updateEntityMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-4 w-4" />
                          )}
                          Sauver
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card-arcade p-4">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-400" />
            <h3 className="font-heading text-sm uppercase text-white">Documents RAG</h3>
          </div>
          {documentsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
            </div>
          ) : documents.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-gray-500">Aucun document</p>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-md border border-white/10 bg-black/25 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-body text-sm text-white">{document.title}</p>
                      <p className="font-body text-xs text-gray-500">{document.id}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        onClick={() => claimDocumentMutation.mutate(document)}
                        disabled={claimDocumentMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-emerald-300 hover:text-emerald-200"
                        title="Prendre en main"
                      >
                        <UserCheck className="mr-1 h-3 w-3" />
                        Prendre
                      </Button>
                      <Button
                        onClick={() => startDocumentEdit(document)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-orange-300 hover:text-orange-200"
                        title="Éditer"
                      >
                        <Edit3 className="mr-1 h-3 w-3" />
                        Éditer
                      </Button>
                      <span className="rounded bg-orange-500/10 px-2 py-1 font-body text-[10px] uppercase text-orange-300">
                        {document.embedding?.status || "unknown"}
                      </span>
                    </div>
                  </div>
                  <p className="line-clamp-3 font-body text-xs leading-relaxed text-gray-400">
                    {document.content}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 font-body text-[10px] text-gray-500">
                    {document.data_status && <span>{document.data_status}</span>}
                    {document.review_status && <span>{document.review_status}</span>}
                    {document.owner_admin_email && (
                      <span>Owner : {document.owner_admin_email}</span>
                    )}
                  </div>
                  {document.admin_notes && (
                    <p className="mt-2 line-clamp-2 font-body text-xs leading-relaxed text-gray-400">
                      {document.admin_notes}
                    </p>
                  )}
                  {!!document.source_refs?.length && (
                    <p className="mt-2 font-body text-[10px] text-gray-600">
                      Sources : {document.source_refs.join(", ")}
                    </p>
                  )}
                  {editingDocumentId === document.id && (
                    <div className="mt-3 grid gap-3 border-t border-white/10 pt-3">
                      <Input
                        value={documentDraft.title}
                        onChange={(event) =>
                          setDocumentDraft({ ...documentDraft, title: event.target.value })
                        }
                        placeholder="Titre du document"
                        className="bg-gray-900 border-gray-700 text-white"
                      />
                      <Textarea
                        value={documentDraft.content}
                        onChange={(event) =>
                          setDocumentDraft({ ...documentDraft, content: event.target.value })
                        }
                        placeholder="Contenu RAG"
                        rows={7}
                        className="resize-y border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                      />
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input
                          value={documentDraft.data_status}
                          onChange={(event) =>
                            setDocumentDraft({ ...documentDraft, data_status: event.target.value })
                          }
                          placeholder="Statut data"
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                        <select
                          value={documentDraft.review_status}
                          onChange={(event) =>
                            setDocumentDraft({
                              ...documentDraft,
                              review_status: event.target.value,
                            })
                          }
                          className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
                        >
                          {REVIEW_STATUS_OPTIONS.map((status) => (
                            <option key={status.value || "empty"} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={documentDraft.owner_admin_email}
                          onChange={(event) =>
                            setDocumentDraft({
                              ...documentDraft,
                              owner_admin_email: event.target.value,
                            })
                          }
                          placeholder="Admin propriétaire"
                          className="bg-gray-900 border-gray-700 text-white"
                        />
                      </div>
                      <Textarea
                        value={documentDraft.admin_notes}
                        onChange={(event) =>
                          setDocumentDraft({ ...documentDraft, admin_notes: event.target.value })
                        }
                        placeholder="Notes admin, enrichissements à faire, sources manquantes..."
                        rows={3}
                        className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setEditingDocumentId(null)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400"
                        >
                          <X className="mr-1 h-4 w-4" />
                          Annuler
                        </Button>
                        <Button
                          onClick={() => saveDocument(document.id)}
                          disabled={
                            updateDocumentMutation.isPending ||
                            !documentDraft.title.trim() ||
                            !documentDraft.content.trim()
                          }
                          variant="ghost"
                          size="sm"
                          className="text-orange-300 hover:text-orange-200"
                        >
                          {updateDocumentMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-4 w-4" />
                          )}
                          Sauver
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
