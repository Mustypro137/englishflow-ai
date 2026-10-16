import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

/** Remove throwaway accounts created by the browser tests (cascades to all their records). */
export default async function globalTeardown() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`DELETE FROM public."user" WHERE email LIKE 'e2e+%@example.test'`);
  } finally {
    await client.end();
  }
}
