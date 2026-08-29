import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { gatePasses, parentSmsLog, users } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getCurrentSlot } from "@/lib/timetable-db";
import { currentDayName, currentTimeHHMM } from "@/lib/timetable";
import { ensureSeeded } from "@/lib/seed";
import QRCode from "qrcode";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

const SECRET =
  process.env.QR_SECRET || "sbjitmr-qr-secret-2024";

function signToken(passId: string) {
  return createHmac("sha256", SECRET)
    .update(passId)
    .digest("hex")
    .slice(0, 24);
}

function buildQrPayload(passId: string) {
  const sig = signToken(passId);
  return `SBJITMR|PASS=${passId}|SIG=${sig}`;
}

// POST /api/gatepass -- create new request
export async function POST(req: NextRequest) {
  await ensureSeeded();
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
}

// GET /api/gatepass?scope=mine|mentor|hod|security
export async function GET(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scope = req.nextUrl.searchParams.get("scope") || "mine";
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
    // returns acted-on passes for current role
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
    // returns passes acted on by current mentor/hod
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
  return NextResponse.json({ error: "unknown scope" }, { status: 400 });
}
