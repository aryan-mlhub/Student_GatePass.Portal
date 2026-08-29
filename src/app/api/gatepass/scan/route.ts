import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gatePasses, exitLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { createHmac } from "crypto";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

const SECRET = process.env.QR_SECRET || "sbjitmr-qr-secret-2024";

function verifyPayload(payload: string, passId: string) {
  const expected = createHmac("sha256", SECRET)
    .update(passId)
    .digest("hex")
    .slice(0, 24);
  return payload.includes(`SIG=${expected}`);
}

// POST /api/gatepass/scan
// body: { payload: string, notes?: string }
export async function POST(req: NextRequest) {
  await ensureSeeded();
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
  const rows = await db
    .select()
    .from(gatePasses)
    .where(eq(gatePasses.passId, passId))
    .limit(1);
  const pass = rows[0];
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
}

// GET /api/gatepass/scan -- exit logs
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "security" && session.role !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await db
    .select()
    .from(exitLogs)
    .orderBy(eq(exitLogs.passId, exitLogs.passId));
  return NextResponse.json({ logs: rows.reverse() });
}
