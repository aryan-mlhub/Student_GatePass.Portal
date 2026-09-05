import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureSeeded();
    return Response.json({
      status: "healthy",
      database: "connected",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return Response.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: err?.message || String(err),
        hint: "Please check your DATABASE_URL environment variable in Vercel settings.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

