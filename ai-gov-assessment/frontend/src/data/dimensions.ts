import { DimensionDefinition } from "@/types/api";

export const DIMENSIONS: DimensionDefinition[] = [
  {
    key: "DATA_GOVERNANCE",
    label: "Data Governance",
    shortLabel: "Data",
    description: "Data sensitivity, quality, provenance, minimization, retention, lineage, and training-data suitability.",
    evaluationCriteria: ["Data sensitivity", "Data quality", "Data provenance", "Data minimization", "Data retention", "Data lineage", "Training-data suitability"],
    maxScore: 5
  },
  {
    key: "PRIVACY",
    label: "Privacy",
    shortLabel: "Privacy",
    description: "Personal data, sensitive personal data, consent/legal basis, purpose limitation, retention, data subject rights, cross-border processing.",
    evaluationCriteria: ["Personal data", "Sensitive personal data", "Consent/legal basis", "Purpose limitation", "Data minimization", "Retention", "Data subject rights", "Cross-border processing"],
    maxScore: 5
  },
  {
    key: "BIAS_FAIRNESS",
    label: "Bias & Fairness",
    shortLabel: "Fairness",
    description: "Protected characteristics, discriminatory impact potential, training-data representation, fairness testing, bias monitoring, outcome disparity.",
    evaluationCriteria: ["Protected characteristics", "Potential discriminatory impact", "Representation of training data", "Fairness testing", "Bias monitoring", "Outcome disparity"],
    maxScore: 5
  },
  {
    key: "HUMAN_OVERSIGHT",
    label: "Human Oversight",
    shortLabel: "Oversight",
    description: "Human review, ability to override, escalation mechanism, human accountability, automation level, ability to challenge decisions.",
    evaluationCriteria: ["Human review", "Ability to override AI", "Escalation mechanism", "Human accountability", "Automation level", "Ability to challenge decisions"],
    maxScore: 5
  },
  {
    key: "EXPLAINABILITY",
    label: "Explainability",
    shortLabel: "Explainability",
    description: "Explainability requirements, user-facing explanations, decision rationale, model interpretability, documentation.",
    evaluationCriteria: ["Explainability requirements", "User-facing explanations", "Decision rationale", "Model interpretability", "Documentation"],
    maxScore: 5
  },
  {
    key: "SECURITY",
    label: "Security",
    shortLabel: "Security",
    description: "Authentication, authorization, model security, prompt injection, data leakage, adversarial attacks, model/API abuse, supply-chain risks.",
    evaluationCriteria: ["Authentication", "Authorization", "Model security", "Prompt injection", "Data leakage", "Adversarial attacks", "Model/API abuse", "Supply-chain risks"],
    maxScore: 5
  },
  {
    key: "DECISION_IMPACT",
    label: "Decision Impact",
    shortLabel: "Impact",
    description: "Financial, employment, access-to-service, legal, and safety impact on individuals, and number of people affected.",
    evaluationCriteria: ["Financial impact", "Employment impact", "Access-to-service impact", "Legal impact", "Safety impact", "Impact on individuals", "Number of affected people"],
    maxScore: 5
  },
  {
    key: "REGULATORY_EXPOSURE",
    label: "Regulatory Exposure",
    shortLabel: "Regulatory",
    description: "Applicable regulations and frameworks such as the EU AI Act, GDPR, NIST AI RMF, ISO/IEC 42001/23894, India DPDP Act, and sector-specific rules.",
    evaluationCriteria: ["EU AI Act", "GDPR", "NIST AI RMF", "ISO/IEC 42001", "ISO/IEC 23894", "India DPDP Act", "RBI requirements", "Anti-discrimination requirements"],
    maxScore: 5
  },
  {
    key: "MODEL_RISK",
    label: "Model Risk",
    shortLabel: "Model Risk",
    description: "Model complexity, prediction uncertainty, validation, performance degradation, drift, training-data and third-party dependency, hallucination risk.",
    evaluationCriteria: ["Model complexity", "Prediction uncertainty", "Model validation", "Performance degradation", "Drift", "Training-data dependency", "Third-party model dependency", "Hallucination risk"],
    maxScore: 5
  },
  {
    key: "MONITORING",
    label: "Monitoring",
    shortLabel: "Monitoring",
    description: "Production, bias, and drift monitoring, incident management, audit logs, periodic review, kill switch/rollback.",
    evaluationCriteria: ["Production monitoring", "Bias monitoring", "Drift monitoring", "Performance monitoring", "Incident management", "Audit logs", "Periodic review", "Kill switch / rollback"],
    maxScore: 5
  }
];

export const DIMENSION_MAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));
