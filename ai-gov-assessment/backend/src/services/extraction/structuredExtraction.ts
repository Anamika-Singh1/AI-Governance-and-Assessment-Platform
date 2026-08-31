import { UseCaseInput, ExtractedSignals } from "../../types";
import { analyzeUseCaseText, detectRegion } from "../../utils/textAnalysis";

/**
 * The structured representation stored in use_cases.extracted_json and
 * used as the rule-evaluation context (services/rules/ruleEngine.ts).
 * This is the concrete answer to the assignment's "Structured Use Case
 * Extraction" section — natural-language input converted into a typed,
 * storable, rule-queryable object.
 */
export interface StructuredUseCase {
  primaryDomain: string;
  domains: string[];
  hasFinancialData: boolean;
  hasBiometricData: boolean;
  hasHealthData: boolean;
  hasBehavioralData: boolean;
  hasIdentityData: boolean;
  personalData: boolean;
  sensitiveData: boolean;
  mentionsProtectedCharacteristics: boolean;
  isGenerativeAI: boolean;
  isLargeScale: boolean;
  automatedDecision: boolean;
  automationLevel: ExtractedSignals["automationLevel"];
  decisionType: UseCaseInput["decisionType"];
  humanOversight: boolean;
  multiRegion: boolean;
  decisionImpact: "low" | "moderate" | "high";
}

export function buildStructuredUseCase(input: UseCaseInput, signals: ExtractedSignals): StructuredUseCase {
  const text = analyzeUseCaseText(input);
  const regionTokens = detectRegion(input.region);

  const decisionImpact: StructuredUseCase["decisionImpact"] =
    ["CREDIT_LENDING", "INSURANCE_CLAIMS", "RECRUITMENT_HR"].includes(text.primaryDomain)
      ? "high"
      : ["TRANSACTION_MONITORING", "FRAUD_DETECTION"].includes(text.primaryDomain)
        ? "moderate"
        : "low";

  return {
    primaryDomain: text.primaryDomain,
    domains: text.domains,
    hasFinancialData: text.hasFinancialData,
    hasBiometricData: text.hasBiometricData,
    hasHealthData: text.hasHealthData,
    hasBehavioralData: text.hasBehavioralData,
    hasIdentityData: text.hasIdentityData,
    personalData: text.hasIdentityData || text.hasBehavioralData,
    sensitiveData: text.hasBiometricData || text.hasHealthData,
    mentionsProtectedCharacteristics: text.mentionsProtectedCharacteristics,
    isGenerativeAI: text.isGenerativeAI,
    isLargeScale: text.isLargeScale,
    automatedDecision: input.decisionType !== "recommendation",
    automationLevel: signals.automationLevel,
    decisionType: input.decisionType,
    humanOversight: input.humanReview,
    multiRegion: regionTokens.length > 1,
    decisionImpact
  };
}
