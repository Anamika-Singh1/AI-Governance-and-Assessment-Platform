import { pgPool } from "../database/pool";
import { SourceRecord } from "../types";
import { SourceType } from "../config/sourceTypes";

const ENUM_TO_SOURCE_TYPE: Record<string, SourceType> = {
  LAW_REGULATION: "Law / Regulation",
  REGULATORY_GUIDANCE: "Regulatory Guidance",
  INDUSTRY_STANDARD: "Industry Standard",
  RESEARCH: "Research",
  VENDOR_INFORMATION: "Vendor Information",
  GENERAL_WEB_CONTENT: "General Web Content"
};

const TIER_LABEL: Record<number, string> = {
  1: "Tier 1 — Official legislation / government or regulatory source",
  2: "Tier 2 — Regulatory guidance / recognized standards organization",
  3: "Tier 3 — Peer-reviewed research",
  5: "Tier 5 — Vendor information",
  6: "Tier 6 — General web content"
};

function rowToRecord(r: any): SourceRecord {
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    publisher: r.publisher,
    sourceType: ENUM_TO_SOURCE_TYPE[r.source_type],
    jurisdiction: r.jurisdiction,
    publicationDate: r.publication_date ? new Date(r.publication_date).toISOString().slice(0, 10) : null,
    lastVerifiedDate: r.status === "verified" ? new Date(r.retrieved_at).toISOString().slice(0, 10) : null,
    description: r.description,
    reliabilityLevel: TIER_LABEL[r.authority_level] || `Tier ${r.authority_level}`,
    reliabilityTier: r.authority_level,
    verified: r.status === "verified"
  };
}

/**
 * Retained for API/test compatibility with the pre-Postgres backend —
 * the curated library is now the seed script's job (database/seed.ts),
 * so this is a thin idempotent no-op wrapper that just confirms the
 * catalog is present, rather than re-inserting it on every call.
 */
export async function seedSources(_opts: { verifyLive?: boolean } = {}): Promise<SourceRecord[]> {
  return listSources();
}

export async function listSources(): Promise<SourceRecord[]> {
  const res = await pgPool.query(`SELECT * FROM sources ORDER BY authority_level, title`);
  return res.rows.map(rowToRecord);
}

export async function getSourceById(id: string): Promise<SourceRecord | null> {
  const res = await pgPool.query(`SELECT * FROM sources WHERE id = $1`, [id]);
  return res.rows[0] ? rowToRecord(res.rows[0]) : null;
}

export async function getSourcesByIds(ids: string[]): Promise<SourceRecord[]> {
  if (ids.length === 0) return [];
  const res = await pgPool.query(`SELECT * FROM sources WHERE id = ANY($1::text[])`, [ids]);
  return res.rows.map(rowToRecord);
}
