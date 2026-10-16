import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isConnectionClosed } from "./connection-errors";

/** Operations that are safe to repeat if the connection drops (no inserts). */
const RETRYABLE = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "upsert",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your database address.");
  }

  // Neon closes idle connections (and all of them when the free database sleeps).
  // Drop idle connections well before that so a request rarely picks up a dead one.
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  });
  // A connection closed by the server while idle must not crash the process.
  pool.on("error", (err) => console.warn(`[db] Idle connection closed: ${err.message}`));

  // DATABASE_SCHEMA is only set by the integration tests, which use an isolated schema.
  const schema = process.env.DATABASE_SCHEMA;
  const adapter = new PrismaPg(pool, schema ? { schema } : undefined);

  const client = new PrismaClient({ adapter }).$extends({
    query: {
      // If the server reset a pooled connection, retry once on a fresh one —
      // but only for operations that are safe to repeat.
      async $allOperations({ operation, args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (!RETRYABLE.has(operation) || !isConnectionClosed(err)) throw err;
          console.warn(`[db] Connection reset during ${operation}; retrying once.`);
          return query(args);
        }
      },
    },
  });
  // The extension only adds retry behaviour; the client's API is unchanged.
  return client as unknown as PrismaClient;
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
