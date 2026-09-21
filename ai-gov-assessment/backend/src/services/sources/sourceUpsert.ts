import { PoolClient } from "pg";
import { SourceType, SOURCE_TYPE_RELIABILITY } from "../../config/sourceTypes";
import { chunkText } from "../embeddings/chunking";
import { embeddingProvider } from "../embeddings/hashingEmbeddingProvider";
import { dimensionsForTags } from "../../config/tagToDimensions";

export const SOURCE_TYPE_TO_ENUM: Record<string, string> = {
  "Law / Regulation": "LAW_REGULATION",
  "Regulatory Guidance": "REGULATORY_GUIDANCE",
  "Industry Standard": "INDUSTRY_STANDARD",
  Research: "RESEARCH",
  "Vendor Information": "VENDOR_INFORMATION",
  "General Web Content": "GENERAL_WEB_CONTENT"
};

export interface UpsertableSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: SourceType;
  jurisdiction: string;
  publicationDate: string | null;
  description: string;
  confidence: "high" | "needs-verification";
  tags: string[];
}

/**
 * Single source of truth for "what happens when a source (from anywhere —
 * the curated seed list, a CSV import) is written to the database":
 * upsert the sources row, then chunk + embed `${title}. ${description}`
 * (see docs/source-and-licence-inventory.md for why only that text, never
 * a source's full original text, is ever stored/embedded here) and
 * upsert its source_chunks. Shared by database/seed.ts and
 * services/sources/sourceImportService.ts so both paths behave
 * identically — a CSV-imported source is retrievable exactly the same
 * way a curated one is, with no special-casing anywhere downstream.
 */
export async function upsertSourceAndChunks(
  client: PoolClient,
  source: UpsertableSource
): Promise<{ chunksWritten: number }> {
  const tier = SOURCE_TYPE_RELIABILITY[source.sourceType].tier;

  await client.query(
    `INSERT INTO sources (id, title, publisher, url, source_type, jurisdiction, publication_date, authority_level, status, description, retrieved_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
     ON CONFLICT (id) DO UPDATE SET title=$2, publisher=$3, url=$4, source_type=$5, jurisdiction=$6,
       publication_date=$7, authority_level=$8, status=$9, description=$10, retrieved_at=now()`,
    [
      source.id,
      source.title,
      source.publisher,
      source.url,
      SOURCE_TYPE_TO_ENUM[source.sourceType],
      source.jurisdiction,
      source.publicationDate,
      tier,
      source.confidence === "high" ? "verified" : "unverified",
      source.description
    ]
  );

  const dims = dimensionsForTags(source.tags);
  const passages = chunkText(`${source.title}. ${source.description}`);
  let chunksWritten = 0;
  for (const [idx, content] of passages.entries()) {
    const embedding = embeddingProvider.embed(content);
    await client.query(
      `INSERT INTO source_chunks (source_id, chunk_index, content, dimension_tags, embedding)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (source_id, chunk_index) DO UPDATE SET content=$3, dimension_tags=$4, embedding=$5`,
      [source.id, idx, content, JSON.stringify(dims), embedding]
    );
    chunksWritten++;
  }
  // A shorter re-import (fewer chunks than a previous import of the same
  // source) would otherwise leave stale trailing chunks behind.
  await client.query(
    `DELETE FROM source_chunks WHERE source_id = $1 AND chunk_index >= $2`,
    [source.id, passages.length]
  );

  return { chunksWritten };
}
