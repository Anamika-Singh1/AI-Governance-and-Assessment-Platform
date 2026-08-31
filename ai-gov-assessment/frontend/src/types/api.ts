export type RiskLevel = "Low" | "Moderate" | "Elevated" | "High" | "Critical";
export type ImpactLevel = "Low impact" | "Moderate impact" | "High impact" | "Critical impact";
export type DecisionType = "recommendation" | "automated_decision" | "both";
export type RegulatoryApplicability = "Applicable" | "Potentially Applicable" | "Not Applicable" | "Needs Legal Review";
export type SourceType =
  | "Law / Regulation"
  | "Regulatory Guidance"
  | "Industry Standard"
  | "Research"
  | "Vendor Information"
  | "General Web Content";

export type DimensionKey =
  | "DATA_GOVERNANCE"
  | "PRIVACY"
  | "BIAS_FAIRNESS"
  | "HUMAN_OVERSIGHT"
  | "EXPLAINABILITY"
  | "SECURITY"
  | "DECISION_IMPACT"
  | "REGULATORY_EXPOSURE"
  | "MODEL_RISK"
  | "MONITORING";

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

export interface UseCaseRecord extends UseCaseInput {
  id: string;
  extractedSignals: Record<string, unknown>;
  structured: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UseCaseListItem {
  id: string;
  useCaseName: string;
  industry: string;
  region: string;
  decisionType: DecisionType;
  createdAt: string;
  assessmentCount: number;
  latestRiskLevel: RiskLevel | null;
}

export interface DimensionAssessment {
  dimension: DimensionKey;
  score: number;
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
  reliabilityLevel: string;
  reliabilityTier: number;
  verified: boolean;
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

export interface AuditTrailEntry {
  timestamp: string;
  step: string;
  detail: string;
}

export interface Assessment extends UseCaseInput {
  useCaseId: string;
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
  extractionMethod: string;
  rulesVersion: string;
  assessmentEngineVersion: string;
  llmProviderUsed: string;
  auditTrail: AuditTrailEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentListItem {
  useCaseId: string;
  useCaseName: string;
  industry: string;
  region: string;
  overallScore: number;
  riskLevel: RiskLevel;
  riskPercentage: number;
  createdAt: string;
}

export interface DimensionDefinition {
  key: DimensionKey;
  label: string;
  shortLabel: string;
  description: string;
  evaluationCriteria: string[];
  maxScore: 5;
}

export interface RuleCondition {
  field: string;
  op: string;
  value: unknown;
}

export interface GovernanceRuleRecord {
  id: string;
  name: string;
  dimensionKey: DimensionKey;
  conditions: RuleCondition[];
  matchMode: "all" | "any";
  scoreDelta: number;
  reason: string;
  version: string;
}

export interface OverrideRuleRecord {
  id: string;
  name: string;
  conditions: RuleCondition[];
  matchMode: "all" | "any";
  minRiskLevel: RiskLevel;
  reason: string;
  version: string;
}

export interface RegulatoryMappingRuleSummary {
  sourceId: string;
  name: string;
  applicabilityConditions: string;
}

export interface RulesResponse {
  thresholds: { level: RiskLevel; minPercent: number; maxPercent: number }[];
  maxScore: number;
  governanceRules: GovernanceRuleRecord[];
  overrideRules: OverrideRuleRecord[];
  rulesVersion: string;
  regulatoryMappingRules: RegulatoryMappingRuleSummary[];
}

export interface MethodologyResponse {
  dimensions: DimensionDefinition[];
  scoring: { scale: string; maxScore: number; formula: string };
  thresholds: { level: RiskLevel; minPercent: number; maxPercent: number }[];
  overrideRules: {
    id: string;
    name: string;
    conditions: any[];
    minRiskLevel: RiskLevel;
    reason: string;
  }[];
  rulesVersion: string;
  assessmentEngineVersion: string;
  sourceHierarchy: { sourceType: SourceType; tier: number; label: string }[];
  aiUsageStatement: string;
  legalDisclaimer: string;
}
