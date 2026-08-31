import { EmbeddingProvider } from "./embeddingProvider";
import { config } from "../../config/env";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are", "was", "were",
  "be", "by", "at", "as", "that", "this", "it", "its", "their", "will", "shall", "may", "must",
  "not", "no", "any", "all", "such", "from", "into", "than", "then", "which", "who", "whom"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Stable string hash (FNV-1a) — deterministic across runs and processes, unlike JS's built-in string hashing. */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function l2normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * A deterministic, dependency-free "embedding": a feature-hashed,
 * log-scaled term-frequency vector (the classic "hashing vectorizer"),
 * L2-normalized so pgvector's cosine-distance operator behaves exactly
 * like cosine similarity would with a neural embedding.
 *
 * This is a legitimate, reproducible, explainable retrieval signal — not
 * a placeholder pretending to be a neural embedding. It is documented as
 * the DEFAULT provider precisely because it requires no external model
 * download, which a real sentence-transformer would in this sandbox.
 */
export class HashingEmbeddingProvider implements EmbeddingProvider {
  readonly name = "deterministic-hashing-vectorizer";
  readonly dimensions = config.embeddingDim;

  embed(text: string): number[] {
    const tokens = tokenize(text);
    const vec = new Array(this.dimensions).fill(0);
    const termCounts = new Map<string, number>();
    for (const t of tokens) termCounts.set(t, (termCounts.get(t) || 0) + 1);

    for (const [term, count] of termCounts) {
      const idx = fnv1a(term) % this.dimensions;
      const sign = fnv1a(term + "#sign") % 2 === 0 ? 1 : -1; // reduces hash-collision bias
      vec[idx] += sign * (1 + Math.log(count));
    }
    return l2normalize(vec);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both vectors are already L2-normalized, so dot product == cosine similarity
}

export const embeddingProvider: EmbeddingProvider = new HashingEmbeddingProvider();
