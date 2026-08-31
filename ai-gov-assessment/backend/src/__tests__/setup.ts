process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://aigov:aigov_local_dev@localhost:5432/ai_gov_test";
process.env.LLM_PROVIDER = "deterministic";
process.env.API_KEY = "test-api-key";
process.env.NODE_ENV = "test";
