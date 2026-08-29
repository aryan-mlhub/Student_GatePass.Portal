import { NextResponse } from "next/server";
import { db } from "@/db";
import { parentSmsLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

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
  const rows = await db
    .select()
    .from(parentSmsLog)
    .orderBy(desc(parentSmsLog.sentAt))
    .limit(50);
  return NextResponse.json({ logs: rows });
}
