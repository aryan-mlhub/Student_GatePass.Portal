import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { gatePasses } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
    try {
      const rows = await db
        .select()
        .from(gatePasses)
        .orderBy(desc(gatePasses.requestTimestamp));
      if (rows && rows.length > 0) {
        return NextResponse.json({ passes: rows });
      }
    } catch (err) {
      console.warn("[Admin Passes DB Notice] Using memory store fallback.", err);
    }
  }

  return NextResponse.json({ passes: mockStore.gatePasses });
}
