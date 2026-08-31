import { ExtractedSignals, UseCaseInput } from "../../types";
import { LLMProvider } from "./LLMProvider";
import { extractSignalsDeterministic } from "./DeterministicExtractor";
import { buildExtractionPrompt, parseExtractionResponse } from "../../prompts/extractionPrompt";

const API_URL = "https://api.anthropic.com/v1/messages";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async extractSignals(input: UseCaseInput): Promise<ExtractedSignals> {
    if (!this.isAvailable()) return extractSignalsDeterministic(input);
    try {
      const prompt = buildExtractionPrompt(input);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
      const data: any = await res.json();
      const text = data?.content?.[0]?.text ?? "";
      const parsed = parseExtractionResponse(text, input);
      return parsed ?? extractSignalsDeterministic(input);
    } catch (err) {
      // Never fail the assessment because of an LLM outage — fall back deterministically.
      return extractSignalsDeterministic(input);
    }
  }

  async polishNarrative(deterministicText: string, context: string): Promise<string> {
    if (!this.isAvailable()) return deterministicText;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Rewrite the following governance finding in clearer prose without changing any facts, numbers, or conclusions. Context: ${context}\n\nText: ${deterministicText}\n\nReturn only the rewritten text.`
            }
          ]
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return deterministicText;
      const data: any = await res.json();
      return data?.content?.[0]?.text?.trim() || deterministicText;
    } catch {
      return deterministicText;
    }
  }
}
