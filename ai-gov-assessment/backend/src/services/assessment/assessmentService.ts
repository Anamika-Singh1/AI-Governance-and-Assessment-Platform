import { AuditTrailEntry } from "../../types";
import { runLLMAssessment } from "./llmAssessment";
import { saveAssessment, getAssessmentById, listAssessments, getDimensionsForAssessment } from "../../repositories/assessmentRepository";
import { getUseCaseById } from "../../repositories/useCaseRepository";
import { StoredAssessment } from "../../repositories/types";
import { AppError } from "../../utils/validation";

/** Generate a fresh LLM assessment and persist its complete result and provenance. */
export async function runAssessment(useCaseId: string, userId?: string): Promise<StoredAssessment> {
  const useCase = await getUseCaseById(useCaseId, userId);
  if (!useCase) throw new AppError("Use case not found.", 404, "NOT_FOUND");

  const auditTrail: AuditTrailEntry[] = [];
  const ts = () => new Date().toISOString();

  auditTrail.push({ timestamp: ts(), step: "Assessment run started", detail: `Use case "${useCase.input.useCaseName}" (${useCase.id}) submitted for (re-)assessment.` });
  auditTrail.push({
    timestamp: ts(),
    step: "Assessment input loaded",
    detail: `Extraction method "${useCase.signals.extractionMethod}" from use-case creation time is reused; the LLM assesses the original use-case input on this run.`
  });

  const result = await runLLMAssessment(useCase.input, useCase.signals);

  auditTrail.push({
    timestamp: ts(),
    step: "LLM assessment",
    detail: `Scored all 10 governance dimensions. Overall score ${result.overallScore}/${result.maxScore} (${result.riskPercentage}%).`
  });

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
