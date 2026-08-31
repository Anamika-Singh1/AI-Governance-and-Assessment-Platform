import { ExtractedSignals, UseCaseInput } from "../../types";
import { LLMProvider } from "./LLMProvider";
import { extractSignalsDeterministic } from "./DeterministicExtractor";
import { buildExtractionPrompt, parseExtractionResponse } from "../../prompts/extractionPrompt";

/**
 * Local/open-source model provider — the "external-service fallback"
 * requirement made concrete. Talks to any OpenAI-chat-completions-
 * compatible local server (Ollama, LM Studio, vLLM's OpenAI-compatible
 * server, ...) so the app is never hard-dependent on Anthropic or
 * OpenAI's hosted APIs. No API key is required or sent.
 *
 * isAvailable() only checks that a URL is CONFIGURED, not that the
 * local server is actually reachable right now — reachability can only
 * be known at call time, so extractSignals() degrades to the
 * deterministic fallback on any connection failure or timeout, exactly
 * like the hosted providers degrade on an API error. This is what lets
 * the app "continue deterministic rules, continue retrieval, clearly
 * indicate degraded AI functionality" when the external/local service
 * is unavailable, per the assignment's fallback requirement — degraded
 * AI functionality is visible in the response via
 * extractionMethod: "deterministic-fallback", never silently hidden.
 */
export class LocalLLMProvider implements LLMProvider {
  readonly name = "local";
  private url: string;
  private model: string;

  constructor(url: string, model: string) {
    this.url = url;
    this.model = model;
  }

  isAvailable(): boolean {
    return !!this.url;
  }

  async extractSignals(input: UseCaseInput): Promise<ExtractedSignals> {
    if (!this.isAvailable()) return extractSignalsDeterministic(input);
    try {
      const prompt = buildExtractionPrompt(input);
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        }),
        // Local models are typically slower to first-token than hosted
        // APIs (no warm inference fleet), so this gets a longer timeout
        // than the hosted providers before falling back deterministically.
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error(`Local LLM server error: ${res.status}`);
      const data: any = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? "";
      const parsed = parseExtractionResponse(text, input);
      return parsed ?? extractSignalsDeterministic(input);
    } catch {
      // Unreachable / not running / timed out — fall back rather than fail the request.
      return extractSignalsDeterministic(input);
    }
  }

  async polishNarrative(deterministicText: string, context: string): Promise<string> {
    if (!this.isAvailable()) return deterministicText;
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) return deterministicText;
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || deterministicText;
    } catch {
      return deterministicText;
    }
  }
}
