import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { timetable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

// GET /api/timetable?department=&semester=&section=&day=
export async function GET(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const department = sp.get("department");
  const semester = sp.get("semester");
  const section = sp.get("section");
  const day = sp.get("day");
  if (!department || !semester || !section) {
    return NextResponse.json(
      { error: "department, semester, section are required" },
      { status: 400 },
    );
  }
  const conds = [
    eq(timetable.department, department),
    eq(timetable.semester, parseInt(semester, 10)),
    eq(timetable.section, section),
  ];
  if (day) conds.push(eq(timetable.dayOfWeek, day));
  const rows = await db.select().from(timetable).where(and(...conds));
  return NextResponse.json({ entries: rows });
}

// POST /api/timetable  -- admin/hod only
export async function POST(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "hod")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const required = [
    "department",
    "semester",
    "section",
    "dayOfWeek",
    "startTime",
    "endTime",
    "subjectName",
    "subjectCode",
    "facultyName",
  ];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return NextResponse.json(
        { error: `${k} is required` },
        { status: 400 },
      );
    }
  }
  // If HOD, restrict to their department
  if (
    session.role === "hod" &&
    session.department &&
    session.department !== body.department
  ) {
    return NextResponse.json(
      { error: "HODs can only edit their own department" },
      { status: 403 },
    );
  }
  const inserted = await db
    .insert(timetable)
    .values({
      department: body.department,
      semester: parseInt(body.semester, 10),
      section: body.section,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      subjectName: body.subjectName,
      subjectCode: body.subjectCode,
      facultyName: body.facultyName,
      isBreak: !!body.isBreak,
    })
    .returning();
  return NextResponse.json({ entry: inserted[0] });
}
