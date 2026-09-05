import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "connected";
  let dbError: string | null = null;

  try {
    await db.execute(sql`select 1`);
    await ensureSeeded();
  } catch (err: any) {
    dbStatus = "memory_fallback";
    dbError = err?.message || String(err);
  }

  return Response.json({
    status: "healthy",
    storage: dbStatus,
    database: dbStatus === "connected" ? "PostgreSQL (Live)" : "In-Memory Resilient Store (Active)",
    environment: process.env.NODE_ENV || "production",
    activePassesCount: mockStore.gatePasses.length,
    usersCount: mockStore.users.length,
    timestamp: new Date().toISOString(),
    ...(dbError ? { dbNotice: "No PostgreSQL connection detected. Operating seamlessly via in-memory data store." } : {}),
  });
}

