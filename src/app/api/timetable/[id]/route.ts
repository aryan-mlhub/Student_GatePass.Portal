import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { timetable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "hod")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const updates: Record<string, unknown> = {};
  const allowed = [
    "department",
    "semester",
    "section",
    "dayOfWeek",
    "startTime",
    "endTime",
    "subjectName",
    "subjectCode",
    "facultyName",
    "isBreak",
  ];
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }
  if (updates.semester) updates.semester = parseInt(String(updates.semester), 10);
  const updated = await db
    .update(timetable)
    .set(updates)
    .where(eq(timetable.id, parseInt(id, 10)))
    .returning();
  if (!updated[0]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ entry: updated[0] });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "hod")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const deleted = await db
    .delete(timetable)
    .where(eq(timetable.id, parseInt(id, 10)))
    .returning();
  if (!deleted[0]) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
