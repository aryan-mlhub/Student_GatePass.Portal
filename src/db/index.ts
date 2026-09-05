import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/gatepass_db";

const isLocal =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

// Retain pool in globalThis across warm serverless invocations
globalForDb.__arenaNextJsPostgresqlPool = pool;

export const db = drizzle(pool);

