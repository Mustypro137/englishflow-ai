import { TEST_SCHEMA, testDatabaseUrl } from "./test-db";

// Point the app's Prisma client at the isolated test schema before any test imports it.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.DATABASE_SCHEMA = TEST_SCHEMA;
