import { DimensionKey } from "../../config/dimensions";
import { ExtractedSignals, UseCaseInput, DimensionAssessment } from "../../types";
import { analyzeUseCaseText, detectRegion, TextSignals } from "../../utils/textAnalysis";

function clamp(n: number): number {
  return Math.max(0, Math.min(5, Math.round(n)));
}

export interface DimensionScoringContext {
  input: UseCaseInput;
  signals: ExtractedSignals;
  text: TextSignals;
  regionTokens: string[];
}

export function buildScoringContext(input: UseCaseInput, signals: ExtractedSignals): DimensionScoringContext {
  return {
    input,
    signals,
    text: analyzeUseCaseText(input),
    regionTokens: detectRegion(input.region)
  };
}

type DimensionScorer = (ctx: DimensionScoringContext) => Omit<DimensionAssessment, "sourceIds">;

const domainLabel = (t: TextSignals) => t.primaryDomain.replace(/_/g, " ").toLowerCase();

const scoreDataGovernance: DimensionScorer = ({ text }) => {
  let score = 1;
  const riskFactors: string[] = [];
  if (text.hasFinancialData) {
    score += 1;
    riskFactors.push("Financial data used as model input");
  }
  if (text.hasBiometricData || text.hasHealthData) {
    score += 1;
    riskFactors.push("Biometric or health data present, requiring elevated data governance controls");
  }
  if (text.hasIdentityData) {
    score += 1;
    riskFactors.push("Directly identifying data used, raising lineage and minimization requirements");
  }
  if (text.isLargeScale) {
    score += 1;
    riskFactors.push("Large-scale data processing increases governance and data-quality assurance burden");
  }
  if (["TRANSACTION_MONITORING", "CREDIT_LENDING"].includes(text.primaryDomain)) {
    score += 1;
    riskFactors.push("Domain typically involves complex, multi-source data pipelines with provenance risk");
  }
  score = clamp(score);
  return {
    dimension: "DATA_GOVERNANCE",
    score,
    reasoning: `This ${domainLabel(text)} use case was evaluated for data sensitivity, quality, provenance, minimization, retention, lineage, and training-data suitability based on the described data inputs.`,
    evidence: riskFactors.length ? riskFactors : ["No high-sensitivity data indicators were detected in the description."],
    riskFactors,
    recommendedControls: [
      "Document data provenance and lineage for all training and inference data",
      "Apply data minimization — collect only fields necessary for the stated purpose",
      "Define and enforce a data retention schedule",
      "Assess training-data suitability and representativeness before deployment"
    ]
  };
};

const scorePrivacy: DimensionScorer = ({ text, input, regionTokens }) => {
  let score = 1;
  const riskFactors: string[] = [];
  if (text.hasIdentityData) {
    score += 1;
    riskFactors.push("Processes personal data that can identify an individual");
  }
  if (text.hasFinancialData) {
    score += 1;
    riskFactors.push("Processes financial information tied to individuals");
  }
  if (text.hasBiometricData || text.hasHealthData) {
    score += 1;
    riskFactors.push("Processes special-category / sensitive personal data");
  }
  if (regionTokens.length > 1) {
    score += 1;
    riskFactors.push("Use case spans multiple jurisdictions, raising cross-border data transfer considerations");
  }
  if (input.decisionType !== "recommendation") {
    score += 1;
    riskFactors.push("Produces an automated decision with potential legal or similarly significant effect on the individual");
  }
  score = clamp(score);
  return {
    dimension: "PRIVACY",
    score,
    reasoning: `Privacy exposure was assessed based on the categories of personal data involved, the legal basis implied by the stated purpose, and whether the system's output constitutes an automated decision affecting the data subject.`,
    evidence: riskFactors.length ? riskFactors : ["No sensitive personal data categories were detected."],
    riskFactors,
    recommendedControls: [
      "Confirm and document the legal basis / consent mechanism for processing",
      "Apply purpose limitation — restrict use of the data to the stated purpose",
      "Provide data subject rights mechanisms (access, correction, erasure where applicable)",
      "Conduct a Data Protection / Privacy Impact Assessment (DPIA/PIA)"
    ]
  };
};

const scoreBiasFairness: DimensionScorer = ({ text, input }) => {
  let score = 1;
  const riskFactors: string[] = [];
  if (["CREDIT_LENDING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"].includes(text.primaryDomain)) {
    score += 2;
    riskFactors.push("Use case falls in a domain with well-documented discriminatory-impact history (credit, employment, or insurance)");
  }
  if (text.mentionsProtectedCharacteristics) {
    score += 1;
    riskFactors.push("Description references characteristics that may correlate with protected classes");
  }
  if (input.decisionType === "automated_decision") {
    score += 1;
    riskFactors.push("Fully automated decisioning reduces opportunity to catch disparate outcomes before they affect individuals");
  }
  if (text.isLargeScale) {
    score += 1;
    riskFactors.push("Outcome disparities would affect a large population if present");
  }
  score = clamp(score);
  return {
    dimension: "BIAS_FAIRNESS",
    score,
    reasoning: `Bias and fairness risk was assessed based on the decision domain's known discrimination history, presence of protected-characteristic proxies, automation level, and population scale.`,
    evidence: riskFactors.length ? riskFactors : ["No strong bias/fairness risk indicators were detected."],
    riskFactors,
    recommendedControls: [
      "Run pre-deployment fairness testing across protected-characteristic proxies",
      "Establish ongoing outcome-disparity monitoring in production",
      "Document training-data representativeness relative to the affected population",
      "Define a bias incident response and remediation process"
    ]
  };
};

