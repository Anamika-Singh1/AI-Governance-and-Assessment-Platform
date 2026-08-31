# AI Governance Research & Assessment Application

A full-stack platform that takes a natural-language description of an AI use case (real or entirely new) and produces a **repeatable, evidence-based AI governance assessment** — deterministic risk scoring across 10 governance dimensions, a data-driven governance rule engine, a real RAG retrieval pipeline over a curated source library, regulatory mapping to public sources, and a full audit trail. Built around Financial Services / Banking as the seeded industry, with the schema and rule engine designed to extend to others as data, not code.

This app deliberately does **not** ask an LLM "is this high risk?" — see [Assessment Methodology](docs/assessment-methodology.md).

For full technical documentation beyond this overview, see the [`docs/`](docs/) folder: [architecture.md](docs/architecture.md), [database.md](docs/database.md), [assessment-methodology.md](docs/assessment-methodology.md), [ai-and-rag.md](docs/ai-and-rag.md), and [source-and-licence-inventory.md](docs/source-and-licence-inventory.md).

---

## 1. Project Overview

| | |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite, Tailwind CSS v4, a small shadcn/ui-style component set, Recharts, React Router |
| **Backend** | Node.js + Express + TypeScript, REST API |
| **Database** | PostgreSQL 16 + pgvector (single system of record for structured data and retrieval embeddings) |
| **AI** | Provider-agnostic `LLMProvider` abstraction — Anthropic / OpenAI / a local OpenAI-compatible server (Ollama, LM Studio, vLLM) / deterministic fallback — used only to extract structured signals, never to score |
| **Retrieval** | Real RAG: chunking → embedding → pgvector cosine search over a 15-source curated library, with a deterministic, dependency-free embedding provider (see [ai-and-rag.md](docs/ai-and-rag.md)) |

The application ships two working example flows out of the box:
1. **Sample banking use cases** available as one-click quick-starts on the New Assessment page (loan approval, credit risk, fraud detection, chatbot, AI financial advice, recruitment screening, transaction monitoring, insurance claims).
2. **Any new use case you type**, including one written on the spot by an evaluator — the whole pipeline (structuring → scoring → rule evaluation → evidence retrieval → classification) runs dynamically, with no hardcoded use-case IDs.

## 2. Architecture

The one constraint everything else follows: **the LLM never computes a risk score.** It extracts structured signals from free text exactly once, at use-case creation; every dimension score, override, and final classification after that is pure deterministic code over persisted data. See [architecture.md](docs/architecture.md) for the full request-flow walkthrough and a Mermaid diagram.

```
Browser (React SPA)
   │
   ▼
Express API ── Use Case Service ──► LLMProvider (extracts signals only)
   │
   └── Assessment Service ──► Deterministic Scoring Engine
                                 ├─ Governance Rule Engine   (reads governance_rules — data, not code)
                                 ├─ Override Rule Engine      (reads override_rules)
                                 └─ Retrieval Service          (pgvector cosine search over source_chunks)
                                 │
                                 ▼
                         PostgreSQL 16 + pgvector
```

`use_cases` and `assessments` are separate REST resources and separate tables — structuring (LLM-touching, happens once) and scoring (deterministic, can happen many times, e.g. `POST /api/assessments/:id/run`) are genuinely different operations with different reproducibility guarantees.

### Backend layout

```
backend/src/
 ├── config/             # dimensions.ts, thresholds.json, sourceTypes.ts, tagToDimensions.ts, env.ts
 ├── controllers/        # request handlers
 ├── routes/             # Express routers
 ├── database/
 │    ├── migrations/    # 001_init.sql — Postgres + pgvector schema
 │    ├── pool.ts        # pg.Pool
 │    ├── seed.ts        # dimensions, curated sources (chunked+embedded), governance + override rules
 │    └── importSourcesCli.ts   # CLI wrapper for CSV source import
 ├── services/
 │    ├── useCase/        # use-case structuring orchestration
 │    ├── assessment/     # assessment orchestration
 │    ├── scoring/        # assessmentEngine.ts — the deterministic core
 │    ├── extraction/     # StructuredUseCase — the rule-evaluation context
 │    ├── rules/           # ruleEngine.ts — generic condition evaluator for data-driven rules
 │    ├── llm/             # LLMProvider abstraction: Anthropic / OpenAI / Local / Deterministic
 │    ├── embeddings/      # EmbeddingProvider abstraction, chunking, HashingEmbeddingProvider
 │    ├── retrieval/       # pgvector cosine-similarity evidence retrieval
 │    ├── research/        # regulatoryMapping.ts
 │    └── sources/         # csvParser.ts, sourceImportService.ts, sourceUpsert.ts (shared by seed + import)
 ├── repositories/        # Postgres data access: useCase, assessment, rules, dimensions, source
 ├── rules/               # authoritativeSources.ts (curated library), overrideRules.json
 ├── prompts/             # LLM extraction prompt + strict response parser/validator
 ├── middleware/          # auth.ts, auditLog.ts (request-id + structured logging), errorHandler.ts
 ├── utils/               # validation (zod)
 └── __tests__/           # Vitest + Supertest, run against a real Postgres test database
```

