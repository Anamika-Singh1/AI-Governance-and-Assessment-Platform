import { REGULATORY_MAPPING_RULES } from "../../rules/regulatoryMappingRules";
import { CURATED_SOURCES } from "../../rules/authoritativeSources";
import { RegulatoryMappingEntry, UseCaseInput, RegulatoryApplicability } from "../../types";
import { detectRegion } from "../../utils/textAnalysis";

/**
 * Deterministic regulatory mapping (Section 20). The LLM may have
 * suggested candidate regulation ids, but applicability itself is
 * always (re)computed here from keyword + region matching against the
 * fixed rule set — never asserted directly by the LLM. The system
 * never claims a regulation "applies universally" and always
 * distinguishes Applicable / Potentially Applicable / Not Applicable /
 * Needs Legal Review, with an explicit non-legal-advice disclaimer
 * surfaced by the API layer.
 */
export function computeRegulatoryMapping(input: UseCaseInput): RegulatoryMappingEntry[] {
  const combinedText = [input.useCaseName, input.description, input.purpose, input.dataUsed, input.affectedParties]
    .join(" ")
    .toLowerCase();
  const regionTokens = detectRegion(input.region);

  const entries: RegulatoryMappingEntry[] = REGULATORY_MAPPING_RULES.map((rule) => {
    const source = CURATED_SOURCES.find((s) => s.id === rule.sourceId);
    const keywordHit = rule.triggerKeywords.length === 0 || rule.triggerKeywords.some((k) => combinedText.includes(k));
    const regionHit = rule.regionKeywords.length === 0 || rule.regionKeywords.some((r) => regionTokens.includes(r));

    let applicability: RegulatoryApplicability;
    if (rule.triggerKeywords.length === 0 && rule.regionKeywords.length === 0) {
      // Universally-applicable voluntary guidance/standards (e.g. NIST AI RMF, ISO 42001/23894)
      applicability = "Potentially Applicable";
    } else if (keywordHit && regionHit) {
      applicability = "Applicable";
    } else if (keywordHit && !regionHit) {
      applicability = regionTokens.length === 0 ? "Potentially Applicable" : "Not Applicable";
    } else if (!keywordHit && regionHit) {
      applicability = "Potentially Applicable";
    } else {
      applicability = "Not Applicable";
    }

    return {
      regulationId: rule.sourceId,
      name: rule.name,
      applicability,
      jurisdiction: source?.jurisdiction || "Unknown",
      whyPotentiallyRelevant: rule.whyTemplate,
      applicabilityConditions: rule.applicabilityConditions,
      sourceId: rule.sourceId
    };
  });

  // Only surface entries that are at least "Potentially Applicable" or "Needs Legal Review";
  // fully "Not Applicable" entries are omitted from the primary mapping to avoid noise,
  // but the full evaluation remains available for audit via the assessment record.
  return entries.filter((e) => e.applicability !== "Not Applicable");
}

export function regulatoryExposureScore(mapping: RegulatoryMappingEntry[]): number {
  const applicable = mapping.filter((m) => m.applicability === "Applicable").length;
  const potential = mapping.filter((m) => m.applicability === "Potentially Applicable").length;
  const weighted = applicable * 1.5 + potential * 0.75;
  if (weighted <= 0.5) return 1;
  if (weighted <= 2) return 2;
  if (weighted <= 4) return 3;
  if (weighted <= 6) return 4;
  return 5;
}
