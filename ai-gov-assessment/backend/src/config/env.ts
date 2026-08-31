import dotenv from "dotenv";
dotenv.config();

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  apiKey: process.env.API_KEY || "changeme-local-dev-key",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://aigov:aigov_local_dev@localhost:5432/ai_gov",
  pgPoolMax: parseInt(process.env.PG_POOL_MAX || "10", 10),
  embeddingDim: 256,
  llmProvider: (process.env.LLM_PROVIDER || "deterministic") as "deterministic" | "anthropic" | "openai" | "local",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  localLlmUrl: process.env.LOCAL_LLM_URL || "",
  localLlmModel: process.env.LOCAL_LLM_MODEL || "llama3.1",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  assessmentEngineVersion: "2.0.0-postgres"
};