const scoreHumanOversight: DimensionScorer = ({ signals, text }) => {
  const base: Record<ExtractedSignals["automationLevel"], number> = {
    advisory: 0,
    "human-in-loop": 1,
    "human-on-loop": 3,
    "fully-automated": 5
  };
  let score = base[signals.automationLevel];
  const riskFactors: string[] = [];
  if (signals.automationLevel === "fully-automated") {
    riskFactors.push("No human reviews individual outcomes before they take effect");
  } else if (signals.automationLevel === "human-on-loop") {
    riskFactors.push("Humans monitor and can intervene, but the system acts autonomously by default");
  } else if (signals.automationLevel === "human-in-loop") {
    riskFactors.push("A human is involved in finalizing each decision");
  } else {
    riskFactors.push("System output is advisory only; a human makes the actual decision");
  }
  if (
    signals.automationLevel === "fully-automated" &&
    ["CREDIT_LENDING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"].includes(text.primaryDomain)
  ) {
    score = 5;
    riskFactors.push("High-impact decision domain compounds the risk of zero human oversight");
  }
  score = clamp(score);
  return {
    dimension: "HUMAN_OVERSIGHT",
    score,
    reasoning: `Human oversight risk reflects the automation level (${signals.automationLevel.replace(/-/g, " ")}) and whether individuals affected by the outcome can reach a human reviewer.`,
    evidence: riskFactors,
    riskFactors,
    recommendedControls: [
      "Define clear human-review checkpoints before high-impact outcomes take effect",
      "Provide a documented override / escalation mechanism",
      "Assign explicit human accountability for final decisions",
      "Give affected individuals a channel to challenge the AI-influenced decision"
    ]
  };
};

const scoreExplainability: DimensionScorer = ({ text, input }) => {
  let score = 1;
  const riskFactors: string[] = [];
  if (text.isGenerativeAI) {
    score += 2;
    riskFactors.push("Generative / LLM-based outputs are inherently harder to fully explain and may hallucinate");
  }
  if (["CREDIT_LENDING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"].includes(text.primaryDomain)) {
    score += 1;
    riskFactors.push("Domain typically carries regulatory adverse-action / reason-code explanation requirements");
  }
  if (input.decisionType === "automated_decision") {
    score += 1;
    riskFactors.push("Automated decisions require a documented rationale accessible to the affected individual");
  }
  score = clamp(score);
  return {
    dimension: "EXPLAINABILITY",
    score,
    reasoning: `Explainability risk was assessed based on model type (generative vs. structured/predictive), regulatory reason-code expectations for this domain, and automation level.`,
    evidence: riskFactors.length ? riskFactors : ["No strong explainability risk indicators were detected."],
    riskFactors,
    recommendedControls: [
      "Provide user-facing explanations / reason codes for adverse outcomes",
      "Maintain model interpretability documentation (e.g., model cards)",
      "Document the decision rationale logic for audit purposes",
      "Where generative AI is used, disclose its use and limitations to affected users"
    ]
  };
};

const scoreSecurity: DimensionScorer = ({ text }) => {
  let score = 2;
  const riskFactors: string[] = ["Baseline API/authentication security risk assumed for any networked AI system"];
  if (text.hasFinancialData || text.hasIdentityData) {
    score += 1;
    riskFactors.push("Sensitive data increases the impact of a potential data leakage or breach");
  }
  if (text.isGenerativeAI) {
    score += 1;
    riskFactors.push("Generative/chatbot interfaces are exposed to prompt-injection and output-manipulation risks");
  }
  if (["FRAUD_DETECTION", "TRANSACTION_MONITORING"].includes(text.primaryDomain)) {
    score += 1;
    riskFactors.push("Fraud/AML systems are high-value targets for adversarial evasion attacks");
  }
  score = clamp(score);
  return {
    dimension: "SECURITY",
    score,
    reasoning: `Security risk was assessed based on the sensitivity of data handled, exposure to generative-AI-specific attack surfaces (prompt injection, data leakage), and adversarial-attack incentives typical of the domain.`,
    evidence: riskFactors,
    riskFactors,
    recommendedControls: [
      "Enforce strong authentication and authorization on all model-serving APIs",
      "Apply input validation and prompt-injection defenses for any generative components",
      "Rate-limit and monitor for API/model abuse",
      "Assess third-party/model supply-chain security (weights, dependencies, hosting)"
    ]
  };
};

