import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/** Isolated Postgres schema used only by integration tests. Development data is never touched. */
export const TEST_SCHEMA = "englishflow_test";

/**
 * Connection string for integration tests: TEST_DATABASE_URL if set (CI uses a
 * throwaway Postgres service), otherwise the local direct connection.
 */
export function testDatabaseUrl(): string {
  const base = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!base) {
    throw new Error("Integration tests need a database. Set TEST_DATABASE_URL or DIRECT_URL in .env.local.");
  }
  return base;
}

export function withSchema(url: string, schema: string): string {
  const u = new URL(url);
  u.searchParams.set("schema", schema);
  return u.toString();
}
