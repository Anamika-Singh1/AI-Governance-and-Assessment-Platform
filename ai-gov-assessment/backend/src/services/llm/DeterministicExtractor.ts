import { ExtractedSignals, UseCaseInput } from "../../types";
import { analyzeUseCaseText, detectRegion } from "../../utils/textAnalysis";
import { REGULATORY_MAPPING_RULES } from "../../rules/regulatoryMappingRules";

/**
 * Deterministic, rule-based natural-language extraction. This is the
 * default "demo mode" extractor used when no LLM API key is configured,
 * AND the guaranteed fallback whenever a live LLM call fails — so the
 * application always remains fully functional and repeatable.
 */
export function extractSignalsDeterministic(input: UseCaseInput): ExtractedSignals {
  const analysis = analyzeUseCaseText(input);
  const regionTokens = detectRegion(input.region);
  const combinedText = [input.useCaseName, input.description, input.purpose, input.dataUsed, input.affectedParties]
    .join(" ")
    .toLowerCase();

  const candidateRiskFactors: string[] = [];
  if (analysis.hasFinancialData) candidateRiskFactors.push("Processes financial data about individuals");
  if (analysis.hasBiometricData) candidateRiskFactors.push("Processes biometric data");
  if (analysis.hasHealthData) candidateRiskFactors.push("Processes health-related data");
  if (analysis.hasBehavioralData) candidateRiskFactors.push("Processes behavioral/usage data");
  if (analysis.hasIdentityData) candidateRiskFactors.push("Processes directly identifying data");
  if (analysis.mentionsProtectedCharacteristics) candidateRiskFactors.push("References protected characteristics");
  if (analysis.affectsCreditAccess) candidateRiskFactors.push("Affects access to credit");
  if (analysis.affectsEmployment) candidateRiskFactors.push("Affects employment outcomes");
  if (analysis.affectsInsurance) candidateRiskFactors.push("Affects insurance coverage/claims outcomes");
  if (analysis.isGenerativeAI) candidateRiskFactors.push("Uses generative AI output with hallucination risk");
  if (analysis.isLargeScale) candidateRiskFactors.push("Applies at large scale across many individuals");
  if (input.decisionType !== "recommendation") candidateRiskFactors.push("Produces an automated decision, not just a recommendation");
  if (!input.humanReview) candidateRiskFactors.push("No human review is performed before the outcome takes effect");

  const candidateRegulations = REGULATORY_MAPPING_RULES.filter((rule) => {
    const keywordHit = rule.triggerKeywords.length === 0 || rule.triggerKeywords.some((k) => combinedText.includes(k));
    return keywordHit;
  }).map((rule) => rule.sourceId);

  let automationLevel: ExtractedSignals["automationLevel"] = "advisory";
  if (input.decisionType === "recommendation") {
    automationLevel = "advisory";
  } else if (input.decisionType === "both") {
    automationLevel = input.humanReview ? "human-in-loop" : "fully-automated";
  } else if (input.decisionType === "automated_decision") {
    automationLevel = input.humanReview ? "human-on-loop" : "fully-automated";
  }

  const affectedGroups = input.affectedParties
    .split(/,| and /i)
    .map((s) => s.trim())
    .filter(Boolean);

  const summary = `${input.useCaseName} is a ${analysis.primaryDomain.replace(/_/g, " ").toLowerCase()} use case in ${
    input.industry
  } that ${input.decisionType === "recommendation" ? "produces recommendations" : input.decisionType === "automated_decision" ? "makes automated decisions" : "produces both recommendations and automated decisions"} affecting ${
    input.affectedParties
  }, using data described as: "${input.dataUsed}". Human review is ${input.humanReview ? "present" : "not present"}.`;

  return {
    entities: {
      dataTypes: analysis.matchedDataTypeKeywords,
      affectedGroups: affectedGroups.length ? affectedGroups : [input.affectedParties],
      decisionKind: analysis.primaryDomain
    },
    candidateRiskFactors,
    candidateRegulations,
    isGenerativeAI: analysis.isGenerativeAI,
    usesProtectedCharacteristics: analysis.mentionsProtectedCharacteristics,
    automationLevel,
    summary,
    extractionMethod: "deterministic-fallback"
  };
}