const scoreDecisionImpact: DimensionScorer = ({ text, input }) => {
  let score = 1;
  const riskFactors: string[] = [];
  if (["CREDIT_LENDING", "INSURANCE_CLAIMS"].includes(text.primaryDomain)) {
    score += 2;
    riskFactors.push("Directly affects access to financial services or insurance coverage");
  }
  if (text.primaryDomain === "RECRUITMENT_HR") {
    score += 2;
    riskFactors.push("Directly affects employment outcomes");
  }
  if (["TRANSACTION_MONITORING", "FRAUD_DETECTION"].includes(text.primaryDomain)) {
    score += 1;
    riskFactors.push("False positives can freeze accounts or block legitimate transactions, with financial and legal consequences");
  }
  if (text.isLargeScale) {
    score += 1;
    riskFactors.push("A large number of individuals are potentially affected");
  }
  if (input.decisionType === "automated_decision") {
    score += 1;
    riskFactors.push("Impact is realized automatically without an intermediate human checkpoint");
  }
  score = clamp(score);
  return {
    dimension: "DECISION_IMPACT",
    score,
    reasoning: `Decision impact was assessed based on the financial, employment, access-to-service, legal, and safety consequences the AI's output has on affected individuals, and how many people are affected.`,
    evidence: riskFactors.length ? riskFactors : ["Impact on individuals appears limited based on the description provided."],
    riskFactors,
    recommendedControls: [
      "Classify this use case's outcomes against a documented impact-severity scale",
      "Provide a remediation path for individuals harmed by an incorrect outcome",
      "Track outcome-level metrics (approval/denial rates, false-positive rates) by affected population segment"
    ]
  };
};

const scoreModelRisk: DimensionScorer = ({ text }) => {
  let score = 1;
  const riskFactors: string[] = [];
  if (text.isGenerativeAI) {
    score += 2;
    riskFactors.push("Generative models carry hallucination risk and often depend on third-party foundation models");
  }
  if (["CREDIT_LENDING", "FRAUD_DETECTION", "TRANSACTION_MONITORING"].includes(text.primaryDomain)) {
    score += 1;
    riskFactors.push("Domain typically uses complex predictive models subject to concept drift");
  }
  if (text.isLargeScale) {
    score += 1;
    riskFactors.push("Model operates at scale, amplifying the impact of undetected performance degradation");
  }
  score = clamp(score);
  return {
    dimension: "MODEL_RISK",
    score,
    reasoning: `Model risk was assessed based on model type/complexity, dependency on generative or third-party models, and exposure to data/concept drift.`,
    evidence: riskFactors.length ? riskFactors : ["No elevated model-risk indicators were detected."],
    riskFactors,
    recommendedControls: [
      "Establish a model validation process prior to deployment (independent of model developers)",
      "Monitor for performance degradation and concept/data drift in production",
      "Document third-party model dependencies and fallback plans",
      "For generative AI, implement hallucination-detection and human review of high-stakes outputs"
    ]
  };
};

const scoreMonitoring: DimensionScorer = ({ signals, text }) => {
  let score = 2;
  const riskFactors: string[] = ["No production monitoring program was described, so a moderate baseline risk is assumed"];
  if (signals.automationLevel === "fully-automated") {
    score += 1;
    riskFactors.push("Fully automated systems require continuous monitoring since no human naturally observes each outcome");
  }
  if (["CREDIT_LENDING", "FRAUD_DETECTION", "TRANSACTION_MONITORING", "RECRUITMENT_HR", "INSURANCE_CLAIMS"].includes(text.primaryDomain)) {
    score += 1;
    riskFactors.push("High-impact regulated domain warrants active bias, drift, and performance monitoring");
  }
  if (text.isGenerativeAI) {
    score += 1;
    riskFactors.push("Generative outputs require ongoing quality/hallucination-rate monitoring");
  }
  score = clamp(score);
  return {
    dimension: "MONITORING",
    score,
    reasoning: `Monitoring risk reflects whether the use case, as described, implies an established production monitoring, audit-logging, and incident-response program.`,
    evidence: riskFactors,
    riskFactors,
    recommendedControls: [
      "Implement production performance, bias, and drift monitoring dashboards",
      "Maintain audit logs of inputs, outputs, and overrides for every decision",
      "Establish a periodic (e.g., quarterly) model review cadence",
      "Implement a kill switch / rollback plan for rapid deactivation if serious issues are detected"
    ]
  };
};

export const DIMENSION_SCORERS: Record<DimensionKey, DimensionScorer> = {
  DATA_GOVERNANCE: scoreDataGovernance,
  PRIVACY: scorePrivacy,
  BIAS_FAIRNESS: scoreBiasFairness,
  HUMAN_OVERSIGHT: scoreHumanOversight,
  EXPLAINABILITY: scoreExplainability,
  SECURITY: scoreSecurity,
  DECISION_IMPACT: scoreDecisionImpact,
  // REGULATORY_EXPOSURE is scored separately in assessmentEngine.ts once regulatory mapping is computed
  REGULATORY_EXPOSURE: () => ({
    dimension: "REGULATORY_EXPOSURE",
    score: 0,
    reasoning: "",
    evidence: [],
    riskFactors: [],
    recommendedControls: []
  }),
  MODEL_RISK: scoreModelRisk,
  MONITORING: scoreMonitoring
};
