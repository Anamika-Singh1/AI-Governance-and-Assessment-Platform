import { Pool } from "pg";
import { config } from "../config/env";

/**
 * Single shared connection pool. Pooling matters at scale — without it,
 * every request opens/closes a TCP+auth handshake to Postgres, which is
 * the first thing that falls over well before 1,000 concurrent requests.
 */
export const pgPool = new Pool({
  connectionString: config.databaseUrl,
  max: config.pgPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

let checked = false;

export async function isPgConnected(): Promise<boolean> {
  try {
    await pgPool.query("SELECT 1");
    checked = true;
    return true;
  } catch {
    return false;
  }
}

export function pgEverConnected(): boolean {
  return checked;
}
