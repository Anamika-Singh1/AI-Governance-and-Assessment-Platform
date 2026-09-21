-- Preserve model judgments, citations and recommendations exactly as generated.
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS result_snapshot JSONB;
