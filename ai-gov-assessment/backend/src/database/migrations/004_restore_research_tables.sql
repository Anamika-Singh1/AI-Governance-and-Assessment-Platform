-- Repair installations created without the research tables.
CREATE TABLE IF NOT EXISTS source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  dimension_tags JSONB NOT NULL DEFAULT '[]',
  embedding DOUBLE PRECISION[],
  UNIQUE (source_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_dimension_id UUID NOT NULL REFERENCES assessment_dimensions(id) ON DELETE CASCADE,
  source_chunk_id UUID NOT NULL REFERENCES source_chunks(id),
  relevance_score NUMERIC(5,4) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_dimension ON evidence (assessment_dimension_id);
