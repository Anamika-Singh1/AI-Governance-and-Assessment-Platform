import fs from "node:fs/promises";
import path from "node:path";
import { pgPool } from "./pool";
import { CURATED_SOURCES } from "../rules/authoritativeSources";
import { upsertSourceAndChunks } from "../services/sources/sourceUpsert";

// Restore only research data; leave accounts, assessments and custom rules intact.
async function repairResearch() {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(await fs.readFile(path.resolve("src/database/migrations/004_restore_research_tables.sql"), "utf8"));
    let chunks = 0;
    for (const source of CURATED_SOURCES) {
      chunks += (await upsertSourceAndChunks(client, source)).chunksWritten;
    }
    await client.query("COMMIT");
    console.log(`Research library ready: ${CURATED_SOURCES.length} curated sources, ${chunks} chunks.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

repairResearch().catch(error => {
  console.error("Research repair failed:", error);
  process.exitCode = 1;
}).finally(() => pgPool.end());
