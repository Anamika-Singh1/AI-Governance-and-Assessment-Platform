import { ExtractedSignals, UseCaseInput } from "../../types";
import { LLMProvider } from "./LLMProvider";
import { extractSignalsDeterministic } from "./DeterministicExtractor";
import { buildExtractionPrompt, parseExtractionResponse } from "../../prompts/extractionPrompt";

const API_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
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
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
      const data: any = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? "";
      const parsed = parseExtractionResponse(text, input);
      return parsed ?? extractSignalsDeterministic(input);
    } catch (err) {
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
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: `Rewrite the following governance finding in clearer prose without changing any facts, numbers, or conclusions. Context: ${context}\n\nText: ${deterministicText}\n\nReturn only the rewritten text.`
            }
          ],
          temperature: 0.3
        }),
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return deterministicText;
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || deterministicText;
    } catch {
      return deterministicText;
    }
  }
}
