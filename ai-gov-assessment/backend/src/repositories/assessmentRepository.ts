import { pgPool } from "../database/pool";
import { AssessmentResult, AuditTrailEntry } from "../types";
import { AssessmentListItem, StoredAssessment, StoredDimension } from "./types";
import { computeRegulatoryMapping } from "../services/research/regulatoryMapping";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function hasSourceChunksTable(): Promise<boolean> {
  const result = await pgPool.query("SELECT to_regclass('public.source_chunks') AS table_name");
  return Boolean(result.rows[0]?.table_name);
}

/**
 * Persists an assessment RUN against an ALREADY-EXISTING use case
 * (created separately via useCaseRepository.createUseCase — see
 * POST /api/use-cases). A use case can have many assessment rows over
 * time: the first run, and any later re-run after a rules-version
 * change, without re-extracting or re-creating the use case itself.
 */
export async function saveAssessment(
  useCaseId: string,
  result: AssessmentResult,
  auditTrail: AuditTrailEntry[]
): Promise<StoredAssessment> {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const sourceChunksAvailable = await hasSourceChunksTable();

    const asRes = await client.query(
      `INSERT INTO assessments (tenant_id, use_case_id, overall_score, max_score, risk_percentage, risk_level,
         impact_level, required_human_oversight, extraction_method, rules_version, engine_version,
         llm_provider_used, triggered_override_rules, audit_trail, result_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, created_at`,
      [
        DEFAULT_TENANT_ID,
        useCaseId,
        result.overallScore,
        result.maxScore,
        result.riskPercentage,
        result.riskLevel,
        result.impactLevel,
        result.requiredHumanOversight,
        result.extractionMethod,
        result.rulesVersion,
        result.assessmentEngineVersion,
        result.llmProviderUsed,
        JSON.stringify(result.triggeredRules),
        JSON.stringify(auditTrail),
        JSON.stringify(result)
      ]
    );
    const assessmentId = asRes.rows[0].id;

    for (const d of result.dimensionAssessments) {
      const dimRes = await client.query(
        `INSERT INTO assessment_dimensions (assessment_id, dimension_key, score, risk_level, explanation, evidence_summary, recommended_controls)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [assessmentId, d.dimension, d.score, d.riskFactors.length ? "see-score" : "see-score", d.reasoning, JSON.stringify(d.evidence), JSON.stringify(d.recommendedControls)]
      );
      const assessmentDimensionId = dimRes.rows[0].id;

      for (const control of d.recommendedControls) {
        await client.query(
          `INSERT INTO recommendations (assessment_dimension_id, text, rationale) VALUES ($1,$2,$3)`,
          [assessmentDimensionId, control, d.reasoning]
        );
      }
      // Evidence rows link back to the retrieved source_chunks captured in sourceIds;
      // relevance score isn't preserved at this call site (see retrievalService for the
      // live similarity score at retrieval time) — this join exists primarily so future
      // queries can trace "which chunk(s) grounded this dimension's score."
      if (sourceChunksAvailable) {
        for (const sourceId of d.sourceIds) {
          const chunk = await client.query(`SELECT id FROM source_chunks WHERE source_id = $1 ORDER BY chunk_index LIMIT 1`, [sourceId]);
          if (chunk.rows[0]) {
            await client.query(
              `INSERT INTO evidence (assessment_dimension_id, source_chunk_id, relevance_score) VALUES ($1,$2,$3)`,
              [assessmentDimensionId, chunk.rows[0].id, 0]
            );
          }
        }
      }
    }

    await client.query("COMMIT");

    const stored = await getAssessmentById(useCaseId);
    if (!stored) throw new Error("Assessment save succeeded but could not be re-read — this should never happen.");
    return stored;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function loadLatestAssessment(useCaseId: string): Promise<{ assessmentId: string; row: any } | null> {
  const res = await pgPool.query(
    `SELECT * FROM assessments WHERE use_case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [useCaseId]
  );
  if (!res.rows[0]) return null;
  return { assessmentId: res.rows[0].id, row: res.rows[0] };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAssessmentById(useCaseId: string, userId?: string): Promise<StoredAssessment | null> {
  // An id that isn't even a well-formed UUID can never match a row —
  // return "not found" rather than letting Postgres reject the query
  // with a type error (22P02), which the error middleware would
  // otherwise surface as a 500 instead of a clean 404.
  if (!UUID_RE.test(useCaseId)) return null;

  const ucRes = await pgPool.query(`SELECT * FROM use_cases WHERE id = $1 AND ($2::uuid IS NULL OR created_by = $2)`, [useCaseId, userId || null]);
  if (!ucRes.rows[0]) return null;
  const uc = ucRes.rows[0];

  const latest = await loadLatestAssessment(useCaseId);
  if (!latest) return null;
  const a = latest.row;

  if (a.result_snapshot) {
    return {
      ...a.result_snapshot,
      useCaseId: uc.id, useCaseName: uc.name, description: uc.description,
      industry: uc.industry_label, intendedUsers: uc.intended_users, dataUsed: uc.data_used,
      purpose: uc.purpose, affectedParties: uc.affected_people, decisionType: uc.decision_type,
      humanReview: uc.human_review, region: uc.region,
      auditTrail: a.audit_trail, createdAt: uc.created_at.toISOString(), updatedAt: a.created_at.toISOString()
    };
  }

  const sourceChunksAvailable = await hasSourceChunksTable();
  const dimRes = await pgPool.query(
    sourceChunksAvailable
      ? `SELECT ad.*, array_remove(array_agg(DISTINCT sc.source_id), NULL) AS source_ids
         FROM assessment_dimensions ad
         LEFT JOIN evidence ev ON ev.assessment_dimension_id = ad.id
         LEFT JOIN source_chunks sc ON sc.id = ev.source_chunk_id
         WHERE ad.assessment_id = $1
         GROUP BY ad.id`
      : `SELECT ad.*, ARRAY[]::text[] AS source_ids
         FROM assessment_dimensions ad
         WHERE ad.assessment_id = $1`,
    [latest.assessmentId]
  );

  const dimensionAssessments = dimRes.rows.map((d) => ({
    dimension: d.dimension_key,
    score: d.score,
    reasoning: d.explanation,
    evidence: d.evidence_summary,
    riskFactors: d.evidence_summary,
    recommendedControls: d.recommended_controls,
    sourceIds: d.source_ids || []
  }));

  // Regulatory mapping is deterministic and cheap (keyword + region match
  // against a fixed rule set) so it's recomputed on read rather than
  // denormalized into a column — always reflects the current rule set,
  // never a stale snapshot from whenever the assessment was first run.
  const regulatoryMapping = computeRegulatoryMapping({
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
  });

  const allSourceIds = Array.from(new Set(dimensionAssessments.flatMap((d) => d.sourceIds)));
  const findings = dimensionAssessments.map((d) => ({
    dimension: d.dimension,
    severity: d.score <= 1 ? "Low" : d.score === 2 ? "Moderate" : d.score === 3 ? "Elevated" : d.score === 4 ? "High" : "Critical",
    score: d.score,
    explanation: d.reasoning,
    evidence: d.evidence,
    sourceIds: d.sourceIds,
    recommendedMitigation: d.recommendedControls
  }));

  return {
    useCaseId: uc.id,
    useCaseName: uc.name,
    description: uc.description,
    industry: uc.industry_label,
    intendedUsers: uc.intended_users,
    dataUsed: uc.data_used,
    purpose: uc.purpose,
    affectedParties: uc.affected_people,
    decisionType: uc.decision_type,
    humanReview: uc.human_review,
    region: uc.region,
    overallScore: a.overall_score,
    maxScore: a.max_score,
    riskPercentage: Number(a.risk_percentage),
    riskLevel: a.risk_level,
    impactLevel: a.impact_level,
    dimensionAssessments: dimensionAssessments as any,
    triggeredRules: a.triggered_override_rules,
    regulatoryMapping,
    findings: findings as any,
    requiredControls: Array.from(new Set(dimensionAssessments.flatMap((d) => d.recommendedControls))),
    criticalAreas: dimensionAssessments.filter((d) => d.score >= 4).map((d) => d.dimension) as any,
    requiredHumanOversight: a.required_human_oversight,
    sourceIds: allSourceIds,
    extractionMethod: a.extraction_method,
    rulesVersion: a.rules_version,
    assessmentEngineVersion: a.engine_version,
    llmProviderUsed: a.llm_provider_used,
    auditTrail: a.audit_trail,
    createdAt: uc.created_at.toISOString(),
    updatedAt: a.created_at.toISOString()
  };
}

export async function listAssessments(userId?: string): Promise<AssessmentListItem[]> {
  const res = await pgPool.query(
    `SELECT DISTINCT ON (uc.id) uc.id AS use_case_id, uc.name, uc.industry_label, uc.region, a.overall_score, a.risk_level, a.risk_percentage, a.created_at
     FROM use_cases uc
     JOIN assessments a ON a.use_case_id = uc.id
     WHERE ($1::uuid IS NULL OR uc.created_by = $1)
     ORDER BY uc.id, a.created_at DESC`
    , [userId || null]
  );
  // Re-sort by most recent first (the DISTINCT ON above requires ordering by uc.id first)
  const rows = [...res.rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return rows.map((r) => ({
    useCaseId: r.use_case_id,
    useCaseName: r.name,
    industry: r.industry_label,
    region: r.region,
    overallScore: r.overall_score,
    riskLevel: r.risk_level,
    riskPercentage: Number(r.risk_percentage),
    createdAt: r.created_at.toISOString()
  }));
}

export async function getDimensionsForAssessment(useCaseId: string): Promise<StoredDimension[]> {
  const latest = await loadLatestAssessment(useCaseId);
  if (!latest) return [];
  if (latest.row.result_snapshot) {
    return latest.row.result_snapshot.dimensionAssessments.map((d: StoredDimension) => ({
      ...d, assessmentId: useCaseId, createdAt: latest.row.created_at.toISOString()
    }));
  }
  const dimRes = await pgPool.query(
    `SELECT * FROM assessment_dimensions WHERE assessment_id = $1`,
    [latest.assessmentId]
  );
  return dimRes.rows.map((d) => ({
    dimension: d.dimension_key,
    score: d.score,
    reasoning: d.explanation,
    evidence: d.evidence_summary,
    riskFactors: d.evidence_summary,
    recommendedControls: d.recommended_controls,
    sourceIds: [],
    assessmentId: useCaseId,
    createdAt: latest.row.created_at.toISOString()
  })) as any;
}
