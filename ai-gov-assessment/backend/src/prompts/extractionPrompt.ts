import { ExtractedSignals, UseCaseInput } from "../types";
import { extractSignalsDeterministic } from "../services/llm/DeterministicExtractor";
import { REGULATORY_MAPPING_RULES } from "../rules/regulatoryMappingRules";

/**
 * Builds the extraction prompt sent to an LLM provider. The LLM's ONLY
 * job here is natural-language understanding (entities, candidate risk
 * factors, candidate regulations, automation level, a plain-language
 * summary) — it is explicitly instructed not to assign scores or a
 * final risk level, since that is computed deterministically downstream.
 */
export function buildExtractionPrompt(input: UseCaseInput): string {
  const validRegIds = REGULATORY_MAPPING_RULES.map((r) => r.sourceId).join(", ");
  return `You are a governance research assistant supporting an AI risk assessment platform. You extract structured signals from a natural-language AI use case description. You do NOT assign risk scores or a final risk level — that is calculated separately by a deterministic rules engine.

Use case details:
- Name: ${input.useCaseName}
- Industry: ${input.industry}
- Description: ${input.description}
- Intended users: ${input.intendedUsers}
- Data used: ${input.dataUsed}
- Purpose: ${input.purpose}
- Affected parties: ${input.affectedParties}
- Decision type: ${input.decisionType}
- Human review present: ${input.humanReview}
- Region: ${input.region}

Respond with ONLY a JSON object matching this exact shape (no markdown fences, no commentary):
{
  "entities": { "dataTypes": string[], "affectedGroups": string[], "decisionKind": string },
  "candidateRiskFactors": string[],
  "candidateRegulations": string[] (choose only from this fixed id list: [${validRegIds}]),
  "isGenerativeAI": boolean,
  "usesProtectedCharacteristics": boolean,
  "automationLevel": "advisory" | "human-in-loop" | "human-on-loop" | "fully-automated",
  "summary": string (2-3 sentences, plain language)
}`;
}

/**
 * Parses and validates the LLM's JSON response. Falls back to null on
 * any parse/validation failure so callers can degrade to the
 * deterministic extractor rather than trusting malformed output.
 */
export function parseExtractionResponse(raw: string, input: UseCaseInput): ExtractedSignals | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    const validRegIds = new Set(REGULATORY_MAPPING_RULES.map((r) => r.sourceId));
    const candidateRegulations: string[] = Array.isArray(parsed.candidateRegulations)
      ? parsed.candidateRegulations.filter((id: string) => validRegIds.has(id))
      : [];

    const automationLevels = ["advisory", "human-in-loop", "human-on-loop", "fully-automated"];
    const automationLevel = automationLevels.includes(parsed.automationLevel) ? parsed.automationLevel : extractSignalsDeterministic(input).automationLevel;

    if (!parsed.entities || !Array.isArray(parsed.candidateRiskFactors)) return null;

    return {
      entities: {
        dataTypes: Array.isArray(parsed.entities.dataTypes) ? parsed.entities.dataTypes : [],
        affectedGroups: Array.isArray(parsed.entities.affectedGroups) ? parsed.entities.affectedGroups : [],
        decisionKind: typeof parsed.entities.decisionKind === "string" ? parsed.entities.decisionKind : "OTHER"
      },
      candidateRiskFactors: parsed.candidateRiskFactors,
      candidateRegulations,
      isGenerativeAI: !!parsed.isGenerativeAI,
      usesProtectedCharacteristics: !!parsed.usesProtectedCharacteristics,
      automationLevel,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      extractionMethod: "llm"
    };
  } catch {
    return null;
  }
}
