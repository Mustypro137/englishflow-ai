import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

/**
 * Browser tests run against their own Postgres schema, so they never create or
 * delete anything in the schema the live site uses ("public").
 */
export const E2E_SCHEMA = "englishflow_e2e";

export function e2eDatabaseUrl(): string {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Browser tests need DIRECT_URL or DATABASE_URL (see .env.example).");
  return url;
}

export function withSchema(url: string, schema: string): string {
  const u = new URL(url);
  u.searchParams.set("schema", schema);
  return u.toString();
}
