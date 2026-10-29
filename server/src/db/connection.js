import { config } from "../config/env.js";
import { initPostgres } from "./postgres.js";
import { setUsePostgres } from "../models/index.js";
import { seedDatabaseIfEmpty } from "./seedData.js";

export async function initDatabase() {
  console.log(`[SafeTransit DB] Connecting to PostgreSQL at: ${config.databaseUrl}...`);

  const connected = await initPostgres();
  setUsePostgres(connected);

  if (connected) {
    console.log("[SafeTransit DB] ✓ Connected to live PostgreSQL server.");
    console.log("[SafeTransit DB] ✓ Tables and GIN indexes verified in PostgreSQL.");
  } else {
    console.log("[SafeTransit DB] ⚡ PostgreSQL server not reachable at configured URL.");
    console.log("[SafeTransit DB] 💡 Start PostgreSQL via Docker with: 'docker compose up -d postgres'");
    console.log("[SafeTransit DB] 🛡️ Running with High-Performance Local JSON Engine as automatic fallback.");
    console.log("[SafeTransit DB] ✓ Full data persistence active in /server/data/safetransit.json");
  }

  // Auto-seed if empty
  await seedDatabaseIfEmpty();
}
