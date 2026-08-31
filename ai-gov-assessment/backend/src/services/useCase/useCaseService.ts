import { UseCaseInput } from "../../types";
import { getLLMProvider } from "../llm";
import { createUseCase as persistUseCase, getUseCaseById, listUseCases, StoredUseCase } from "../../repositories/useCaseRepository";

/**
 * "Use Case Structuring" — the pipeline stage between input validation
 * and assessment. Runs extraction exactly once per use case; the result
 * (raw signals + the derived StructuredUseCase rule-context) is
 * persisted so every later assessment run reuses it instead of calling
 * the LLM again.
 */
export async function createUseCase(input: UseCaseInput): Promise<StoredUseCase> {
  const provider = getLLMProvider();
  const signals = await provider.extractSignals(input);
  return persistUseCase(input, signals);
}

export { getUseCaseById, listUseCases };
