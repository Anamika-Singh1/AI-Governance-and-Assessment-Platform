/**
 * CLI wrapper around the same importSourcesFromCsv() the API's
 * POST /api/sources/import route uses — for adding sources from a
 * local file without going through HTTP (e.g. a one-time bulk load).
 * Run with: npm run sources:import -- path/to/file.csv
 */
import fs from "fs";
import { importSourcesFromCsv } from "../services/sources/sourceImportService";
import { pgPool } from "./pool";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run sources:import -- path/to/sources.csv");
    process.exit(1);
  }
  const csvText = fs.readFileSync(filePath, "utf8");
  const result = await importSourcesFromCsv(csvText);

  console.log(
    `Imported ${result.insertedCount} new source(s), updated ${result.updatedCount}, wrote ${result.chunksWritten} chunk(s).`
  );
  if (result.errors.length > 0) {
    console.warn(`${result.errors.length} row(s) skipped:`);
    for (const e of result.errors) console.warn(`  row ${e.row}: ${e.message}`);
  }
}

main()
  .then(() => pgPool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("CSV import failed:", err);
    process.exit(1);
  });
