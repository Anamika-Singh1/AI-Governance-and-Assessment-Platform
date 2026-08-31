import { DimensionKey } from "./config/dimensions";
import { SourceType } from "./config/sourceTypes";

export type RiskLevel = "Low" | "Moderate" | "Elevated" | "High" | "Critical";

export type ImpactLevel = "Low impact" | "Moderate impact" | "High impact" | "Critical impact";

export type DecisionType = "recommendation" | "automated_decision" | "both";

export type RegulatoryApplicability =
  | "Applicable"
  | "Potentially Applicable"
  | "Not Applicable"
  | "Needs Legal Review";

export interface UseCaseInput {
  useCaseName: string;
  description: string;
  industry: string;
  intendedUsers: string;
  dataUsed: string;
  purpose: string;
  affectedParties: string;
  decisionType: DecisionType;
  humanReview: boolean;
  region: string;
}

/** Structured signals extracted from natural-language input (LLM or deterministic fallback). */
export interface ExtractedSignals {
  entities: {
    dataTypes: string[];
    affectedGroups: string[];
    decisionKind: string;
  };
  candidateRiskFactors: string[];
  candidateRegulations: string[]; // regulation ids, matched heuristically
  isGenerativeAI: boolean;
  usesProtectedCharacteristics: boolean;
  automationLevel: "advisory" | "human-in-loop" | "human-on-loop" | "fully-automated";
  summary: string;
  extractionMethod: "llm" | "deterministic-fallback";
}

export interface DimensionAssessment {
  dimension: DimensionKey;
  score: number; // 0-5
  reasoning: string;
  evidence: string[];
  riskFactors: string[];
  recommendedControls: string[];
  sourceIds: string[];
}

export interface TriggeredRule {
  ruleId: string;
  name: string;
  description: string;
  reason: string;
  enforcedMinRiskLevel: RiskLevel;
}

export interface RegulatoryMappingEntry {
  regulationId: string;
  name: string;
  applicability: RegulatoryApplicability;
  jurisdiction: string;
  whyPotentiallyRelevant: string;
  applicabilityConditions: string;
  sourceId: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: SourceType;
  jurisdiction: string;
  publicationDate: string | null;
  lastVerifiedDate: string | null;
  description: string;
  reliabilityLevel: string; // human readable tier label
  reliabilityTier: number;
  verified: boolean; // false => "Unverified", never treated as authoritative evidence
}

export interface FindingRecord {
  dimension: DimensionKey;
  severity: RiskLevel;
  score: number;
  explanation: string;
  evidence: string[];
  sourceIds: string[];
  recommendedMitigation: string[];
}

export interface AssessmentResult {
  overallScore: number;
  maxScore: number;
  riskPercentage: number;
  riskLevel: RiskLevel;
  impactLevel: ImpactLevel;
  dimensionAssessments: DimensionAssessment[];
  triggeredRules: TriggeredRule[];
  regulatoryMapping: RegulatoryMappingEntry[];
  findings: FindingRecord[];
  requiredControls: string[];
  criticalAreas: DimensionKey[];
  requiredHumanOversight: string;
  sourceIds: string[];
  extractionMethod: "llm" | "deterministic-fallback";
  rulesVersion: string;
  assessmentEngineVersion: string;
  llmProviderUsed: string;
}

export interface AuditTrailEntry {
  timestamp: string;
  step: string;
  detail: string;
}
