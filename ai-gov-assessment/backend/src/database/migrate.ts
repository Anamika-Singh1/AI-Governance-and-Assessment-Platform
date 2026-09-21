import fs from "node:fs/promises";
import path from "node:path";
import { pgPool } from "./pool";

async function migrate(){
  const dir=path.resolve(process.cwd(),"src/database/migrations");
  const files=(await fs.readdir(dir)).filter(f=>f.endsWith(".sql")).sort();
  await pgPool.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const client = await pgPool.connect();
  try {
    for (const file of files) {
      if ((await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [file])).rowCount) continue;
      await client.query("BEGIN");
      try {
        // Existing installations predate migration tracking; preserve their initial schema.
        const existing = file === "001_init.sql" && Boolean((await client.query("SELECT to_regclass('public.assessments') AS name")).rows[0]?.name);
        if (!existing) await client.query(await fs.readFile(path.join(dir, file), "utf8"));
        await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`${existing ? "Recorded existing" : "Applied"} ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally { client.release(); }
  await pgPool.end();
}
migrate().catch(error=>{console.error("Migration failed",error);process.exit(1);});
