import { DimensionKey } from "../../config/dimensions";
import { DimensionScoringContext } from "../scoring/dimensionScoring";

/**
 * Deterministic evidence-source selection per dimension. Only sources
 * from the curated library (rules/authoritativeSources.ts) can be
 * returned — this function never invents a citation. Jurisdiction-
 * specific sources are only attached when the use case's region
 * plausibly matches, so the app never presents e.g. Indian law as
 * evidence for a purely EU/US use case.
 */
export function selectSourcesForDimension(dimension: DimensionKey, ctx: DimensionScoringContext): string[] {
  const { regionTokens, text } = ctx;
  const includesIndia = regionTokens.includes("india");
  const includesUS = regionTokens.includes("us");
  const includesEU = regionTokens.includes("eu");

  const base: Record<DimensionKey, string[]> = {
    DATA_GOVERNANCE: ["nist-ai-rmf", "iso-42001"],
    PRIVACY: ["gdpr", ...(includesIndia ? ["india-dpdp-act"] : [])],
    BIAS_FAIRNESS: ["nist-sp-1270-bias", "arxiv-model-cards", ...(includesEU ? ["eu-ai-act"] : [])],
    HUMAN_OVERSIGHT: ["nist-ai-rmf", ...(includesEU ? ["eu-ai-act"] : [])],
    EXPLAINABILITY: ["arxiv-model-cards", ...(includesEU ? ["eu-ai-act"] : [])],
    SECURITY: ["iso-27001", "nist-ai-rmf"],
    DECISION_IMPACT: [...(includesUS ? ["us-ecoa-reg-b"] : []), ...(includesEU ? ["eu-ai-act"] : [])],
    REGULATORY_EXPOSURE: [], // populated directly from the regulatory mapping result
    MODEL_RISK: ["nist-ai-rmf", "iso-23894"],
    MONITORING: ["nist-ai-rmf", "iso-42001", "vendor-watsonx-governance"]
  };

  let ids = base[dimension] || [];

  if (dimension === "PRIVACY" && text.hasIdentityData && includesIndia && !ids.includes("india-dpdp-act")) {
    ids = [...ids, "india-dpdp-act"];
  }
  if (dimension === "DECISION_IMPACT" && text.primaryDomain === "CREDIT_LENDING" && includesUS) {
    ids = [...ids, "us-fcra"];
  }
  if ((dimension === "DATA_GOVERNANCE" || dimension === "MONITORING") && includesIndia) {
    ids = [...ids, "rbi-regulatory-portal"];
  }

  return Array.from(new Set(ids));
}
