import { pgPool } from "../../database/pool";
import { embeddingProvider } from "../embeddings/hashingEmbeddingProvider";
import { UseCaseInput } from "../../types";
import { DimensionDefinition } from "../../config/dimensions";

export interface RetrievedEvidence {
  sourceChunkId: string;
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: string;
  jurisdiction: string;
  authorityLevel: number;
  status: string;
  content: string;
  relevanceScore: number;
}

/**
 * Minimum cosine similarity to treat a match as real evidence rather
 * than noise. Below this, the dimension is reported as having no
 * verifiable retrieved evidence (see FindingCard's "Research
 * unavailable" state) rather than attaching a weak, misleading match —
 * this is the anti-hallucination guarantee: never present a low-
 * confidence nearest-neighbor as if it were authoritative citation.
 */
const RELEVANCE_THRESHOLD = 0.12;
const TOP_K = 3;

/**
 * Real RAG retrieval: embed a dimension-focused query built from the
 * use case + the dimension's own definition, semantically search
 * source_chunks via pgvector cosine distance, optionally boosted by
 * chunks pre-tagged as relevant to this dimension. Every result keeps
 * its full source metadata and similarity score — nothing here is
 * paraphrased or invented; what's retrieved is exactly what's returned.
 */
export async function retrieveEvidenceForDimension(
  input: UseCaseInput,
  dimension: DimensionDefinition
): Promise<RetrievedEvidence[]> {
  const queryText = [
    dimension.label,
    dimension.description,
    input.description,
    input.dataUsed,
    input.purpose
  ].join(". ");
  const queryVector = embeddingProvider.embed(queryText);
  const vectorLiteral = `[${queryVector.join(",")}]`;

  const res = await pgPool.query(
    `SELECT sc.id AS source_chunk_id, sc.content, sc.source_id,
            s.title, s.publisher, s.url, s.source_type, s.jurisdiction,
            s.authority_level, s.status,
            1 - (sc.embedding <=> $1::vector) AS similarity,
            (sc.dimension_tags @> to_jsonb($2::text)) AS dimension_tagged
     FROM source_chunks sc
     JOIN sources s ON s.id = sc.source_id
     ORDER BY dimension_tagged DESC, sc.embedding <=> $1::vector
     LIMIT $3`,
    [vectorLiteral, dimension.key, TOP_K]
  );

  return res.rows
    .filter((r) => Number(r.similarity) >= RELEVANCE_THRESHOLD)
    .map((r) => ({
      sourceChunkId: r.source_chunk_id,
      sourceId: r.source_id,
      title: r.title,
      publisher: r.publisher,
      url: r.url,
      sourceType: r.source_type,
      jurisdiction: r.jurisdiction,
      authorityLevel: r.authority_level,
      status: r.status,
      content: r.content,
      relevanceScore: Math.round(Number(r.similarity) * 10000) / 10000
    }));
}
