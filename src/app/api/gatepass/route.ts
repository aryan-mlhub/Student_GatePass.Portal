import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { gatePasses } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getCurrentSlot } from "@/lib/timetable-db";
import { ensureSeeded } from "@/lib/seed";
import { mockStore, type MockGatePass } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

// POST /api/gatepass -- create new request
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const reason = String(body.reason || "").trim();
  if (reason.length < 5) {
    return NextResponse.json(
      { error: "Please provide a meaningful reason (min 5 characters)" },
      { status: 400 },
    );
  }
  if (!session.department || !session.semester || !session.section) {
    return NextResponse.json(
      { error: "Profile missing department details" },
      { status: 400 },
    );
  }
  const slot = await getCurrentSlot({
    department: session.department,
    semester: session.semester,
    section: session.section,
  });
  const flow: "academic" | "free_period" = slot && !slot.isBreak ? "academic" : "free_period";
  const status = flow === "academic" ? "pending_mentor" : "pending_hod";
  const passId = `GP-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;

  // 1. Try DB
  try {
    await ensureSeeded();
    const inserted = await db
      .insert(gatePasses)
      .values({
        passId,
        studentUsn: session.identifier,
        studentName: session.name,
        department: session.department,
        semester: session.semester,
        section: session.section,
        reason,
        flow,
        status,
        currentSubject: slot?.subjectName ?? null,
        currentSubjectCode: slot?.subjectCode ?? null,
        currentFaculty: slot?.facultyName ?? null,
        slotStart: slot?.startTime ?? null,
        slotEnd: slot?.endTime ?? null,
      })
      .returning();
    return NextResponse.json({ pass: inserted[0] });
  } catch (err) {
    console.warn("[GatePass POST DB Notice] Using memory store fallback.", err);
  }

  // 2. Fallback to mockStore
  const newPass: MockGatePass = {
    id: mockStore.gatePasses.length + 1,
    passId,
    studentUsn: session.identifier,
    studentName: session.name,
    department: session.department,
    semester: session.semester,
    section: session.section,
    reason,
    flow,
    status,
    currentSubject: slot?.subjectName ?? null,
    currentSubjectCode: slot?.subjectCode ?? null,
    currentFaculty: slot?.facultyName ?? null,
    slotStart: slot?.startTime ?? null,
    slotEnd: slot?.endTime ?? null,
    requestTimestamp: new Date(),
    parentSmsSent: false,
  };
  mockStore.gatePasses.unshift(newPass);

  return NextResponse.json({ pass: newPass });
}

// GET /api/gatepass?scope=mine|mentor|hod|security|history|acted
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scope = req.nextUrl.searchParams.get("scope") || "mine";

  // 1. Try DB
  try {
    await ensureSeeded();
    if (scope === "mine") {
      const rows = await db
        .select()
        .from(gatePasses)
        .where(eq(gatePasses.studentUsn, session.identifier))
        .orderBy(desc(gatePasses.requestTimestamp));
      return NextResponse.json({ passes: rows });
    }
    if (scope === "mentor") {
      if (session.role !== "mentor" && session.role !== "admin" && session.role !== "hod") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const conds = [eq(gatePasses.status, "pending_mentor")];
      if (session.role === "mentor" || session.role === "hod") {
        conds.push(eq(gatePasses.department, session.department || ""));
        if (session.semester) conds.push(eq(gatePasses.semester, session.semester));
        if (session.section) conds.push(eq(gatePasses.section, session.section));
      }
      const rows = await db
        .select()
        .from(gatePasses)
        .where(and(...conds))
        .orderBy(desc(gatePasses.requestTimestamp));
      return NextResponse.json({ passes: rows });
    }
    if (scope === "hod") {
      if (session.role !== "hod" && session.role !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const conds = [eq(gatePasses.status, "pending_hod")];
      if (session.role === "hod" && session.department) {
        conds.push(eq(gatePasses.department, session.department));
      }
      const rows = await db
        .select()
        .from(gatePasses)
        .where(and(...conds))
        .orderBy(desc(gatePasses.requestTimestamp));
      return NextResponse.json({ passes: rows });
    }
    if (scope === "security") {
      if (session.role !== "security" && session.role !== "admin") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      const rows = await db
        .select()
        .from(gatePasses)
        .where(eq(gatePasses.status, "approved"))
        .orderBy(desc(gatePasses.requestTimestamp));
      return NextResponse.json({ passes: rows });
    }
    if (scope === "history") {
      if (session.role === "mentor" || session.role === "hod" || session.role === "admin") {
        const conds = [];
        conds.push(eq(gatePasses.status, "approved"));
        if (session.role !== "admin" && session.department) {
          conds.push(eq(gatePasses.department, session.department));
        }
        const approved = await db
          .select()
          .from(gatePasses)
          .where(and(...conds))
          .orderBy(desc(gatePasses.requestTimestamp));
        return NextResponse.json({ passes: approved });
      }
      return NextResponse.json({ passes: [] });
    }
    if (scope === "acted") {
      if (session.role === "mentor" || session.role === "admin") {
        const conds = [eq(gatePasses.mentorName, session.name)];
        if (session.department) conds.push(eq(gatePasses.department, session.department));
        const rows = await db
          .select()
          .from(gatePasses)
          .where(and(...conds))
          .orderBy(desc(gatePasses.requestTimestamp));
        return NextResponse.json({ passes: rows });
      }
      if (session.role === "hod") {
        const conds = [eq(gatePasses.hodName, session.name)];
        if (session.department) conds.push(eq(gatePasses.department, session.department));
        const rows = await db
          .select()
          .from(gatePasses)
          .where(and(...conds))
          .orderBy(desc(gatePasses.requestTimestamp));
        return NextResponse.json({ passes: rows });
      }
      return NextResponse.json({ passes: [] });
    }
  } catch (err) {
    console.warn("[GatePass GET DB Notice] Using memory store fallback.", err);
  }

  // 2. Fallback to mockStore
  if (scope === "mine") {
    const passes = mockStore.gatePasses.filter(
      (p) => p.studentUsn.toLowerCase() === session.identifier.toLowerCase(),
    );
    return NextResponse.json({ passes });
  }

  if (scope === "mentor") {
    if (session.role !== "mentor" && session.role !== "admin" && session.role !== "hod") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const passes = mockStore.gatePasses.filter((p) => {
      if (p.status !== "pending_mentor") return false;
      if (session.role === "mentor" || session.role === "hod") {
        if (session.department && p.department.toLowerCase() !== session.department.toLowerCase()) return false;
        if (session.semester && p.semester !== session.semester) return false;
        if (session.section && p.section.toLowerCase() !== session.section.toLowerCase()) return false;
      }
      return true;
    });
    return NextResponse.json({ passes });
  }

  if (scope === "hod") {
    if (session.role !== "hod" && session.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const passes = mockStore.gatePasses.filter((p) => {
      if (p.status !== "pending_hod") return false;
      if (session.role === "hod" && session.department && p.department.toLowerCase() !== session.department.toLowerCase()) {
        return false;
      }
      return true;
    });
    return NextResponse.json({ passes });
  }

  if (scope === "security") {
    if (session.role !== "security" && session.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const passes = mockStore.gatePasses.filter((p) => p.status === "approved");
    return NextResponse.json({ passes });
  }

  if (scope === "history") {
    if (session.role === "mentor" || session.role === "hod" || session.role === "admin") {
      const passes = mockStore.gatePasses.filter((p) => {
        if (p.status !== "approved") return false;
        if (session.role !== "admin" && session.department && p.department.toLowerCase() !== session.department.toLowerCase()) {
          return false;
        }
        return true;
      });
      return NextResponse.json({ passes });
    }
    return NextResponse.json({ passes: [] });
  }

  if (scope === "acted") {
    if (session.role === "mentor" || session.role === "admin") {
      const passes = mockStore.gatePasses.filter((p) => p.mentorName === session.name);
      return NextResponse.json({ passes });
    }
    if (session.role === "hod") {
      const passes = mockStore.gatePasses.filter((p) => p.hodName === session.name);
      return NextResponse.json({ passes });
    }
    return NextResponse.json({ passes: [] });
  }

  return NextResponse.json({ error: "unknown scope" }, { status: 400 });
}
