# PronoKif Knowledge MCP Server

Local stdio MCP server for the PronoKif F1 2026 knowledge base.

Status on 2026-05-31: read-only foundation shipped, connected to the admin knowledge/RAG workflow and documented in the v0.4.2 release.

## Foundation

The backend seed builds three MongoDB collections:

- `knowledge_sources`: official and curated sources.
- `knowledge_entities`: stable linked entities for races, circuits, locations, countries, teams, constructors, drivers and technical teams.
- `knowledge_documents`: RAG chunks ready for embeddings with `embedding.status = "pending"`.

The MCP layer reads those collections directly and exposes read-only workflow tools for agents.

## Setup

```bash
cd mcp/pronokif-knowledge-mcp-server
npm install
npm run build
```

The server reads MongoDB config from `backend/.env` by default:

- `MONGO_URL`
- `DB_NAME`

Seed data first from the admin API:

```bash
POST /api/admin-bo/knowledge/seed-f1-2026
POST /api/admin-bo/knowledge/embeddings/rebuild
```

## Run

```bash
npm start
```

## Tools

- `pronokif_search_knowledge`
- `pronokif_get_entity`
- `pronokif_list_championship_entities`
- `pronokif_get_race_context`
- `pronokif_build_prediction_brief`
- `pronokif_get_team_context`
- `pronokif_get_driver_context`
- `pronokif_build_team_brief`
- `pronokif_build_driver_brief`

All tools are read-only.

## Resources

- `pronokif://races/{race_id}/context`
- `pronokif://teams/{team_id}/context`
- `pronokif://drivers/{driver_id}/context`
- `pronokif://entities/{entity_id}`

## Next steps

1. Add a production embedding provider behind the same `embedding` schema.
2. Add observable embedding rebuild status in the admin back office.
3. Expand evals with deeper multi-tool questions once more live data is seeded.
