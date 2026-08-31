/**
 * EmbeddingProvider — deliberately mirrors the LLMProvider abstraction
 * elsewhere in this codebase (services/llm/LLMProvider.ts). Same reason:
 * do not couple the retrieval pipeline to one specific embedding model
 * or an external network dependency.
 *
 * This app ships ONE implementation, DeterministicHashingEmbeddingProvider,
 * which requires no model download and no network access — verified
 * necessary in this environment: huggingface.co returns 403 here, so a
 * real neural sentence-transformer (e.g. via @xenova/transformers) cannot
 * download its weights. A NeuralEmbeddingProvider implementing this same
 * interface is a documented drop-in upgrade wherever that network access
 * exists (see docs/ai-and-rag.md) — swapping it in changes zero lines
 * outside this file plus the embedding dimension in the schema.
 */
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(text: string): number[];
}
