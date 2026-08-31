import { ExtractedSignals, UseCaseInput } from "../../types";

/**
 * LLMProvider abstraction (Section 16/9).
 *
 * IMPORTANT SEPARATION OF CONCERNS: an LLMProvider is only ever used to
 * (a) extract structured signals from free-text input and (b) produce a
 * human-readable natural-language summary. It NEVER computes a score,
 * risk level, or decides regulatory applicability — those are entirely
 * the responsibility of the deterministic engine in services/scoring.
 * This keeps assessments repeatable: the same input always produces the
 * same scores and risk level even though the LLM's prose may vary.
 */
export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  extractSignals(input: UseCaseInput): Promise<ExtractedSignals>;
  /** Optional: paraphrase a deterministic finding into smoother prose. Never changes the underlying facts/score. */
  polishNarrative(deterministicText: string, context: string): Promise<string>;
}
