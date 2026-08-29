import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  type Role,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const body = await req.json();
  const role = (body.role as Role) || "student";
  const identifier = String(body.identifier || "").trim();
  const password = String(body.password || "");
  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Identifier and password are required" },
      { status: 400 },
    );
  }
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.identifier, identifier), eq(users.role, role)))
    .limit(1);
  const user = rows[0];
  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }
  const token = await createSessionToken({
    uid: user.id,
    role: user.role as Role,
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
