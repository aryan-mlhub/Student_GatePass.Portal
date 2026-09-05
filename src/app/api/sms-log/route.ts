import { NextResponse } from "next/server";
import { db } from "@/db";
import { parentSmsLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (
    session.role !== "admin" &&
    session.role !== "hod" &&
    session.role !== "security"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select()
      .from(parentSmsLog)
      .orderBy(desc(parentSmsLog.sentAt))
      .limit(50);
    if (rows && rows.length > 0) {
      return NextResponse.json({ logs: rows });
    }
  } catch (err) {
    console.warn("[ParentSmsLog DB Notice] Using memory store fallback.", err);
  }

  return NextResponse.json({ logs: mockStore.parentSmsLogs });
}
