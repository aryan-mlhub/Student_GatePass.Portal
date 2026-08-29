import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, rollList } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const body = await req.json();
  const usn = String(body.usn || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const parentPhone = String(body.parentPhone || "").trim();
  const password = String(body.password || "");
  const confirm = String(body.confirmPassword || "");

  if (!usn || !name || !parentPhone || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }
  if (password !== confirm) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 },
    );
  }

  // Validate against roll list
  const roll = await db
    .select()
    .from(rollList)
    .where(eq(rollList.usn, usn))
    .limit(1);
  if (!roll[0]) {
    return NextResponse.json(
      { error: "USN not found in SBJITMR roll list" },
      { status: 404 },
    );
  }
  if (roll[0].studentName.toLowerCase() !== name.toLowerCase()) {
    return NextResponse.json(
      { error: "Name does not match the roll list for this USN" },
      { status: 400 },
    );
  }
  if (roll[0].parentPhone !== parentPhone) {
    return NextResponse.json(
      { error: "Parent phone does not match the roll list for this USN" },
      { status: 400 },
    );
  }

  // Check if already registered
  const existing = await db
    .select()
    .from(users)
    .where(
      and(eq(users.identifier, usn), eq(users.role, "student")),
    )
    .limit(1);
  if (existing[0]) {
    return NextResponse.json(
      { error: "An account already exists for this USN" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(users)
    .values({
      role: "student",
      name: roll[0].studentName,
      identifier: usn,
      passwordHash,
      department: roll[0].department,
      semester: roll[0].semester,
      section: roll[0].section,
      parentPhone: roll[0].parentPhone,
    })
    .returning();

  const user = inserted[0];
  const token = await createSessionToken({
    uid: user.id,
    role: "student",
    name: user.name,
    identifier: user.identifier,
    department: user.department ?? user.managedDepartment,
    semester: user.semester ?? user.managedSemester,
    section: user.section ?? user.managedSection,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      identifier: user.identifier,
      department: user.department,
      semester: user.semester,
      section: user.section,
    },
  });
}
