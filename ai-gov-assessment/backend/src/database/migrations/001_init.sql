-- AI Governance Assessment Platform — initial schema
-- PostgreSQL 16 + pgvector. Normalized, tenant-scoped, indexed for pagination.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- tenants: logical isolation boundary. Every business table below
-- carries tenant_id so a new customer can be onboarded as a data row,
-- never a code change.
-- ---------------------------------------------------------------------
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- users: auth-ready even though the MVP demo runs on a single shared
-- bearer key. Having the table now means adding real login later is a
-- feature, not a migration.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'ASSESSOR' CHECK (role IN ('ADMIN','ASSESSOR','REVIEWER','VIEWER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email));

-- ---------------------------------------------------------------------
-- industries: lets new industries (Healthcare, Insurance, Employment,
-- ...) be added as data. dimensions and rules both reference this so
-- the same engine works across industries without redesign.
-- ---------------------------------------------------------------------
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

-- ---------------------------------------------------------------------
-- dimensions: the ten (or more, later) governance dimensions, stored
-- as data rather than hard-coded in frontend/backend source, per the
-- explicit requirement "do not hard-code these only in frontend code."
-- ---------------------------------------------------------------------
CREATE TABLE dimensions (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  short_label TEXT NOT NULL,
  description TEXT NOT NULL,
  evaluation_criteria JSONB NOT NULL DEFAULT '[]',
  recommended_controls JSONB NOT NULL DEFAULT '[]',
  max_score INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- use_cases: the structured, extracted representation of a submitted
-- AI use case. Independent of any particular assessment run so a use
-- case can be re-assessed over time (new rules version, re-run).
-- ---------------------------------------------------------------------
CREATE TABLE use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_id UUID REFERENCES industries(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  industry_label TEXT NOT NULL DEFAULT 'Financial Services / Banking',
  intended_users TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL,
  data_used TEXT NOT NULL,
  affected_people TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  human_review BOOLEAN NOT NULL DEFAULT true,
  region TEXT NOT NULL DEFAULT 'Global',
  extracted_json JSONB NOT NULL DEFAULT '{}', -- StructuredUseCase: the rule-evaluation context
  raw_signals JSONB NOT NULL DEFAULT '{}', -- ExtractedSignals as returned by the LLM/deterministic provider at creation time — reused on every re-run so re-scoring never re-calls the LLM and stays reproducible
  extraction_method TEXT NOT NULL DEFAULT 'deterministic',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_use_cases_tenant_industry ON use_cases (tenant_id, industry_id);
CREATE INDEX idx_use_cases_tenant_created ON use_cases (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- governance_rules: rules as DATA, not code. Conditions are evaluated
-- against a use case's extracted_json; scoreDelta is additive to the
-- named dimension. This is what makes the rule engine "configurable"
-- in the literal sense the assignment asks for.
-- ---------------------------------------------------------------------
CREATE TABLE governance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_id UUID REFERENCES industries(id), -- NULL = applies to all industries
  dimension_key TEXT NOT NULL REFERENCES dimensions(key),
  name TEXT NOT NULL,
  conditions_json JSONB NOT NULL, -- [{field, op, value}, ...] all must match
  score_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rules_tenant_industry_dim ON governance_rules (tenant_id, industry_id, dimension_key) WHERE active;

-- ---------------------------------------------------------------------
-- override_rules: the cross-dimension floor layer (Section 19 of the
-- original build) — can only raise the FINAL risk classification,
-- never lower it. Kept distinct from governance_rules because it
-- operates on computed dimension scores, not raw use-case fields.
-- ---------------------------------------------------------------------
CREATE TABLE override_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions_json JSONB NOT NULL,
  min_risk_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  version TEXT NOT NULL DEFAULT '1.0'
);

-- ---------------------------------------------------------------------
-- assessments: one row per assessment RUN. A use case can have many
-- (re-runs after rule changes, periodic re-assessment).
-- ---------------------------------------------------------------------
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  use_case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  risk_percentage NUMERIC(5,1) NOT NULL,
  risk_level TEXT NOT NULL,
  impact_level TEXT NOT NULL,
  required_human_oversight TEXT NOT NULL,
  extraction_method TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  llm_provider_used TEXT NOT NULL,
  triggered_override_rules JSONB NOT NULL DEFAULT '[]',
  audit_trail JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessments_use_case ON assessments (use_case_id, created_at DESC);
CREATE INDEX idx_assessments_tenant_created ON assessments (tenant_id, created_at DESC);

-- ---------------------------------------------------------------------
-- assessment_dimensions: one row per governance dimension per
-- assessment. This is the "dimension card" the UI renders directly.
-- ---------------------------------------------------------------------
CREATE TABLE assessment_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  dimension_key TEXT NOT NULL REFERENCES dimensions(key),
  score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  explanation TEXT NOT NULL,
  ai_explanation TEXT,
  evidence_summary JSONB NOT NULL DEFAULT '[]',
  applied_rule_ids JSONB NOT NULL DEFAULT '[]',
  recommended_controls JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_assessment_dimensions_assessment ON assessment_dimensions (assessment_id);

-- ---------------------------------------------------------------------
-- sources: the registry. source_type is the six-way classification;
-- authority_level is the numeric reliability tier used to resolve
-- conflicts (lower tier wins). content_hash lets ingestion detect
-- when a source has changed since last verified.
-- ---------------------------------------------------------------------
CREATE TABLE sources (
  id TEXT PRIMARY KEY, -- human-readable slug, e.g. 'eu-ai-act'
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'LAW_REGULATION','REGULATORY_GUIDANCE','INDUSTRY_STANDARD',
    'RESEARCH','VENDOR_INFORMATION','GENERAL_WEB_CONTENT'
  )),
  jurisdiction TEXT NOT NULL,
  publication_date DATE,
  effective_date DATE,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL DEFAULT '1',
  authority_level INTEGER NOT NULL, -- 1 (highest) .. 6 (lowest)
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'verified', -- verified | unverified
  description TEXT
);
CREATE INDEX idx_sources_type ON sources (source_type);
CREATE INDEX idx_sources_jurisdiction ON sources (jurisdiction);

-- ---------------------------------------------------------------------
-- source_chunks: the retrieval unit. embedding is a pgvector column —
-- 256 dims to match the deterministic hashing-vectorizer's output
-- (see backend/src/services/embeddings). Swapping in a neural model
-- later means changing the dimension here and re-embedding, nothing
-- else in the schema.
-- ---------------------------------------------------------------------
CREATE TABLE source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  dimension_tags JSONB NOT NULL DEFAULT '[]', -- which governance dimensions this chunk is relevant to
  embedding DOUBLE PRECISION[],
  UNIQUE (source_id, chunk_index)
);
-- No ANN index at seed scale (a few dozen chunks): an ivfflat index needs
-- roughly sqrt(row_count) lists to have non-empty clusters, and with too
-- few rows per list a probe can land on an empty cluster and return ZERO
-- matches even though a full scan of 15 rows is both correct and fast
-- (confirmed by hand: adding `lists = 50` over 15 rows silently returned
-- 0 results for every query). Add it back once source_chunks is in the
-- thousands: CREATE INDEX ... USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = <sqrt(row_count)>); or switch to HNSW, which degrades
-- more gracefully at small scale.

