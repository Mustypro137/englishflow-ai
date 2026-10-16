import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js keeps local secrets in .env.local; load it for the Prisma CLI too.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations use the direct (non-pooled) connection. PRISMA_MIGRATE_URL lets
    // the test setup point migrations at the isolated test schema.
    url: process.env.PRISMA_MIGRATE_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
