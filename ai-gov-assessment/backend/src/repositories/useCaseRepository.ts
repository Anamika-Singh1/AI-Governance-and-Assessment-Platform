import { pgPool } from "../database/pool";
import { UseCaseInput, ExtractedSignals } from "../types";
import { buildStructuredUseCase, StructuredUseCase } from "../services/extraction/structuredExtraction";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StoredUseCase {
  id: string;
  input: UseCaseInput;
  signals: ExtractedSignals;
  structured: StructuredUseCase;
  createdAt: string;
  updatedAt: string;
}

function rowToStoredUseCase(uc: any): StoredUseCase {
  return {
    id: uc.id,
    input: {
      useCaseName: uc.name,
      description: uc.description,
      industry: uc.industry_label,
      intendedUsers: uc.intended_users,
      dataUsed: uc.data_used,
      purpose: uc.purpose,
      affectedParties: uc.affected_people,
      decisionType: uc.decision_type,
      humanReview: uc.human_review,
      region: uc.region
    },
    signals: uc.raw_signals,
    structured: uc.extracted_json,
    createdAt: uc.created_at.toISOString(),
    updatedAt: uc.updated_at.toISOString()
  };
}

/**
 * Persists the "Use Case Structuring" step of the pipeline (User Input
 * -> Validation -> Use Case Structuring) as its own row, independent of
 * any assessment run. Extraction (LLM or deterministic fallback) only
 * happens HERE, once — a later assessment run, or re-run after a rules
 * change, reuses the stored signals rather than calling the LLM again,
 * which is both cheaper and what keeps re-scoring reproducible even
 * when LLM_PROVIDER is a live, non-deterministic model.
 */
export async function createUseCase(input: UseCaseInput, signals: ExtractedSignals): Promise<StoredUseCase> {
  const structured = buildStructuredUseCase(input, signals);
  const res = await pgPool.query(
    `INSERT INTO use_cases (tenant_id, name, description, industry_label, intended_users, purpose, data_used,
       affected_people, decision_type, human_review, region, extracted_json, raw_signals, extraction_method)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      DEFAULT_TENANT_ID,
      input.useCaseName,
      input.description,
      input.industry,
      input.intendedUsers,
      input.purpose,
      input.dataUsed,
      input.affectedParties,
      input.decisionType,
      input.humanReview,
      input.region,
      JSON.stringify(structured),
      JSON.stringify(signals),
      signals.extractionMethod
    ]
  );
  return rowToStoredUseCase(res.rows[0]);
}

export async function getUseCaseById(id: string): Promise<StoredUseCase | null> {
  if (!UUID_RE.test(id)) return null;
  const res = await pgPool.query(`SELECT * FROM use_cases WHERE id = $1`, [id]);
  return res.rows[0] ? rowToStoredUseCase(res.rows[0]) : null;
}

export interface UseCaseListItem {
  id: string;
  useCaseName: string;
  industry: string;
  region: string;
  decisionType: string;
  createdAt: string;
  assessmentCount: number;
  latestRiskLevel: string | null;
}

export async function listUseCases(limit = 50, offset = 0): Promise<{ items: UseCaseListItem[]; total: number }> {
  const [rowsRes, countRes] = await Promise.all([
    pgPool.query(
      `SELECT uc.id, uc.name, uc.industry_label, uc.region, uc.decision_type, uc.created_at,
              COUNT(a.id)::int AS assessment_count,
              (SELECT risk_level FROM assessments WHERE use_case_id = uc.id ORDER BY created_at DESC LIMIT 1) AS latest_risk_level
       FROM use_cases uc
       LEFT JOIN assessments a ON a.use_case_id = uc.id
       GROUP BY uc.id
       ORDER BY uc.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    pgPool.query(`SELECT COUNT(*)::int AS total FROM use_cases`)
  ]);

  return {
    items: rowsRes.rows.map((r) => ({
      id: r.id,
      useCaseName: r.name,
      industry: r.industry_label,
      region: r.region,
      decisionType: r.decision_type,
      createdAt: r.created_at.toISOString(),
      assessmentCount: r.assessment_count,
      latestRiskLevel: r.latest_risk_level
    })),
    total: countRes.rows[0].total
  };
}
