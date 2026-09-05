import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { gatePasses, parentSmsLog, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import QRCode from "qrcode";
import { createHmac } from "crypto";
import { mockStore, type MockGatePass } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

const SECRET = process.env.QR_SECRET || "sbjitmr-qr-secret-2024";

function signToken(passId: string) {
  return createHmac("sha256", SECRET)
    .update(passId)
    .digest("hex")
    .slice(0, 24);
}

function buildQrPayload(passId: string) {
  return `SBJITMR|PASS=${passId}|SIG=${signToken(passId)}`;
}

// GET /api/gatepass/[id] - fetch one pass + qr code
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let pass: any = null;

  // 1. Try DB
  try {
    const rows = await db
      .select()
      .from(gatePasses)
      .where(eq(gatePasses.passId, id))
      .limit(1);
    pass = rows[0];
  } catch (err) {
    console.warn("[GatePass GET ID DB Notice] Using memory store fallback.", err);
  }

  // 2. Fallback to mockStore
  if (!pass) {
    pass = mockStore.gatePasses.find((p) => p.passId === id);
  }

  if (!pass) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Students can only see their own passes
  if (session.role === "student" && pass.studentUsn.toLowerCase() !== session.identifier.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let qrSvg: string | null = null;
  if (pass.qrPayload) {
    qrSvg = await QRCode.toString(pass.qrPayload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      color: { dark: "#0F172A", light: "#FFFFFF" },
      width: 220,
    });
  }
  return NextResponse.json({ pass, qrSvg });
}

// PATCH /api/gatepass/[id] - approve / reject
// body: { action: "approve_mentor" | "approve_hod" | "reject", comment?: string }
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const action = body.action as string;
  const comment = (body.comment as string | undefined) || null;

  let pass: any = null;
  let useMock = false;

  // 1. Try DB
  try {
    const rows = await db
      .select()
      .from(gatePasses)
      .where(eq(gatePasses.passId, id))
      .limit(1);
    pass = rows[0];
  } catch (err) {
    console.warn("[GatePass PATCH ID DB Notice] Using memory store fallback.", err);
    useMock = true;
  }

  if (!pass) {
    pass = mockStore.gatePasses.find((p) => p.passId === id);
    useMock = true;
  }

  if (!pass) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "approve_mentor") {
    if (session.role !== "mentor" && session.role !== "admin" && session.role !== "hod") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (pass.status !== "pending_mentor") {
      return NextResponse.json(
        { error: "Pass is not awaiting mentor approval" },
        { status: 400 },
      );
    }

    if (!useMock) {
      try {
        const updated = await db
          .update(gatePasses)
          .set({
            status: "pending_hod",
            mentorName: session.name,
            mentorActionAt: new Date(),
            mentorComment: comment,
          })
          .where(eq(gatePasses.passId, id))
          .returning();
        return NextResponse.json({ pass: updated[0] });
      } catch (err) {
        console.warn("[GatePass Mentor Approval DB Notice] Falling back to mockStore.", err);
      }
    }

    // MockStore update
    pass.status = "pending_hod";
    pass.mentorName = session.name;
    pass.mentorActionAt = new Date();
    pass.mentorComment = comment;
    return NextResponse.json({ pass });
  }

  if (action === "approve_hod") {
    if (session.role !== "hod" && session.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (pass.status !== "pending_hod") {
      return NextResponse.json(
        { error: "Pass is not awaiting HOD approval" },
        { status: 400 },
      );
    }
    const qrToken = nanoid(24);
    const qrPayload = buildQrPayload(pass.passId);
    const expires = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

    const d = new Date();
    const dateStr = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const smsBody = `Dear Parent, the gate pass for ${pass.studentName} - ${pass.studentUsn} has been APPROVED on ${dateStr} at ${timeStr}. Reason: ${pass.reason}. - SBJITMR Gate Pass System`;

    if (!useMock) {
      try {
        const updated = await db
          .update(gatePasses)
          .set({
            status: "approved",
            hodName: session.name,
            hodActionAt: new Date(),
            hodComment: comment,
            qrToken,
            qrPayload,
            qrIssuedAt: new Date(),
            qrExpiresAt: expires,
            parentSmsSent: true,
            parentSmsBody: smsBody,
          })
          .where(eq(gatePasses.passId, id))
          .returning();

        const approved = updated[0];
        const studentRows = await db
          .select()
          .from(users)
          .where(eq(users.identifier, approved.studentUsn))
          .limit(1);
        const parentPhone = studentRows[0]?.parentPhone || "+919876500000";
        await db.insert(parentSmsLog).values({
          passId: approved.passId,
          studentName: approved.studentName,
          studentUsn: approved.studentUsn,
          parentPhone,
          body: smsBody,
        });

        return NextResponse.json({ pass: { ...approved, parentSmsBody: smsBody } });
      } catch (err) {
        console.warn("[GatePass HOD Approval DB Notice] Falling back to mockStore.", err);
      }
    }

    // MockStore update
    pass.status = "approved";
    pass.hodName = session.name;
    pass.hodActionAt = new Date();
    pass.hodComment = comment;
    pass.qrToken = qrToken;
    pass.qrPayload = qrPayload;
    pass.qrIssuedAt = new Date();
    pass.qrExpiresAt = expires;
    pass.parentSmsSent = true;
    pass.parentSmsBody = smsBody;

    mockStore.parentSmsLogs.unshift({
      id: mockStore.parentSmsLogs.length + 1,
      passId: pass.passId,
      studentName: pass.studentName,
      studentUsn: pass.studentUsn,
      parentPhone: "+919876525001",
      body: smsBody,
      sentAt: new Date(),
    });

    return NextResponse.json({ pass });
  }

  if (action === "reject") {
    if (session.role !== "mentor" && session.role !== "hod" && session.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (
      pass.status !== "pending_mentor" &&
      pass.status !== "pending_hod"
    ) {
      return NextResponse.json(
        { error: "Pass is not pending" },
        { status: 400 },
      );
    }
    const updates: Record<string, unknown> = {
      status: "rejected",
    };
    if (pass.status === "pending_mentor") {
      updates.mentorName = session.name;
      updates.mentorActionAt = new Date();
      updates.mentorComment = comment;
    } else {
      updates.hodName = session.name;
      updates.hodActionAt = new Date();
      updates.hodComment = comment;
    }

    if (!useMock) {
      try {
        const updated = await db
          .update(gatePasses)
          .set(updates)
          .where(eq(gatePasses.passId, id))
          .returning();
        return NextResponse.json({ pass: updated[0] });
      } catch (err) {
        console.warn("[GatePass Reject DB Notice] Falling back to mockStore.", err);
      }
    }

    // MockStore update
    pass.status = "rejected";
    if (pass.status === "pending_mentor") {
      pass.mentorName = session.name;
      pass.mentorActionAt = new Date();
      pass.mentorComment = comment;
    } else {
      pass.hodName = session.name;
      pass.hodActionAt = new Date();
      pass.hodComment = comment;
    }
    return NextResponse.json({ pass });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