### Frontend layout

```
frontend/src/
 ├── pages/              # Dashboard, NewAssessment, AssessmentResults, Findings,
 │                       # Sources, History, Methodology, Settings
 ├── components/         # RiskBadge, DimensionChart (radar/bar), FindingCard,
 │                       # RegulatoryMappingTable, TriggeredRulesList, AuditTrailList, ui/*
 ├── lib/                # api client, settings (localStorage), risk color helpers
 ├── data/                # dimension + source-type metadata, sample use cases (for quick-start)
 └── types/               # TypeScript mirror of backend domain types
```

## 3. Setup Instructions

### Option A: Docker Compose (recommended)

```bash
cp .env.example .env    # optional — every value has a working default
docker compose up --build
```

This starts Postgres + pgvector (`pgvector/pgvector:pg16`), a one-shot `db-init` job that applies the schema and idempotent seed data, the backend API on `http://localhost:4000`, and the frontend on `http://localhost:5173`. `backend` waits for `db-init` to finish successfully before starting, so the API never serves against an unmigrated database.

> **Note on this repository's own build environment**: this project's Dockerfiles and `docker-compose.yml` were validated for correctness (`docker compose config`, and the exact `npm run build` / `node dist/server.js` / `vite build` steps each image runs) inside the sandbox this was developed in, but a full `docker compose up` could not be executed there because that sandbox blocks all container-registry traffic (Docker Hub, ghcr.io, mcr.microsoft.com all return `403 Forbidden` — the same class of restriction documented in [ai-and-rag.md](docs/ai-and-rag.md) for HuggingFace). Run `docker compose up --build` in a normal environment with registry access as the final verification step.

Open `http://localhost:5173`, go to **Settings**, and enter the `API_KEY` from your `.env` (default `changeme-local-dev-key`).

### Option B: Manual local setup

**Prerequisites**: Node.js 18+ (tested on Node 22), PostgreSQL 16 with the `pgvector` extension available.

```bash
# 1. Database
createdb ai_gov
cd backend
cp .env.example .env                 # edit DATABASE_URL etc. if needed
npm install
npm run db:migrate                   # applies the schema (requires psql on PATH)
npm run db:seed                      # seeds dimensions, 15 curated sources, 43 governance rules, 7 override rules

# 2. Backend
npm run dev                          # http://localhost:4000

# 3. Frontend (separate terminal)
cd ../frontend
npm install
npm run dev                          # http://localhost:5173
```

**LLM provider keys never reach the frontend** — they are read only by the backend process. With `LLM_PROVIDER=deterministic` (the default) the app runs a fully rule-based text extractor with zero external API keys or network calls. Setting `LLM_PROVIDER=local` and `LOCAL_LLM_URL` points the extraction step at any OpenAI-chat-completions-compatible local server (Ollama, LM Studio, vLLM) instead of a hosted vendor.

### Running tests

```bash
cd backend
npm test
```

56 unit + integration tests (Vitest + Supertest) run against a real Postgres test database (`ai_gov_test` by default, or `TEST_DATABASE_URL`) — nothing is mocked at the database layer.

### Production build (without Docker)

```bash
cd backend && npm run build && npm start
cd frontend && npm run build   # outputs static assets to frontend/dist
```

## 4. Assessment Methodology

Full detail, including the per-dimension rule mechanics and the override-rule floor layer: [docs/assessment-methodology.md](docs/assessment-methodology.md).

**The 10 governance dimensions** (0–5 each, 5 = highest risk): Data Governance, Privacy, Bias & Fairness, Human Oversight, Explainability, Security, Decision Impact, Regulatory Exposure, Model Risk, Monitoring.

