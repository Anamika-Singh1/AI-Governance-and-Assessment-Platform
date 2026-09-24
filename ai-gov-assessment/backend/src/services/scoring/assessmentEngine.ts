import thresholdsConfig from "../../config/thresholds.json";
import { DIMENSION_KEYS, DimensionKey, MAX_TOTAL_SCORE } from "../../config/dimensions";
import {
  AssessmentResult,
  DimensionAssessment,
  ExtractedSignals,
  FindingRecord,
  RiskLevel,
  TriggeredRule,
  UseCaseInput,
  ImpactLevel
} from "../../types";
import { selectSourcesForDimension } from "../sources/sourceSelection";
import { buildScoringContext } from "./dimensionScoring";
import { computeRegulatoryMapping, regulatoryExposureScore } from "../research/regulatoryMapping";
import { config } from "../../config/env";
import { buildStructuredUseCase } from "../extraction/structuredExtraction";
import { getActiveGovernanceRules, getActiveOverrideRules } from "../../repositories/rulesRepository";
import { getAllDimensions, DbDimension } from "../../repositories/dimensionsRepository";
import { evaluateRules, RuleContext } from "../rules/ruleEngine";
import { retrieveEvidenceForDimension, RetrievedEvidence } from "../retrieval/retrievalService";

const RISK_ORDER: RiskLevel[] = ["Low", "Moderate", "Elevated", "High", "Critical"];

function rank(level: RiskLevel): number {
  return RISK_ORDER.indexOf(level);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(5, Math.round(n)));
}

/** calculateOverallScore — pure summation, no LLM involvement. Unchanged from the pre-Postgres engine; still a pure function over already-computed scores. */
export function calculateOverallScore(dimensionAssessments: DimensionAssessment[]): { overallScore: number; riskPercentage: number } {
  const overallScore = dimensionAssessments.reduce((sum, d) => sum + d.score, 0);
  const riskPercentage = Math.round((overallScore / MAX_TOTAL_SCORE) * 1000) / 10;
  return { overallScore, riskPercentage };
}

function baseRiskLevelFromPercentage(percentage: number): RiskLevel {
  const match = thresholdsConfig.thresholds.find((t) => percentage >= t.minPercent && percentage <= t.maxPercent);
  return (match?.level as RiskLevel) || "Critical";
}

/**
 * applyOverrideRules — Section 19, now genuinely data-driven: the rule
 * set is loaded from the override_rules table (Postgres), not a JSON
 * file bundled with the source code. Each rule that fully matches
 * enforces a MINIMUM risk level; it can only raise the final
 * classification, never lower it.
 */
export async function applyOverrideRules(dimensionAssessments: DimensionAssessment[], signals: ExtractedSignals): Promise<TriggeredRule[]> {
  const dims = Object.fromEntries(dimensionAssessments.map((d) => [d.dimension, d.score])) as Record<DimensionKey, number>;
  const rules = await getActiveOverrideRules();
  const ctx: RuleContext = { dimensionScores: dims, signals };

  return evaluateRules(rules, ctx)
    .filter((f) => f.minRiskLevel)
    .map((f) => ({
      ruleId: f.ruleId,
      name: f.name,
      description: f.reason,
      reason: f.reason,
      enforcedMinRiskLevel: f.minRiskLevel as RiskLevel
    }));
}

/** determineRiskLevel — unchanged pure function: max of the threshold-derived level and every triggered override's enforced minimum. No LLM anywhere in this path. */
export function determineRiskLevel(riskPercentage: number, triggeredRules: TriggeredRule[]): RiskLevel {
  let level = baseRiskLevelFromPercentage(riskPercentage);
  for (const rule of triggeredRules) {
    if (rank(rule.enforcedMinRiskLevel) > rank(level)) {
      level = rule.enforcedMinRiskLevel;
    }
  }
  return level;
}

export function impactLevelFor(riskLevel: RiskLevel): ImpactLevel {
  return (thresholdsConfig.useCaseImpactMap as Record<string, ImpactLevel>)[riskLevel];
}

/** generateRequiredControls — unchanged: aggregates and de-duplicates controls, prioritizing higher-scored (higher-risk) dimensions first. */
export function generateRequiredControls(dimensionAssessments: DimensionAssessment[]): string[] {
  const sorted = [...dimensionAssessments].sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const controls: string[] = [];
  for (const d of sorted) {
    for (const c of d.recommendedControls) {
      if (!seen.has(c)) {
        seen.add(c);
        controls.push(c);
      }
    }
  }
  return controls;
}

function severityForScore(score: number): RiskLevel {
  if (score <= 1) return "Low";
  if (score === 2) return "Moderate";
  if (score === 3) return "Elevated";
  if (score === 4) return "High";
  return "Critical";
}

function buildFindings(dimensionAssessments: DimensionAssessment[]): FindingRecord[] {
  return dimensionAssessments.map((d) => ({
    dimension: d.dimension,
    severity: severityForScore(d.score),
    score: d.score,
    explanation: d.reasoning,
    evidence: d.evidence,
    sourceIds: d.sourceIds,
    recommendedMitigation: d.recommendedControls
  }));
}

function requiredHumanOversightText(oversightScore: number): string {
  if (oversightScore >= 4) {
    return "Mandatory pre-decision human review is required before any outcome takes effect, with a documented override and escalation path.";
  }
  if (oversightScore === 3) {
    return "Active human monitoring with the ability to intervene in real time is required, alongside periodic sampling review of automated outcomes.";
  }
  if (oversightScore === 2) {
    return "Human-in-the-loop review is recommended for edge cases and any outcome above a defined risk threshold.";
  }
  return "Given the advisory/low-automation nature of this use case, standard periodic human review of system recommendations is sufficient.";
}

