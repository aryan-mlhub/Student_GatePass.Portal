import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { timetable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { mockStore } from "@/lib/mock-db";

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

  const numId = parseInt(id, 10);

  // 1. Try DB if configured
  if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
    try {
      const updated = await db
        .update(timetable)
        .set(updates)
        .where(eq(timetable.id, numId))
        .returning();
      if (updated[0]) {
        return NextResponse.json({ entry: updated[0] });
      }
    } catch (err) {
      console.warn("[Timetable PATCH ID DB Notice] Using memory store fallback.", err);
    }
  }

  // 2. Fallback to mockStore
  const index = mockStore.timetable.findIndex((t) => t.id === numId);
  if (index !== -1) {
    mockStore.timetable[index] = {
      ...mockStore.timetable[index],
      ...updates,
    } as any;
    return NextResponse.json({ entry: mockStore.timetable[index] });
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
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

  const numId = parseInt(id, 10);

  // 1. Try DB if configured
  if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
    try {
      const deleted = await db
        .delete(timetable)
        .where(eq(timetable.id, numId))
        .returning();
      if (deleted[0]) {
        return NextResponse.json({ ok: true });
      }
    } catch (err) {
      console.warn("[Timetable DELETE ID DB Notice] Using memory store fallback.", err);
    }
  }

  // 2. Fallback to mockStore
  const index = mockStore.timetable.findIndex((t) => t.id === numId);
  if (index !== -1) {
    mockStore.timetable.splice(index, 1);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
