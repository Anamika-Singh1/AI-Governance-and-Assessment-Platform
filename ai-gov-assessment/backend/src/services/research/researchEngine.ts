import { DimensionKey } from "../../config/dimensions";
import { UseCaseInput } from "../../types";
import { DimensionScoringContext } from "../scoring/dimensionScoring";
import { selectSourcesForDimension } from "../sources/sourceSelection";
import { computeRegulatoryMapping, regulatoryExposureScore } from "./regulatoryMapping";

/**
 * The research layer (Section 6 / Section 17's services/research).
 *
 * This is where "reliable public information retrieval" happens for an
 * assessment: given a use case and its extracted signals, it decides
 * which authoritative sources (services/sources — the curated source
 * library) are relevant evidence for each governance dimension, and
 * computes the regulatory mapping (which laws/frameworks are
 * potentially relevant, and why).
 *
 * Everything here is deterministic keyword/region matching against the
 * curated library — never an LLM guess, and never a fabricated
 * citation. If a dimension resolves to zero sources, or every matched
 * source is unverified, the caller (services/scoring/assessmentEngine
 * → findings) surfaces that honestly in the UI rather than presenting
 * unverified evidence as authoritative (Section 27/28).
 */
export function retrieveEvidenceSources(dimension: DimensionKey, ctx: DimensionScoringContext): string[] {
  return selectSourcesForDimension(dimension, ctx);
}

export function conductRegulatoryResearch(input: UseCaseInput) {
  const mapping = computeRegulatoryMapping(input);
  const exposureScore = regulatoryExposureScore(mapping);
  return { mapping, exposureScore };
}

export { computeRegulatoryMapping, regulatoryExposureScore };
