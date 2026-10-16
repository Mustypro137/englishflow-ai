import { execSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";
import { validateContent } from "@content/validate";
import { PrismaClient } from "@/generated/prisma/client";
import { seedCurriculum } from "@/server/content/seed-curriculum";
import { TEST_SCHEMA, testDatabaseUrl, withSchema } from "./test-db";

/** Recreate the isolated test schema, apply all migrations and load the curriculum once. */
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

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }, { schema: TEST_SCHEMA }) });
  try {
    await seedCurriculum(prisma, validateContent());
  } finally {
    await prisma.$disconnect();
  }
}
