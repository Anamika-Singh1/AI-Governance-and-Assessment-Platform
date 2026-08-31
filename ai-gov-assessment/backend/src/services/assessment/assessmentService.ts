import { AuditTrailEntry } from "../../types";
import { runDeterministicAssessment } from "../scoring/assessmentEngine";
import { saveAssessment, getAssessmentById, listAssessments, getDimensionsForAssessment } from "../../repositories/assessmentRepository";
import { getUseCaseById } from "../../repositories/useCaseRepository";
import { StoredAssessment } from "../../repositories/types";
import { AppError } from "../../utils/validation";

/**
 * Orchestrates the assessment-run pipeline (Section 17) against an
 * ALREADY-CREATED use case:
 *   Load stored use case + stored extraction signals
 *              -> Deterministic Governance Dimension Scoring
 *              -> Override Rules -> Risk Classification
 *              -> Recommended Controls -> Audit Record -> Persistence
 *
 * No LLM call happens here — extraction ("Use Case Structuring") only
 * ever happens once, at POST /api/use-cases. Running this again for the
 * same use case (e.g. after a governance-rules change) re-scores the
 * SAME stored signals, which is what keeps re-runs reproducible even
 * when LLM_PROVIDER is a live, non-deterministic model.
 */
export async function runAssessment(useCaseId: string): Promise<StoredAssessment> {
  const useCase = await getUseCaseById(useCaseId);
  if (!useCase) throw new AppError("Use case not found.", 404, "NOT_FOUND");

  const auditTrail: AuditTrailEntry[] = [];
  const ts = () => new Date().toISOString();

  auditTrail.push({ timestamp: ts(), step: "Assessment run started", detail: `Use case "${useCase.input.useCaseName}" (${useCase.id}) submitted for (re-)assessment.` });
  auditTrail.push({
    timestamp: ts(),
    step: "Reusing stored extraction",
    detail: `Extraction method "${useCase.signals.extractionMethod}" from use-case creation time is reused — no LLM call on this run.`
  });

  const result = await runDeterministicAssessment(useCase.input, useCase.signals);

  auditTrail.push({
    timestamp: ts(),
    step: "Deterministic scoring",
    detail: `Scored all 10 governance dimensions. Overall score ${result.overallScore}/${result.maxScore} (${result.riskPercentage}%).`
  });

  if (result.triggeredRules.length > 0) {
    auditTrail.push({
      timestamp: ts(),
      step: "Override rules evaluated",
      detail: `${result.triggeredRules.length} rule(s) triggered: ${result.triggeredRules.map((r) => r.ruleId).join(", ")}.`
    });
  } else {
    auditTrail.push({ timestamp: ts(), step: "Override rules evaluated", detail: "No override rules were triggered." });
  }

  auditTrail.push({
    timestamp: ts(),
    step: "Final classification",
    detail: `Risk level determined: ${result.riskLevel} (${result.impactLevel}). Rules version ${result.rulesVersion}, engine version ${result.assessmentEngineVersion}.`
  });

  const stored = await saveAssessment(useCaseId, result, auditTrail);

  auditTrail.push({ timestamp: ts(), step: "Persisted", detail: `Assessment stored for use case ${useCaseId}.` });

  return stored;
}

export { getAssessmentById, listAssessments, getDimensionsForAssessment };
