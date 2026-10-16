import { Client } from "pg";
import { E2E_SCHEMA, e2eDatabaseUrl } from "./db";

/** Remove throwaway accounts created by the browser tests — only in the browser-test schema. */
export default async function globalTeardown() {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    await client.query(`DELETE FROM "${E2E_SCHEMA}"."user" WHERE email LIKE 'e2e+%@example.test'`);
  } finally {
    await client.end();
  }
}