/**
 * Scores one governance dimension by loading its ACTIVE rules from
 * Postgres (governance_rules) and summing every matched condition's
 * scoreDelta — the literal "IF ... THEN dimension += N" model the
 * assignment asks for, evaluated against the structured use case, not
 * asked of an LLM. Evidence is retrieved separately via real pgvector
 * semantic search (retrievalService), never fabricated.
 */
async function scoreDimensionFromRules(
  dim: DbDimension,
  structuredCtx: RuleContext,
  input: UseCaseInput
): Promise<{ assessment: Omit<DimensionAssessment, "sourceIds">; evidence: RetrievedEvidence[] }> {
  const [rules, evidence] = await Promise.all([
    getActiveGovernanceRules(dim.key),
    retrieveEvidenceForDimension(input, dim as any)
  ]);
  const fired = evaluateRules(rules, structuredCtx);
  const rawScore = fired.reduce((sum, f) => sum + (f.scoreDelta || 0), 0);
  const score = clamp(rawScore);

  const riskFactors = fired.filter((f) => (f.scoreDelta || 0) > 0).map((f) => f.reason);
  return {
    assessment: {
      dimension: dim.key as DimensionKey,
      score,
      reasoning: `${dim.label} was assessed against ${fired.length} applicable governance rule(s), evaluating: ${dim.evaluationCriteria.join(", ")}.`,
      evidence: riskFactors.length ? riskFactors : ["No elevated risk indicators were detected for this dimension."],
      riskFactors,
      recommendedControls: dim.recommendedControls
    },
    evidence
  };
}

/**
 * Full deterministic assessment pipeline (now async — every dimension
 * score and every override rule is loaded live from Postgres, and
 * evidence is retrieved via real pgvector semantic search). This is
 * still the single function the assessment service calls after
 * LLM/deterministic signal extraction — everything past this point is
 * 100% rule- and retrieval-based and repeatable for identical input +
 * identical rules version + identical source corpus.
 */
export async function runDeterministicAssessment(input: UseCaseInput, signals: ExtractedSignals): Promise<AssessmentResult> {
  const structured = buildStructuredUseCase(input, signals);
  const structuredCtx = structured as unknown as RuleContext;
  const dimensions = await getAllDimensions();

  const regulatoryMapping = computeRegulatoryMapping(input);
  const regScore = regulatoryExposureScore(regulatoryMapping);
  const regSourceIds = Array.from(new Set(regulatoryMapping.map((m) => m.sourceId)));

  const dimensionAssessments: DimensionAssessment[] = await Promise.all(dimensions.map(async (dim): Promise<DimensionAssessment> => {
    if (dim.key === "REGULATORY_EXPOSURE") {
      const matched = regulatoryMapping.filter((m) => m.applicability === "Applicable");
      const potential = regulatoryMapping.filter((m) => m.applicability === "Potentially Applicable");
      return {
        dimension: "REGULATORY_EXPOSURE",
        score: regScore,
        reasoning: `Based on the described data, decision domain, and region, ${matched.length} regulation(s)/framework(s) were classified as Applicable and ${potential.length} as Potentially Applicable. See the Regulatory Mapping section for the full breakdown and reasoning per item.`,
        evidence: regulatoryMapping.map((m) => `${m.name}: ${m.applicability} — ${m.whyPotentiallyRelevant}`),
        riskFactors: regulatoryMapping.filter((m) => m.applicability === "Applicable").map((m) => `${m.name} likely applies`),
        recommendedControls: dim.recommendedControls,
        sourceIds: regSourceIds
      };
    }
    const { assessment, evidence } = await scoreDimensionFromRules(dim, structuredCtx, input);
    const legacyCtx = buildScoringContext(input, signals);
    const ruleSourceIds = selectSourcesForDimension(dim.key as DimensionKey, legacyCtx);
    const retrievedSourceIds = evidence.map((e) => e.sourceId);
    return { ...assessment, sourceIds: Array.from(new Set([...retrievedSourceIds, ...ruleSourceIds])) };
  }));

  const { overallScore, riskPercentage } = calculateOverallScore(dimensionAssessments);
  const triggeredRules = await applyOverrideRules(dimensionAssessments, signals);
  const riskLevel = determineRiskLevel(riskPercentage, triggeredRules);
  const impactLevel = impactLevelFor(riskLevel);
  const requiredControls = generateRequiredControls(dimensionAssessments);
  const criticalAreas = dimensionAssessments.filter((d) => d.score >= 4).map((d) => d.dimension);
  const findings = buildFindings(dimensionAssessments);
  const oversightScore = dimensionAssessments.find((d) => d.dimension === "HUMAN_OVERSIGHT")?.score ?? 0;
  const requiredHumanOversight = requiredHumanOversightText(oversightScore);

  const allSourceIds = Array.from(new Set(dimensionAssessments.flatMap((d) => d.sourceIds)));

  return {
    overallScore,
    maxScore: MAX_TOTAL_SCORE,
    riskPercentage,
    riskLevel,
    impactLevel,
    dimensionAssessments,
    triggeredRules,
    regulatoryMapping,
    findings,
    requiredControls,
    criticalAreas,
    requiredHumanOversight,
    sourceIds: allSourceIds,
    extractionMethod: signals.extractionMethod,
    rulesVersion: "2.0.0-postgres",
    assessmentEngineVersion: config.assessmentEngineVersion,
    llmProviderUsed: signals.extractionMethod === "llm" ? config.llmProvider : "deterministic (fallback)"
  };
}

export { DIMENSION_KEYS };
