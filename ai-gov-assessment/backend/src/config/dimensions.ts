/**
 * The ten governance dimensions assessed for every AI use case.
 * This list is the single source of truth used across scoring,
 * findings, dashboard charts, and the methodology page.
 */

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

export interface DimensionDefinition {
  key: DimensionKey;
  label: string;
  shortLabel: string;
  description: string;
  evaluationCriteria: string[];
  maxScore: 5;
}

export const DIMENSIONS: DimensionDefinition[] = [
  {
    key: "DATA_GOVERNANCE",
    label: "Data Governance",
    shortLabel: "Data",
    description:
      "Assesses the sensitivity, quality, provenance, and lifecycle management of data used by the AI system.",
    evaluationCriteria: [
      "Data sensitivity",
      "Data quality",
      "Data provenance",
      "Data minimization",
      "Data retention",
      "Data lineage",
      "Training-data suitability"
    ],
    maxScore: 5
  },
  {
    key: "PRIVACY",
    label: "Privacy",
    shortLabel: "Privacy",
    description:
      "Assesses personal and sensitive personal data handling, legal basis, and data subject rights.",
    evaluationCriteria: [
      "Personal data",
      "Sensitive personal data",
      "Consent / legal basis",
      "Purpose limitation",
      "Data minimization",
      "Retention",
      "Data subject rights",
      "Cross-border processing"
    ],
    maxScore: 5
  },
  {
    key: "BIAS_FAIRNESS",
    label: "Bias & Fairness",
    shortLabel: "Fairness",
    description:
      "Assesses the potential for discriminatory outcomes and the rigor of fairness controls.",
    evaluationCriteria: [
      "Protected characteristics",
      "Potential discriminatory impact",
      "Representation of training data",
      "Fairness testing",
      "Bias monitoring",
      "Outcome disparity"
    ],
    maxScore: 5
  },
  {
    key: "HUMAN_OVERSIGHT",
    label: "Human Oversight",
    shortLabel: "Oversight",
    description:
      "Assesses whether humans meaningfully review, can override, and are accountable for AI outputs.",
    evaluationCriteria: [
      "Human review",
      "Ability to override AI",
      "Escalation mechanism",
      "Human accountability",
      "Automation level",
      "Ability to challenge decisions"
    ],
    maxScore: 5
  },
  {
    key: "EXPLAINABILITY",
    label: "Explainability",
    shortLabel: "Explainability",
    description:
      "Assesses whether the system's decisions can be explained to users, regulators, and auditors.",
    evaluationCriteria: [
      "Explainability requirements",
      "User-facing explanations",
      "Decision rationale",
      "Model interpretability",
      "Documentation"
    ],
    maxScore: 5
  },
  {
    key: "SECURITY",
    label: "Security",
    shortLabel: "Security",
    description:
      "Assesses technical security controls protecting the model, data, and APIs from misuse or attack.",
    evaluationCriteria: [
      "Authentication",
      "Authorization",
      "Model security",
      "Prompt injection",
      "Data leakage",
      "Adversarial attacks",
      "Model / API abuse",
      "Supply-chain risks"
    ],
    maxScore: 5
  },
  {
    key: "DECISION_IMPACT",
    label: "Decision Impact",
    shortLabel: "Impact",
    description:
      "Assesses the magnitude and reach of consequences the AI's outputs have on individuals.",
    evaluationCriteria: [
      "Financial impact",
      "Employment impact",
      "Access-to-service impact",
      "Legal impact",
      "Safety impact",
      "Impact on individuals",
      "Number of affected people"
    ],
    maxScore: 5
  },
  {
    key: "REGULATORY_EXPOSURE",
    label: "Regulatory Exposure",
    shortLabel: "Regulatory",
    description:
      "Assesses the extent to which laws, regulations, and standards potentially apply to the use case.",
    evaluationCriteria: [
      "EU AI Act",
      "GDPR",
      "NIST AI RMF",
      "ISO/IEC 42001",
      "ISO/IEC 23894",
      "India DPDP Act",
      "RBI requirements (where relevant)",
      "Equal credit / anti-discrimination requirements (where relevant)"
    ],
    maxScore: 5
  },
  {
    key: "MODEL_RISK",
    label: "Model Risk",
    shortLabel: "Model Risk",
    description:
      "Assesses model complexity, validation rigor, drift exposure, and third-party / hallucination risk.",
    evaluationCriteria: [
      "Model complexity",
      "Prediction uncertainty",
      "Model validation",
      "Performance degradation",
      "Drift",
      "Training-data dependency",
      "Third-party model dependency",
      "Hallucination risk (generative AI)"
    ],
    maxScore: 5
  },
  {
    key: "MONITORING",
    label: "Monitoring",
    shortLabel: "Monitoring",
    description:
      "Assesses the maturity of post-deployment monitoring, incident response, and review processes.",
    evaluationCriteria: [
      "Production monitoring",
      "Bias monitoring",
      "Drift monitoring",
      "Performance monitoring",
      "Incident management",
      "Audit logs",
      "Periodic review",
      "Kill switch / rollback"
    ],
    maxScore: 5
  }
];

export const DIMENSION_KEYS: DimensionKey[] = DIMENSIONS.map((d) => d.key);

export const MAX_TOTAL_SCORE = DIMENSIONS.length * 5; // 50