```
Total Score      = sum of all 10 dimension scores
Maximum Score     = 50
Risk Percentage   = (Total Score / 50) × 100
```

| Range | Risk Level |
|---|---|
| 0–20% | Low |
| 21–40% | Moderate |
| 41–60% | Elevated |
| 61–80% | High |
| 81–100% | Critical |

Nine of the ten dimensions are scored as the sum of every matching **governance rule**'s `scoreDelta` (43 rules across those nine dimensions, stored in Postgres, evaluated by a generic condition interpreter — not hardcoded per-dimension functions). The tenth, Regulatory Exposure, is scored entirely by a separate regulation-mapping mechanism (see §4 of [assessment-methodology.md](docs/assessment-methodology.md)). Eight **override rules** (also data-driven) can raise the final classification above the threshold-derived level — never lower it.

## 5. AI Usage and RAG

Full detail: [docs/ai-and-rag.md](docs/ai-and-rag.md).

- An LLM (or the deterministic fallback) is called exactly once per use case, to extract structured signals — never to score.
- `LLMProvider`: `DeterministicProvider` (default) | `AnthropicProvider` | `OpenAIProvider` | `LocalLLMProvider`. Any configured provider degrades to the deterministic fallback on a missing key/URL or a failed live call, and the response's `extractionMethod` field always says which path was actually used.
- Evidence retrieval is real RAG: chunked source text is embedded and stored in a pgvector column, and matched against a query built from the use case + dimension via cosine similarity, filtered by a relevance threshold. The default embedding provider is a deterministic, dependency-free hashing vectorizer (built because this project's own development sandbox blocks HuggingFace model downloads — see the doc for the confirmed 403 and the documented upgrade path to a real neural embedding model).

## 6. Database

Full schema, ER diagram, and design rationale: [docs/database.md](docs/database.md). Every business table carries `tenant_id`; `use_cases` and `assessments` are separate tables so a use case can be re-scored many times without re-invoking the LLM; `governance_rules` and `override_rules` are data, not code.

## 7. Source Management & CSV Import

The curated source library (15 sources spanning all 6 classification tiers and multiple jurisdictions — see [docs/source-and-licence-inventory.md](docs/source-and-licence-inventory.md) for the full list and licensing posture of each) lives in `backend/src/rules/authoritativeSources.ts` and is loaded by `npm run db:seed`.

**New sources can be added by CSV, with no code change or redeploy**, two ways:

```bash
# Via the API (requires the bearer API key)
curl -X POST http://localhost:4000/api/sources/import \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: text/csv" \
  --data-binary @backend/samples/sources-import-example.csv

# Or via the CLI, against the database directly
cd backend
npm run sources:import -- samples/sources-import-example.csv
```

CSV columns: `id` (optional — slugified from `title` if blank), `title`, `url`, `publisher`, `sourceType` (one of the six classification labels), `jurisdiction`, `publicationDate` (optional, `YYYY-MM-DD`), `description`, `confidence` (optional: `high` or `needs-verification`), `tags` (optional, `;`- or `|`-separated — drives which governance dimensions the source is tagged relevant to, via the same mapping `db:seed` uses). Each row is validated independently: a CSV with 40 good rows and 2 typos imports the 40 and reports the 2, rather than failing the whole batch. See `backend/samples/sources-import-example.csv` for a working example, and `docs/source-and-licence-inventory.md` for what to check (particularly around commercially-licensed standards like ISO) before adding a new source.

## 8. API Endpoints

```
GET    /api/health

POST   /api/use-cases                   (requires Authorization: Bearer <API_KEY>) — structure a use case (LLM/deterministic extraction, persisted once)
GET    /api/use-cases
GET    /api/use-cases/:id

POST   /api/assessments                 (requires Authorization: Bearer <API_KEY>, body: {useCaseId}) — score a structured use case
GET    /api/assessments
GET    /api/assessments/:id
POST   /api/assessments/:id/run         (requires Authorization: Bearer <API_KEY>) — re-score from stored signals, no LLM call
GET    /api/assessments/:id/findings
GET    /api/assessments/:id/sources
GET    /api/assessments/:id/dimensions

GET    /api/sources                     (?sourceType=&jurisdiction=)
POST   /api/sources/import              (requires Authorization: Bearer <API_KEY>) — CSV source import, see §7

GET    /api/rules
GET    /api/methodology
```

## 9. Security

- `helmet` for secure HTTP headers, `zod` schema validation on every write endpoint, a 60 req/min rate limiter on `/api/*`, parameterized queries throughout (no raw SQL string interpolation).
- Simple bearer-token auth (`API_KEY`) gates write endpoints — appropriate for single-tenant local/demo use, not a substitute for real user authentication (the `users` table exists in the schema for exactly this future work; see [architecture.md](docs/architecture.md#multi-tenancy-and-auth-current-state-honestly-scoped)).
- **LLM provider keys never leave the backend process** — the frontend only ever sends its own lightweight app-level key, stored in `localStorage`, never baked into the built JS bundle.
- Every request gets a UUID, echoed as `X-Request-Id`, logged as structured JSON, and persisted to an `audit_logs` table — an incorrect result can be traced end-to-end from that id.
- Centralized error handling that never leaks stack traces to the client.

## 10. Testing

`backend/src/__tests__/` (Vitest + Supertest), 56 tests across 6 files, run against a real Postgres test database:

- `scoringEngine.test.ts` — overall score math, all 5 threshold boundaries, override-rule triggering (including "can only raise, never lower"), required-controls de-duplication, and full-pipeline tests across several use-case archetypes.
- `sourceClassification.test.ts` — every curated source has a valid `sourceType`, all 6 categories are represented, reliability tiers are ordered correctly, low-confidence sources default to `verified: false`.
- `regulatoryMapping.test.ts` — region/keyword matching, "never Applicable when region doesn't match," universally-relevant voluntary guidance still surfaces, every entry carries jurisdiction/conditions/source.
- `assessmentApi.test.ts` — full HTTP integration across the `use_cases`/`assessments` split: auth required, validation errors, structuring → scoring → re-run reproducibility, 404s, source-type filtering, methodology/rules endpoints.
- `csvSourceImport.test.ts` — CSV parsing/validation as a pure function: quoting/escaping, missing columns, invalid `sourceType`/`url`, duplicate ids, id slugification.
- `sourceImportApi.test.ts` — `POST /api/sources/import` integration: auth required, insert vs. update counting, chunk/embedding write-through, partial-batch error reporting, both raw `text/csv` and JSON `{csv}` bodies.

Run with `cd backend && npm test`.

## 11. Limitations (stated plainly)

- **`REGULATORY_EXPOSURE`'s keyword mapping is still financial-services-leaning** and has been observed to produce false-positive regulation matches (e.g. ECOA/FCRA) for clearly non-financial use cases. See [assessment-methodology.md](docs/assessment-methodology.md#regulatory-exposure--a-full-exception-documented-rather-than-hidden).
- **`tenant_id` is written everywhere but not yet enforced on every read path.** The schema and write paths are multi-tenant-ready; per-request tenant resolution/enforcement on reads is not yet implemented. See [architecture.md](docs/architecture.md#multi-tenancy-and-auth-current-state-honestly-scoped).
- **The default embedding provider is a deterministic hashing vectorizer, not a neural embedding model** — a lexical/statistical retrieval signal, not a semantic one. Built because this project's development sandbox blocks HuggingFace model downloads; documented upgrade path in [ai-and-rag.md](docs/ai-and-rag.md).
- **No `ivfflat`/HNSW index on `source_chunks.embedding` yet** — intentional at the current seed scale (a few dozen chunks); see [database.md](docs/database.md) for why and when to add one.
- **No migration-versioning tool** — one SQL file, applied via `psql -f`; a real multi-migration future needs a proper tool (e.g. `node-pg-migrate`).
- The frontend does not yet have dedicated "Use Case Details" or "Governance Rules" browsing pages (rule/methodology data is currently only exposed via the Methodology page and the API); this is active follow-up work, not done.
- This is a governance **research and assessment support tool**, not a compliance system of record, and does not constitute legal advice.

## 12. Future Improvements

- Dedicated frontend pages for browsing a use case's full structured extraction and for browsing/filtering the governance rule set directly (beyond the current Methodology summary).
- Industry-scoped regulatory mapping rules, the same way `governance_rules` are already industry-scoped via `industry_id`.
- Real user authentication/roles and enforced tenant isolation on read paths, building on the existing `users`/`tenant_id` schema.
- A proper migration-versioning tool once the schema needs to evolve past a single init script.
- Pluggable live web-search/research connectors feeding the curated-source pipeline, with a human-review queue before a new source is trusted.
- Assessment comparison/diff view and scheduled re-assessment on rules-version changes.
- Export assessment reports to PDF/DOCX for compliance filing.
