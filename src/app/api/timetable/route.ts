import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { timetable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { mockStore, type MockTimetable } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

// GET /api/timetable?department=&semester=&section=&day=
export async function GET(req: NextRequest) {
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

  // 1. Try DB if configured
  if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
    try {
      await ensureSeeded();
      const conds = [
        eq(timetable.department, department),
        eq(timetable.semester, parseInt(semester, 10)),
        eq(timetable.section, section),
      ];
      if (day) conds.push(eq(timetable.dayOfWeek, day));
      const rows = await db.select().from(timetable).where(and(...conds));
      if (rows && rows.length > 0) {
        return NextResponse.json({ entries: rows });
      }
    } catch (err) {
      console.warn("[Timetable GET DB Notice] Using memory store fallback.", err);
    }
  }

  // 2. Fallback to mockStore
  const semNum = parseInt(semester, 10);
  const entries = mockStore.timetable.filter(
    (t) =>
      t.department.toLowerCase() === department.toLowerCase() &&
      t.semester === semNum &&
      t.section.toLowerCase() === section.toLowerCase() &&
      (!day || t.dayOfWeek.toLowerCase() === day.toLowerCase()),
  );

  return NextResponse.json({ entries });
}

// POST /api/timetable  -- admin/hod only
export async function POST(req: NextRequest) {
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

  // 1. Try DB if configured
  if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
    try {
      await ensureSeeded();
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
    } catch (err) {
      console.warn("[Timetable POST DB Notice] Using memory store fallback.", err);
    }
  }

  // 2. Fallback to mockStore
  const newEntry: MockTimetable = {
    id: mockStore.timetable.length + 1,
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
  };
  mockStore.timetable.push(newEntry);

  return NextResponse.json({ entry: newEntry });
}
