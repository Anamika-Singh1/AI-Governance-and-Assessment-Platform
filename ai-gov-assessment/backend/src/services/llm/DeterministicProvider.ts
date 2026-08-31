import { ExtractedSignals, UseCaseInput } from "../../types";
import { LLMProvider } from "./LLMProvider";
import { extractSignalsDeterministic } from "./DeterministicExtractor";

/** Always-available fallback/demo provider. Zero external calls, fully repeatable. */
export class DeterministicProvider implements LLMProvider {
  readonly name = "deterministic";

  isAvailable(): boolean {
    return true;
  }

  async extractSignals(input: UseCaseInput): Promise<ExtractedSignals> {
    return extractSignalsDeterministic(input);
  }

  async polishNarrative(deterministicText: string): Promise<string> {
    return deterministicText;
  }
}
