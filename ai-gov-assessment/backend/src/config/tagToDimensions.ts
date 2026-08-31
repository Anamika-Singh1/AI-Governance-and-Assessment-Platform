/**
 * Maps a curated source's free-text tags to the governance dimensions
 * it's relevant to (source_chunks.dimension_tags), used to boost
 * dimension-relevant chunks during retrieval (see retrievalService.ts).
 *
 * Shared by database/seed.ts (the curated source library) and
 * services/sources/sourceImportService.ts (CSV-imported sources), so a
 * new source added either way gets the same dimension tagging without
 * a code change — a new tag/dimension mapping is the only thing that
 * ever requires editing this file.
 */
export const TAG_TO_DIMENSIONS: Record<string, string[]> = {
  credit: ["DECISION_IMPACT", "REGULATORY_EXPOSURE", "BIAS_FAIRNESS"],
  loan: ["DECISION_IMPACT", "REGULATORY_EXPOSURE"],
  "fair-lending": ["BIAS_FAIRNESS", "REGULATORY_EXPOSURE"],
  "adverse-action": ["EXPLAINABILITY", "DECISION_IMPACT"],
  employment: ["BIAS_FAIRNESS", "DECISION_IMPACT"],
  recruitment: ["BIAS_FAIRNESS", "DECISION_IMPACT"],
  privacy: ["PRIVACY", "DATA_GOVERNANCE"],
  "personal-data": ["PRIVACY", "DATA_GOVERNANCE"],
  consent: ["PRIVACY"],
  "data-subject-rights": ["PRIVACY"],
  "cross-border": ["PRIVACY", "REGULATORY_EXPOSURE"],
  bias: ["BIAS_FAIRNESS"],
  discrimination: ["BIAS_FAIRNESS"],
  fairness: ["BIAS_FAIRNESS"],
  "risk-management": ["MODEL_RISK", "MONITORING"],
  "model-risk": ["MODEL_RISK"],
  governance: ["MONITORING", "MODEL_RISK"],
  "management-system": ["MONITORING"],
  audit: ["MONITORING"],
  security: ["SECURITY"],
  "information-security": ["SECURITY"],
  "api-abuse": ["SECURITY"],
  explainability: ["EXPLAINABILITY"],
  documentation: ["EXPLAINABILITY", "MODEL_RISK"],
  interpretability: ["EXPLAINABILITY"],
  monitoring: ["MONITORING"],
  "automated-decision": ["HUMAN_OVERSIGHT", "EXPLAINABILITY"],
  biometric: ["PRIVACY", "DATA_GOVERNANCE"],
  "high-risk-ai": ["REGULATORY_EXPOSURE"],
  "credit-report": ["DATA_GOVERNANCE", "REGULATORY_EXPOSURE"],
  outsourcing: ["REGULATORY_EXPOSURE", "SECURITY"],
  "digital-lending": ["REGULATORY_EXPOSURE"],
  "it-governance": ["SECURITY", "REGULATORY_EXPOSURE"],
  banking: ["REGULATORY_EXPOSURE"],
  "trustworthy-ai": ["MODEL_RISK", "MONITORING"],
  principles: ["MODEL_RISK"],
  tooling: ["MONITORING"],
  vendor: ["MONITORING"],
  background: ["BIAS_FAIRNESS"],
  general: ["BIAS_FAIRNESS"]
};

export function dimensionsForTags(tags: string[]): string[] {
  const set = new Set<string>();
  for (const t of tags) (TAG_TO_DIMENSIONS[t] || []).forEach((d) => set.add(d));
  return Array.from(set);
}
