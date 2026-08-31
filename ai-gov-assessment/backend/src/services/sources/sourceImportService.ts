import { pgPool } from "../../database/pool";
import { parseSourcesCsv, CsvRowError } from "./csvParser";
import { upsertSourceAndChunks } from "./sourceUpsert";

export interface ImportResult {
  insertedCount: number;
  updatedCount: number;
  chunksWritten: number;
  sourceIds: string[];
  errors: CsvRowError[];
}

/**
 * Adds/updates sources from a CSV file, with no code change and no
 * redeploy — the requirement this satisfies directly. Each valid row
 * goes through the exact same upsertSourceAndChunks() path the seed
 * script uses for the curated library, so an imported source is
 * chunked, embedded, and retrievable identically to a built-in one.
 *
 * Whole-file atomicity: if any DB write fails partway through, the
 * transaction rolls back rather than leaving a half-imported batch.
 * Row-level VALIDATION errors (bad url, missing column, ...) are
 * collected and returned rather than treated as fatal — a CSV with 40
 * good rows and 2 typos still imports the 40.
 */
export async function importSourcesFromCsv(csvText: string): Promise<ImportResult> {
  const { valid, errors } = parseSourcesCsv(csvText);
  if (valid.length === 0) {
    return { insertedCount: 0, updatedCount: 0, chunksWritten: 0, sourceIds: [], errors };
  }

  const client = await pgPool.connect();
  const sourceIds: string[] = [];
  let insertedCount = 0;
  let updatedCount = 0;
  let chunksWritten = 0;
  try {
    await client.query("BEGIN");
    for (const source of valid) {
      const existing = await client.query(`SELECT 1 FROM sources WHERE id = $1`, [source.id]);
      const { chunksWritten: n } = await upsertSourceAndChunks(client, source);
      chunksWritten += n;
      sourceIds.push(source.id);
      if ((existing.rowCount ?? 0) > 0) updatedCount++;
      else insertedCount++;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { insertedCount, updatedCount, chunksWritten, sourceIds, errors };
}
