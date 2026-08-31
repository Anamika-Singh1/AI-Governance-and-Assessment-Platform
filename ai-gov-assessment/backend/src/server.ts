import { createApp } from "./app";
import { config } from "./config/env";
import { isPgConnected } from "./database/pool";

async function main() {
  const connected = await isPgConnected();
  if (!connected) {
    console.error(`[server] Could not connect to Postgres at ${config.databaseUrl.replace(/:[^:@]+@/, ":****@")}.`);
    console.error("[server] Run `npm run db:migrate` then `npm run db:seed` against a running Postgres instance first.");
    process.exit(1);
  }

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[server] AI Governance Assessment API listening on port ${config.port} (env: ${config.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
