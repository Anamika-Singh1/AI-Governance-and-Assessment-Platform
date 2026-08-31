import { LLMProvider } from "./LLMProvider";
import { AnthropicProvider } from "./AnthropicProvider";
import { OpenAIProvider } from "./OpenAIProvider";
import { LocalLLMProvider } from "./LocalLLMProvider";
import { DeterministicProvider } from "./DeterministicProvider";
import { config } from "../../config/env";

let cachedProvider: LLMProvider | null = null;

/**
 * Factory selecting the active LLMProvider based on LLM_PROVIDER env var,
 * degrading gracefully to the deterministic provider when the requested
 * provider has no API key configured. This is the only place the rest of
 * the app depends on a concrete provider implementation (Section 16).
 */
export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  switch (config.llmProvider) {
    case "anthropic": {
      const provider = new AnthropicProvider(config.anthropicApiKey, config.anthropicModel);
      cachedProvider = provider.isAvailable() ? provider : new DeterministicProvider();
      break;
    }
    case "openai": {
      const provider = new OpenAIProvider(config.openaiApiKey, config.openaiModel);
      cachedProvider = provider.isAvailable() ? provider : new DeterministicProvider();
      break;
    }
    case "local": {
      const provider = new LocalLLMProvider(config.localLlmUrl, config.localLlmModel);
      cachedProvider = provider.isAvailable() ? provider : new DeterministicProvider();
      break;
    }
    default:
      cachedProvider = new DeterministicProvider();
  }
  return cachedProvider;
}

export type { LLMProvider };
