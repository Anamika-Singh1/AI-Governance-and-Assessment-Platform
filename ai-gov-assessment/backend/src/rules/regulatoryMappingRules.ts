import { RegulatoryApplicability } from "../types";

/**
 * Deterministic regulatory mapping rules. Each entry ties a curated
 * source (see authoritativeSources.ts) to keyword / region triggers.
 * The mapping engine (services/scoring/regulatoryMapping.ts) evaluates
 * these against the extracted use-case signals — the LLM never decides
 * applicability directly.
 */
export interface RegulatoryMappingRule {
  sourceId: string;
  name: string;
  /** Any one of these keywords appearing in the use case text/signals triggers a match. */
  triggerKeywords: string[];
  /** Region tokens (lowercase) for which this applies as "Applicable"/"Potentially Applicable" rather than "Needs Legal Review". */
  regionKeywords: string[];
  applicabilityConditions: string;
  whyTemplate: string;
}

export const REGULATORY_MAPPING_RULES: RegulatoryMappingRule[] = [
  {
    sourceId: "eu-ai-act",
    name: "EU AI Act",
    triggerKeywords: [
      "credit",
      "loan",
      "employment",
      "recruit",
      "hiring",
      "insurance",
      "biometric",
      "automated decision",
      "fraud",
      "creditworthiness"
    ],
    regionKeywords: ["eu", "europe", "european union", "eea"],
    applicabilityConditions:
      "Applies to providers/deployers placing AI systems on the EU market or whose output is used in the EU, particularly where the system falls in the 'high-risk' annex (e.g., creditworthiness evaluation, employment/HR screening, essential services access).",
    whyTemplate:
      "The use case involves a decision category (e.g., credit, employment, or essential-service access) that the EU AI Act classifies as high-risk when deployed in or targeting the EU market."
  },
  {
    sourceId: "gdpr",
    name: "GDPR",
    triggerKeywords: [
      "personal data",
      "customer",
      "profile",
      "automated decision",
      "spending",
      "behavior",
      "identity",
      "email",
      "phone"
    ],
    regionKeywords: ["eu", "europe", "european union", "eea"],
    applicabilityConditions:
      "Applies whenever personal data of individuals in the EU/EEA is processed, or where Article 22 rights around solely automated decision-making with legal/similarly significant effect are implicated.",
    whyTemplate:
      "The use case processes personal data about identifiable individuals and/or makes decisions that could have a legal or similarly significant effect on them."
  },
  {
    sourceId: "india-dpdp-act",
    name: "India DPDP Act, 2023",
    triggerKeywords: ["personal data", "customer", "identity", "kyc", "profile"],
    regionKeywords: ["india", "in", "rbi"],
    applicabilityConditions:
      "Applies to processing of digital personal data of individuals (Data Principals) in India by entities acting as Data Fiduciaries, including consent and purpose-limitation obligations.",
    whyTemplate:
      "The use case processes personal data of individuals in India, triggering Data Fiduciary obligations under the DPDP Act."
  },
  {
    sourceId: "us-ecoa-reg-b",
    name: "Equal Credit Opportunity Act (Regulation B)",
    triggerKeywords: ["credit", "loan", "lending", "creditworthiness", "underwriting"],
    regionKeywords: ["us", "usa", "united states"],
    applicabilityConditions:
      "Applies to any creditor evaluating creditworthiness or extending/denying credit to US consumers or businesses, including automated/algorithmic underwriting decisions.",
    whyTemplate:
      "The use case makes or informs a credit decision affecting individuals, which triggers fair-lending and adverse-action-notice obligations in the US."
  },
  {
    sourceId: "us-fcra",
    name: "Fair Credit Reporting Act",
    triggerKeywords: ["credit", "credit report", "credit bureau", "underwriting", "risk score"],
    regionKeywords: ["us", "usa", "united states"],
    applicabilityConditions:
      "Applies where consumer report data is used in eligibility determinations, including risk-based pricing notices and adverse-action disclosure requirements.",
    whyTemplate:
      "The use case appears to rely on consumer credit report data or produces a risk score used in an eligibility decision."
  },
  {
    sourceId: "nist-ai-rmf",
    name: "NIST AI Risk Management Framework",
    triggerKeywords: [], // universally potentially relevant as voluntary best-practice guidance
    regionKeywords: [],
    applicabilityConditions:
      "Voluntary framework; potentially relevant to any organization designing, deploying, or governing an AI system regardless of jurisdiction.",
    whyTemplate:
      "The NIST AI RMF's Govern/Map/Measure/Manage functions provide a widely recognized voluntary structure for assessing and mitigating this use case's AI risk."
  },
  {
    sourceId: "rbi-regulatory-portal",
    name: "RBI Master Directions (Banking / Digital Lending / IT Outsourcing)",
    triggerKeywords: ["loan", "credit", "lending", "banking", "kyc", "transaction", "digital lending"],
    regionKeywords: ["india", "in", "rbi"],
    applicabilityConditions:
      "Applicability depends on the specific RBI-regulated entity type and activity (e.g., digital lending guidelines, outsourcing of financial services, IT governance directions). The specific applicable circular must be confirmed by legal/compliance.",
    whyTemplate:
      "The use case is deployed by/for a bank or NBFC operating in India, where RBI master directions on digital lending, outsourcing, or IT governance may impose specific obligations."
  },
  {
    sourceId: "iso-42001",
    name: "ISO/IEC 42001",
    triggerKeywords: [],
    regionKeywords: [],
    applicabilityConditions:
      "Voluntary certifiable management-system standard; potentially relevant to any organization seeking to demonstrate a structured AI governance program.",
    whyTemplate:
      "ISO/IEC 42001 provides a certifiable AI management-system standard applicable to organizations of any type deploying AI systems such as this one."
  },
  {
    sourceId: "iso-23894",
    name: "ISO/IEC 23894",
    triggerKeywords: [],
    regionKeywords: [],
    applicabilityConditions: "Voluntary risk-management guidance applicable to any AI system risk assessment process.",
    whyTemplate:
      "ISO/IEC 23894 provides voluntary guidance for structuring the AI risk-management process used to evaluate this use case."
  },
  {
    sourceId: "iso-27001",
    name: "ISO/IEC 27001",
    triggerKeywords: ["api", "authentication", "security", "prompt injection", "data leakage"],
    regionKeywords: [],
    applicabilityConditions:
      "Relevant wherever the AI system processes sensitive data over networked APIs and requires an information security management system.",
    whyTemplate:
      "The use case's security surface (APIs, authentication, sensitive data) falls within the scope typically governed by an ISO/IEC 27001 information security management system."
  }
];

export function defaultApplicability(matchedRegion: boolean, matchedKeyword: boolean): RegulatoryApplicability {
  if (matchedRegion && matchedKeyword) return "Applicable";
  if (matchedKeyword && !matchedRegion) return "Potentially Applicable";
  if (matchedRegion && !matchedKeyword) return "Potentially Applicable";
  return "Needs Legal Review";
}
