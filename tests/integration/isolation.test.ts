import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { TEST_SCHEMA, testDatabaseUrl } from "./test-db";

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@example.test" } } });
  await prisma.$disconnect();
});

it("writes to the isolated test schema, never to the development schema", async () => {
  const email = `${randomUUID()}@example.test`;
  await prisma.user.create({ data: { id: randomUUID(), name: "Probe", email, emailVerified: false } });

  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    const inTest = await client.query(`select 1 from "${TEST_SCHEMA}"."user" where email = $1`, [email]);
    const inPublic = await client.query(`select 1 from public."user" where email = $1`, [email]);
    expect(inTest.rowCount).toBe(1);
    expect(inPublic.rowCount).toBe(0);
  } finally {
    await client.end();
  }
});