-- ---------------------------------------------------------------------
-- evidence: join table linking a scored dimension to the retrieved
-- chunk(s) that justified it, with the similarity score that surfaced
-- it. This is what lets the UI show "why this source, how relevant."
-- ---------------------------------------------------------------------
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_dimension_id UUID NOT NULL REFERENCES assessment_dimensions(id) ON DELETE CASCADE,
  source_chunk_id UUID NOT NULL REFERENCES source_chunks(id),
  relevance_score NUMERIC(5,4) NOT NULL
);
CREATE INDEX idx_evidence_dimension ON evidence (assessment_dimension_id);

-- ---------------------------------------------------------------------
-- recommendations: generated per dimension, tied back to the rules/
-- evidence that produced them (never a random generic string).
-- ---------------------------------------------------------------------
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_dimension_id UUID NOT NULL REFERENCES assessment_dimensions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  rationale TEXT NOT NULL
);
CREATE INDEX idx_recommendations_dimension ON recommendations (assessment_dimension_id);

-- ---------------------------------------------------------------------
-- audit_logs: every state-changing action, queryable by request_id so
-- an incorrect recommendation can be traced end-to-end after the fact.
-- ---------------------------------------------------------------------
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  request_id TEXT,
  assessment_id UUID,
  actor TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  detail_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_request ON audit_logs (request_id);
