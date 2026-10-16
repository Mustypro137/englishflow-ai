/**
 * Load curriculum content from content/ into the database.
 * Run with: npm run db:seed   (safe to run again — it updates, never duplicates)
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { validateContent } from "../content/validate";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedCurriculum } from "../src/server/content/seed-curriculum";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DIRECT_URL or DATABASE_URL (see .env.example).");

  const content = validateContent();
  const schema = process.env.DATABASE_SCHEMA;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }, schema ? { schema } : undefined),
  });
  try {
    const started = Date.now();
    const summary = await seedCurriculum(prisma, content);
    console.log(`Curriculum seeded in ${((Date.now() - started) / 1000).toFixed(1)}s:`, summary);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
