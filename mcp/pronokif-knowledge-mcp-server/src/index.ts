#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config as loadEnv } from "dotenv";
import { MongoClient, type Db, type Document } from "mongodb";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

loadEnv({ path: resolve(repoRoot, "backend/.env") });
loadEnv({ path: resolve(__dirname, "../.env"), override: false });

const SERVER_NAME = "pronokif-knowledge-mcp-server";
const SERVER_VERSION = "0.1.0";
const DEFAULT_CHAMPIONSHIP_ID = "championship-f1-2026";
const DEFAULT_NAMESPACE = "f1_2026";
const MAX_LIMIT = 100;
const LOCAL_EMBEDDING_DIMENSIONS = 256;

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

type SearchMode = "hybrid" | "lexical" | "vector";

type KnowledgeEntity = Document & {
  id: string;
  name?: string;
  entity_type?: string;
  race_id?: string;
  canonical_key?: string;
  relations?: { relation?: string; target_entity_id?: string }[];
  circuit_id?: string;
  location_id?: string;
  country_id?: string;
  useful_links?: unknown[];
  team_id?: string;
  driver_id?: string;
  constructor_id?: string;
  technical_team_id?: string;
  team_entity_id?: string;
  constructor_entity_id?: string;
};

type KnowledgeDocument = Document & {
  id: string;
  title?: string;
  content?: string;
  entity_id?: string;
  entity_type?: string;
  source_refs?: string[];
  related_entity_ids?: string[];
  search_text?: string;
  embedding?: {
    status?: string;
    vector?: number[];
  };
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to backend/.env or mcp/pronokif-knowledge-mcp-server/.env.`,
    );
  }
  return value;
}

async function db(): Promise<Db> {
  if (mongoDb) return mongoDb;
  mongoClient = new MongoClient(requiredEnv("MONGO_URL"));
  await mongoClient.connect();
  mongoDb = mongoClient.db(requiredEnv("DB_NAME"));
  return mongoDb;
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? 20, MAX_LIMIT));
}

function regexQuery(query: string): Document {
  const tokens = query.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!tokens.length) return {};
  return {
    $and: tokens.map((token) => ({
      search_text: { $regex: escapeRegex(token), $options: "i" },
    })),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeQuery(base: Document, extra: Document): Document {
  if (!Object.keys(extra).length) return base;
  if (!Object.keys(base).length) return extra;
  return { $and: [base, extra] };
}

function scoreDocument(document: KnowledgeDocument, query: string): number {
  const text = String(document.search_text ?? "").toLowerCase();
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + text.split(token.toLowerCase()).length - 1, 0);
}

function tokenize(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]{2,}/g) ?? [];
}

function localEmbeddingVector(text: string, dimensions = LOCAL_EMBEDDING_DIMENSIONS): number[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const vector = Array.from({ length: dimensions }, () => 0);
  for (const [token, count] of counts) {
    const digest = createHash("sha256").update(token).digest();
    const index = digest.readUInt32BE(0) % dimensions;
    const sign = digest[4] % 2 === 0 ? 1 : -1;
    vector[index] += sign * (1 + Math.log(count));
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map((value) => Math.round((value / norm) * 1_000_000) / 1_000_000);
}

function cosineSimilarity(left?: number[], right?: number[]): number {
  if (!left || !right || left.length !== right.length) return 0;
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function toText(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

function asStructuredContent(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return { data: payload };
}

function content(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: toText(payload) }],
    structuredContent: asStructuredContent(payload),
  };
}

function entityProjection() {
  return { _id: 0 };
}

function documentProjection() {
  return { _id: 0 };
}

async function searchKnowledge(params: {
  query: string;
  championship_id?: string;
  entity_type?: string;
  limit?: number;
  mode?: SearchMode;
}) {
  const database = await db();
  const limit = clampLimit(params.limit);
  const mode = params.mode ?? "hybrid";
  const base: Document = {
    namespace: DEFAULT_NAMESPACE,
    championship_id: params.championship_id ?? DEFAULT_CHAMPIONSHIP_ID,
  };
  if (params.entity_type) base.entity_type = params.entity_type;
  const mongoQuery = mode === "lexical" ? mergeQuery(base, regexQuery(params.query)) : base;
  const candidates = (await database
    .collection<KnowledgeDocument>("knowledge_documents")
    .find(mongoQuery, { projection: documentProjection() })
    .limit(Math.max(limit * 8, 100))
    .toArray()) as KnowledgeDocument[];
  const queryVector = mode === "lexical" ? undefined : localEmbeddingVector(params.query);
  const results = candidates
    .map((document) => {
      const lexical = scoreDocument(document, params.query);
      const vector =
        document.embedding?.status === "ready"
          ? cosineSimilarity(document.embedding.vector, queryVector)
          : 0;
      const score = mode === "vector" ? vector : mode === "lexical" ? lexical : lexical + vector * 4;
      return { document, score, lexical, vector };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.lexical - a.lexical)
    .slice(0, limit)
    .map(({ document, score, lexical, vector }) => ({
      id: document.id,
      title: document.title,
      entity_id: document.entity_id,
      entity_type: document.entity_type,
      content: document.content,
      source_refs: document.source_refs ?? [],
      related_entity_ids: document.related_entity_ids ?? [],
      retrieval_score: Math.round(score * 1_000_000) / 1_000_000,
      retrieval_scores: {
        lexical,
        vector: Math.round(vector * 1_000_000) / 1_000_000,
      },
    }));
  return { query: params.query, mode, total: results.length, results };
}

async function getEntity(entityId: string) {
  const database = await db();
  const entity = await database
    .collection<KnowledgeEntity>("knowledge_entities")
    .findOne({ id: entityId }, { projection: entityProjection() });
  if (!entity) {
    throw new Error(`Entity not found: ${entityId}. Run the F1 2026 knowledge seed if needed.`);
  }
  return entity;
}

async function listChampionshipEntities(params: {
  championship_id?: string;
  entity_type?: string;
  query?: string;
  limit?: number;
  skip?: number;
}) {
  const database = await db();
  const limit = clampLimit(params.limit);
  const base: Document = {
    namespace: DEFAULT_NAMESPACE,
    championship_id: params.championship_id ?? DEFAULT_CHAMPIONSHIP_ID,
  };
  if (params.entity_type) base.entity_type = params.entity_type;
  const mongoQuery = mergeQuery(base, params.query ? regexQuery(params.query) : {});
  const total = await database.collection("knowledge_entities").countDocuments(mongoQuery);
  const entities = await database
    .collection<KnowledgeEntity>("knowledge_entities")
    .find(mongoQuery, { projection: entityProjection() })
    .sort({ entity_type: 1, name: 1 })
    .skip(params.skip ?? 0)
    .limit(limit)
    .toArray();
  return { total, count: entities.length, skip: params.skip ?? 0, limit, entities };
}

async function getRaceContext(params: { race_id: string; championship_id?: string }) {
  const database = await db();
  const championshipId = params.championship_id ?? DEFAULT_CHAMPIONSHIP_ID;
  const race = await database.collection<KnowledgeEntity>("knowledge_entities").findOne(
    {
      championship_id: championshipId,
      entity_type: "race",
      $or: [{ race_id: params.race_id }, { canonical_key: params.race_id }],
    },
    { projection: entityProjection() },
  );
  if (!race) {
    throw new Error(`Race context not found for ${params.race_id}. Seed knowledge first.`);
  }

  const relatedIds = new Set<string>([
    race.id,
    race.circuit_id,
    race.location_id,
    race.country_id,
  ].filter((value): value is string => Boolean(value)));
  for (const relation of race.relations ?? []) {
    if (relation.target_entity_id) relatedIds.add(relation.target_entity_id);
  }
  const relatedIdList = [...relatedIds].sort();
  const entities = await database
    .collection<KnowledgeEntity>("knowledge_entities")
    .find({ id: { $in: relatedIdList } }, { projection: entityProjection() })
    .sort({ entity_type: 1, name: 1 })
    .toArray();
  const documents = await database
    .collection<KnowledgeDocument>("knowledge_documents")
    .find({ entity_id: { $in: relatedIdList } }, { projection: documentProjection() })
    .sort({ entity_type: 1, title: 1 })
    .toArray();

  const circuit = entities.find((entity) => entity.entity_type === "circuit");
  const location = entities.find((entity) => entity.entity_type === "location");
  const summary = {
    race: race.name,
    race_id: params.race_id,
    date: race.date,
    round_number: race.round_number,
    format: race.is_sprint ? "sprint" : "classic",
    calendar_status: race.calendar_status,
    circuit: circuit?.name,
    location: location?.name,
    country: location?.location?.country,
    timezone: race.timezone,
  };
  return {
    race_id: params.race_id,
    championship_id: championshipId,
    summary,
    entities,
    documents,
    useful_links: race.useful_links ?? [],
  };
}

async function entitiesAndDocumentsForIds(entityIds: Set<string>) {
  const database = await db();
  const ids = [...entityIds].filter(Boolean).sort();
  const entities = await database
    .collection<KnowledgeEntity>("knowledge_entities")
    .find({ id: { $in: ids } }, { projection: entityProjection() })
    .sort({ entity_type: 1, name: 1 })
    .toArray();
  const documents = await database
    .collection<KnowledgeDocument>("knowledge_documents")
    .find({ entity_id: { $in: ids } }, { projection: documentProjection() })
    .sort({ entity_type: 1, title: 1 })
    .toArray();
  return { entities, documents };
}

async function getTeamContext(params: { team_id: string; championship_id?: string }) {
  const database = await db();
  const championshipId = params.championship_id ?? DEFAULT_CHAMPIONSHIP_ID;
  const team = await database.collection<KnowledgeEntity>("knowledge_entities").findOne(
    {
      championship_id: championshipId,
      entity_type: "team",
      $or: [{ team_id: params.team_id }, { canonical_key: params.team_id }, { id: params.team_id }],
    },
    { projection: entityProjection() },
  );
  if (!team) {
    throw new Error(`Team context not found for ${params.team_id}. Seed knowledge first.`);
  }
  const drivers = await database
    .collection<KnowledgeEntity>("knowledge_entities")
    .find(
      { championship_id: championshipId, entity_type: "driver", team_id: team.team_id },
      { projection: entityProjection() },
    )
    .sort({ name: 1 })
    .toArray();
  const relatedIds = new Set<string>(
    [team.id, team.constructor_id, team.technical_team_id, ...drivers.map((driver) => driver.id)].filter(
      (value): value is string => Boolean(value),
    ),
  );
  for (const relation of team.relations ?? []) {
    if (relation.target_entity_id) relatedIds.add(relation.target_entity_id);
  }
  const { entities, documents } = await entitiesAndDocumentsForIds(relatedIds);
  const constructor = entities.find((entity) => entity.entity_type === "constructor");
  const technicalTeam = entities.find((entity) => entity.entity_type === "technical_team");
  return {
    team_id: params.team_id,
    championship_id: championshipId,
    summary: {
      team: team.display_name ?? team.name,
      team_id: team.team_id,
      full_team_name: team.full_team_name,
      base: team.base,
      drivers: drivers.map((driver) => ({
        id: driver.driver_id,
        name: driver.name,
        code: driver.code,
        number: driver.number,
      })),
      chassis: constructor?.chassis,
      power_unit: constructor?.power_unit,
      team_chief: technicalTeam?.team_chief,
      technical_chiefs: technicalTeam?.technical_chiefs ?? [],
    },
    entities,
    documents,
    useful_links: team.useful_links ?? [],
  };
}

async function getDriverContext(params: { driver_id: string; championship_id?: string }) {
  const database = await db();
  const championshipId = params.championship_id ?? DEFAULT_CHAMPIONSHIP_ID;
  const driver = await database.collection<KnowledgeEntity>("knowledge_entities").findOne(
    {
      championship_id: championshipId,
      entity_type: "driver",
      $or: [
        { driver_id: params.driver_id },
        { canonical_key: params.driver_id },
        { code: params.driver_id.toUpperCase() },
      ],
    },
    { projection: entityProjection() },
  );
  if (!driver) {
    throw new Error(`Driver context not found for ${params.driver_id}. Seed knowledge first.`);
  }
  const team = await database.collection<KnowledgeEntity>("knowledge_entities").findOne(
    { championship_id: championshipId, entity_type: "team", team_id: driver.team_id },
    { projection: entityProjection() },
  );
  const relatedIds = new Set<string>(
    [driver.id, driver.team_entity_id, driver.constructor_entity_id, team?.technical_team_id].filter(
      (value): value is string => Boolean(value),
    ),
  );
  for (const relation of driver.relations ?? []) {
    if (relation.target_entity_id) relatedIds.add(relation.target_entity_id);
  }
  const { entities, documents } = await entitiesAndDocumentsForIds(relatedIds);
  const constructor = entities.find((entity) => entity.entity_type === "constructor");
  const technicalTeam = entities.find((entity) => entity.entity_type === "technical_team");
  return {
    driver_id: params.driver_id,
    championship_id: championshipId,
    summary: {
      driver: driver.name,
      driver_id: driver.driver_id,
      code: driver.code,
      number: driver.number,
      country: driver.country_name ?? driver.country_code,
      team: team?.display_name ?? team?.name,
      team_id: driver.team_id,
      chassis: constructor?.chassis,
      power_unit: constructor?.power_unit,
      team_chief: technicalTeam?.team_chief,
    },
    entities,
    documents,
    useful_links: driver.useful_links ?? [],
  };
}

function buildBriefFromContext(contextData: Awaited<ReturnType<typeof getRaceContext>>) {
  const circuit = contextData.entities.find((entity) => entity.entity_type === "circuit");
  const location = contextData.entities.find((entity) => entity.entity_type === "location");
  const circuitProfile = circuit?.circuit ?? {};
  const locationProfile = location?.location ?? {};
  const formatLabel = contextData.summary.format === "sprint" ? "week-end sprint" : "Grand Prix classique";
  return {
    race_id: contextData.race_id,
    championship_id: contextData.championship_id,
    title: `Brief pronostic - ${contextData.summary.race}`,
    summary: contextData.summary,
    sections: [
      {
        id: "race",
        title: "Course",
        content: `${contextData.summary.race} est la manche ${contextData.summary.round_number}. Date: ${contextData.summary.date}. Format: ${formatLabel}.`,
      },
      {
        id: "circuit",
        title: "Circuit",
        content: `${contextData.summary.circuit} mesure ${circuitProfile.length_km ?? "?"} km, avec ${circuitProfile.turns ?? "?"} virages et ${circuitProfile.laps ?? "?"} tours.`,
      },
      {
        id: "location",
        title: "Lieu",
        content: `${contextData.summary.location}, ${locationProfile.country ?? "pays a verifier"}. Adresse: ${locationProfile.address ?? "a verifier"}.`,
      },
      {
        id: "prediction_focus",
        title: "Axes de pronostic",
        content:
          "Comparer les tendances pilotes/equipes, la qualif, le risque safety car, la degradation pneus et les ecarts de performance recents avant de figer le top 10.",
      },
    ],
    source_document_ids: contextData.documents.map((document) => document.id),
    useful_links: contextData.useful_links,
  };
}

function buildTeamBrief(contextData: Awaited<ReturnType<typeof getTeamContext>>) {
  const summary = contextData.summary;
  const driverNames = summary.drivers.map((driver: { name?: string }) => driver.name).filter(Boolean).join(", ");
  return {
    team_id: contextData.team_id,
    championship_id: contextData.championship_id,
    title: `Brief ecurie - ${summary.team}`,
    summary,
    sections: [
      {
        id: "identity",
        title: "Identite",
        content: `${summary.team} court sous le nom ${summary.full_team_name}. Base: ${summary.base?.city}, ${summary.base?.country}.`,
      },
      { id: "drivers", title: "Pilotes", content: `Duo 2026: ${driverNames || "a confirmer"}.` },
      {
        id: "technical",
        title: "Technique",
        content: `Chassis ${summary.chassis}, power unit ${summary.power_unit}. Direction: ${summary.team_chief ?? "a confirmer"}.`,
      },
    ],
    source_document_ids: contextData.documents.map((document) => document.id),
    useful_links: contextData.useful_links,
  };
}

function buildDriverBrief(contextData: Awaited<ReturnType<typeof getDriverContext>>) {
  const summary = contextData.summary;
  return {
    driver_id: contextData.driver_id,
    championship_id: contextData.championship_id,
    title: `Brief pilote - ${summary.driver}`,
    summary,
    sections: [
      {
        id: "identity",
        title: "Pilote",
        content: `${summary.driver} (${summary.code}, numero ${summary.number}) represente ${summary.country}.`,
      },
      {
        id: "team",
        title: "Ecurie",
        content: `Equipe: ${summary.team}. Chassis ${summary.chassis}, power unit ${summary.power_unit}.`,
      },
      {
        id: "prediction_use",
        title: "Usage prono",
        content: "A croiser avec la forme recente, les qualifications et le profil circuit avant le top 10.",
      },
    ],
    source_document_ids: contextData.documents.map((document) => document.id),
    useful_links: contextData.useful_links,
  };
}

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

server.registerTool(
  "pronokif_search_knowledge",
  {
    title: "Search PronoKif Knowledge",
    description: "Search F1 2026 knowledge documents for circuits, races, teams, drivers and technical data.",
    inputSchema: {
      query: z.string().min(1).max(200).describe("Search query, for example 'Madrid circuit address'."),
      entity_type: z.string().optional().describe("Optional entity type filter: race, circuit, team, driver, etc."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to search."),
      limit: z.number().int().min(1).max(MAX_LIMIT).default(10).describe("Maximum documents to return."),
      mode: z
        .enum(["hybrid", "lexical", "vector"])
        .default("hybrid")
        .describe("Retrieval mode. Hybrid combines lexical and local vector scores."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(await searchKnowledge(params)),
);

server.registerTool(
  "pronokif_get_entity",
  {
    title: "Get PronoKif Entity",
    description: "Fetch one F1 2026 knowledge entity by stable entity ID.",
    inputSchema: {
      entity_id: z.string().min(1).describe("Stable entity ID, for example f1_2026:circuit:madrid."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ entity_id }) => content(await getEntity(entity_id)),
);

server.registerTool(
  "pronokif_list_championship_entities",
  {
    title: "List Championship Entities",
    description: "List F1 2026 knowledge entities with optional type and text filters.",
    inputSchema: {
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
      entity_type: z.string().optional().describe("Optional entity type filter."),
      query: z.string().optional().describe("Optional text filter over search_text."),
      limit: z.number().int().min(1).max(MAX_LIMIT).default(25).describe("Maximum entities to return."),
      skip: z.number().int().min(0).default(0).describe("Pagination offset."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(await listChampionshipEntities(params)),
);

server.registerTool(
  "pronokif_get_race_context",
  {
    title: "Get Race Context",
    description: "Return the RAG entity graph and source documents around one F1 2026 race.",
    inputSchema: {
      race_id: z.string().min(1).describe("Race ID, for example madrid-2026."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(await getRaceContext(params)),
);

server.registerTool(
  "pronokif_build_prediction_brief",
  {
    title: "Build Prediction Brief",
    description: "Build a concise prediction brief from the seeded F1 2026 race context.",
    inputSchema: {
      race_id: z.string().min(1).describe("Race ID, for example madrid-2026."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(buildBriefFromContext(await getRaceContext(params))),
);

server.registerTool(
  "pronokif_get_team_context",
  {
    title: "Get Team Context",
    description: "Return the RAG entity graph around one F1 2026 team, including drivers and technical data.",
    inputSchema: {
      team_id: z.string().min(1).describe("Team ID, for example mclaren."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(await getTeamContext(params)),
);

server.registerTool(
  "pronokif_get_driver_context",
  {
    title: "Get Driver Context",
    description: "Return the RAG entity graph around one F1 2026 driver, including team and constructor links.",
    inputSchema: {
      driver_id: z.string().min(1).describe("Driver ID or code, for example norris or NOR."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(await getDriverContext(params)),
);

server.registerTool(
  "pronokif_build_team_brief",
  {
    title: "Build Team Brief",
    description: "Build a concise team brief from the seeded F1 2026 team context.",
    inputSchema: {
      team_id: z.string().min(1).describe("Team ID, for example mclaren."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(buildTeamBrief(await getTeamContext(params))),
);

server.registerTool(
  "pronokif_build_driver_brief",
  {
    title: "Build Driver Brief",
    description: "Build a concise driver brief from the seeded F1 2026 driver context.",
    inputSchema: {
      driver_id: z.string().min(1).describe("Driver ID or code, for example norris or NOR."),
      championship_id: z.string().default(DEFAULT_CHAMPIONSHIP_ID).describe("Championship ID to inspect."),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params) => content(buildDriverBrief(await getDriverContext(params))),
);

server.registerResource(
  "pronokif_race_context",
  new ResourceTemplate("pronokif://races/{race_id}/context", { list: undefined }),
  {
    title: "PronoKif Race Context",
    description: "JSON RAG context for one F1 2026 race.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const raceId = String(variables.race_id);
    const payload = await getRaceContext({ race_id: raceId });
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: toText(payload) }],
    };
  },
);

server.registerResource(
  "pronokif_team_context",
  new ResourceTemplate("pronokif://teams/{team_id}/context", { list: undefined }),
  {
    title: "PronoKif Team Context",
    description: "JSON RAG context for one F1 2026 team.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const teamId = String(variables.team_id);
    const payload = await getTeamContext({ team_id: teamId });
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: toText(payload) }],
    };
  },
);

server.registerResource(
  "pronokif_driver_context",
  new ResourceTemplate("pronokif://drivers/{driver_id}/context", { list: undefined }),
  {
    title: "PronoKif Driver Context",
    description: "JSON RAG context for one F1 2026 driver.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const driverId = String(variables.driver_id);
    const payload = await getDriverContext({ driver_id: driverId });
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: toText(payload) }],
    };
  },
);

server.registerResource(
  "pronokif_entity",
  new ResourceTemplate("pronokif://entities/{entity_id}", { list: undefined }),
  {
    title: "PronoKif Knowledge Entity",
    description: "JSON representation of one seeded PronoKif knowledge entity.",
    mimeType: "application/json",
  },
  async (uri, variables) => {
    const entityId = String(variables.entity_id);
    const payload = await getEntity(entityId);
    return {
      contents: [{ uri: uri.href, mimeType: "application/json", text: toText(payload) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(`[${SERVER_NAME}] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await mongoClient?.close();
  process.exit(0);
});
