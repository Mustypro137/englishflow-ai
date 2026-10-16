import { execSync } from "node:child_process";
import { Client } from "pg";
import { E2E_SCHEMA, e2eDatabaseUrl, withSchema } from "./db";

/** Recreate the isolated browser-test schema, apply migrations and load the curriculum. */
export default async function globalSetup() {
  const url = e2eDatabaseUrl();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // Only the dedicated browser-test schema is dropped — never "public".
    await client.query(`DROP SCHEMA IF EXISTS "${E2E_SCHEMA}" CASCADE`);
    await client.query(`CREATE SCHEMA "${E2E_SCHEMA}"`);
  } finally {
    await client.end();
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, PRISMA_MIGRATE_URL: withSchema(url, E2E_SCHEMA) },
  });
  // The seed script honours DATABASE_SCHEMA, so the curriculum goes into the test schema only.
  execSync("npx tsx prisma/seed.ts", {
    stdio: "pipe",
    env: { ...process.env, DIRECT_URL: url, DATABASE_SCHEMA: E2E_SCHEMA },
  });
}
