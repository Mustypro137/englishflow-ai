import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_SCHEMA, testDatabaseUrl, withSchema } from "./test-db";

/** Recreate the isolated test schema and apply all migrations to it. */
export default async function setup() {
  const url = testDatabaseUrl();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // Only the dedicated test schema is dropped — never "public".
    await client.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await client.query(`CREATE SCHEMA "${TEST_SCHEMA}"`);
  } finally {
    await client.end();
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, PRISMA_MIGRATE_URL: withSchema(url, TEST_SCHEMA) },
  });
}
