import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL || "";
export const isDatabaseConfigured =
  Boolean(rawUrl) &&
  !rawUrl.includes("localhost") &&
  !rawUrl.includes("127.0.0.1") &&
  !rawUrl.includes("user:password");

const databaseUrl = isDatabaseConfigured
  ? rawUrl
  : (process.env.NODE_ENV !== "production"
      ? (rawUrl || "postgresql://postgres:postgres@localhost:5432/gatepass_db")
      : "postgresql://postgres:postgres@localhost:5432/gatepass_db");

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
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
  });

// Retain pool in globalThis across warm serverless invocations
globalForDb.__arenaNextJsPostgresqlPool = pool;

export const db = drizzle(pool);


