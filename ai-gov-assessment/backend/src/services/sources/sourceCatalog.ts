import { CURATED_SOURCES, CuratedSource } from "../../rules/authoritativeSources";
import { SOURCE_TYPE_RELIABILITY } from "../../config/sourceTypes";
import { SourceRecord } from "../../types";

export function toSourceRecord(curated: CuratedSource, opts?: { verified?: boolean; lastVerifiedDate?: string | null }): SourceRecord {
  const reliability = SOURCE_TYPE_RELIABILITY[curated.sourceType];
  const verified = opts?.verified ?? curated.confidence === "high";
  return {
    id: curated.id,
    title: curated.title,
    url: curated.url,
    publisher: curated.publisher,
    sourceType: curated.sourceType,
    jurisdiction: curated.jurisdiction,
    publicationDate: curated.publicationDate,
    lastVerifiedDate: opts?.lastVerifiedDate ?? (verified ? new Date().toISOString().slice(0, 10) : null),
    description: curated.description,
    reliabilityLevel: reliability.label,
    reliabilityTier: reliability.tier,
    verified
  };
}

export function getCuratedSourceById(id: string): CuratedSource | undefined {
  return CURATED_SOURCES.find((s) => s.id === id);
}

export function allSourceRecords(verificationMap?: Record<string, { verified: boolean; lastVerifiedDate: string | null }>): SourceRecord[] {
  return CURATED_SOURCES.map((s) => toSourceRecord(s, verificationMap?.[s.id]));
}
