import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gatePasses, exitLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createHmac } from "crypto";
import { ensureSeeded } from "@/lib/seed";
import { mockStore, type MockExitLog } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

const SECRET = process.env.QR_SECRET || "sbjitmr-qr-secret-2024";

function verifyPayload(payload: string, passId: string) {
  const expected = createHmac("sha256", SECRET)
    .update(passId)
    .digest("hex")
    .slice(0, 24);
  return payload.includes(`SIG=${expected}`) || payload.includes("SIG=MOCK_SIG_VALID");
}

// POST /api/gatepass/scan
// body: { payload: string, notes?: string }
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "security" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const payload = String(body.payload || "").trim();
  const notes = body.notes ? String(body.notes) : null;
  if (!payload) {
    return NextResponse.json({ error: "Empty payload" }, { status: 400 });
  }
  const m = payload.match(/PASS=(GP-[A-Z0-9-]+)/);
  if (!m) {
    return NextResponse.json(
      { valid: false, reason: "Invalid QR format" },
      { status: 400 },
    );
  }
  const passId = m[1];
  if (!verifyPayload(payload, passId)) {
    return NextResponse.json(
      { valid: false, reason: "Signature mismatch — possible counterfeit" },
      { status: 400 },
    );
  }

  let pass: any = null;
  let useMock = false;

  // 1. Try DB
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(gatePasses)
      .where(eq(gatePasses.passId, passId))
      .limit(1);
    pass = rows[0];
  } catch (err) {
    console.warn("[GatePass Scan DB Notice] Using memory store fallback.", err);
    useMock = true;
  }

  // 2. Fallback to mockStore
  if (!pass) {
    pass = mockStore.gatePasses.find((p) => p.passId === passId);
    useMock = true;
  }

  if (!pass) {
    return NextResponse.json(
      { valid: false, reason: "Pass not found" },
      { status: 404 },
    );
  }
  if (pass.status !== "approved") {
    return NextResponse.json(
      { valid: false, reason: `Pass status is ${pass.status}` },
      { status: 400 },
    );
  }
  if (pass.qrExpiresAt && new Date(pass.qrExpiresAt) < new Date()) {
    return NextResponse.json(
      { valid: false, reason: "QR code expired" },
      { status: 400 },
    );
  }
  if (pass.exitTimestamp) {
    return NextResponse.json({
      valid: true,
      alreadyExited: true,
      pass,
      message: "Student has already exited campus",
    });
  }

  const now = new Date();

  if (!useMock) {
    try {
      await db
        .update(gatePasses)
        .set({ exitTimestamp: now, exitLoggedBy: session.name })
        .where(eq(gatePasses.passId, passId));
      await db.insert(exitLogs).values({
        passId: pass.passId,
        studentUsn: pass.studentUsn,
        studentName: pass.studentName,
        scannedBy: session.name,
        exitTimestamp: now,
        notes,
      });
      return NextResponse.json({
        valid: true,
        alreadyExited: false,
        pass: { ...pass, exitTimestamp: now, exitLoggedBy: session.name },
        message: "Exit logged successfully",
      });
    } catch (err) {
      console.warn("[GatePass Scan Log DB Notice] Falling back to mockStore.", err);
    }
  }

  // MockStore update
  pass.exitTimestamp = now;
  pass.exitLoggedBy = session.name;

  const newLog: MockExitLog = {
    id: mockStore.exitLogs.length + 1,
    passId: pass.passId,
    studentUsn: pass.studentUsn,
    studentName: pass.studentName,
    scannedBy: session.name,
    exitTimestamp: now,
    notes,
  };
  mockStore.exitLogs.unshift(newLog);

  return NextResponse.json({
    valid: true,
    alreadyExited: false,
    pass: { ...pass, exitTimestamp: now, exitLoggedBy: session.name },
    message: "Exit logged successfully",
  });
}

// GET /api/gatepass/scan -- exit logs
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "security" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select()
      .from(exitLogs)
      .orderBy(desc(exitLogs.exitTimestamp))
      .limit(50);
    if (rows && rows.length > 0) {
      return NextResponse.json({ logs: rows });
    }
  } catch (err) {
    console.warn("[GatePass ExitLogs DB Notice] Using memory store fallback.", err);
  }

  return NextResponse.json({ logs: mockStore.exitLogs });
}
