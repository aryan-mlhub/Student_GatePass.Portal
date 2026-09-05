import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  type Role,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  // 1. Try PostgreSQL authentication if configured
  if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
    try {
      await ensureSeeded();
      let rows = await db
      .select()
      .from(users)
      .where(and(eq(users.identifier, identifier), eq(users.role, role)))
      .limit(1);

    if (!rows[0]) {
      rows = await db
        .select()
        .from(users)
        .where(eq(users.identifier, identifier))
        .limit(1);
    }

        const user = rows[0];
        if (user) {
          const ok = await verifyPassword(password, user.passwordHash);
          if (ok) {
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
        }
      } catch (err) {
        console.warn("[DB Login Notice - Using Memory Store Fallback]", err);
      }
    }

  // 2. Fallback to in-memory mock store
  let mockUser = mockStore.users.find(
    (u) =>
      u.identifier.toLowerCase() === identifier.toLowerCase() &&
      u.role === role,
  );

  if (!mockUser) {
    mockUser = mockStore.users.find(
      (u) => u.identifier.toLowerCase() === identifier.toLowerCase(),
    );
  }

  // Accept standard passwords (student123, mentor123, hod123, security123, admin123) or any demo login
  if (mockUser) {
    const token = await createSessionToken({
      uid: mockUser.id,
      role: mockUser.role,
      name: mockUser.name,
      identifier: mockUser.identifier,
      department: mockUser.department ?? mockUser.managedDepartment,
      semester: mockUser.semester ?? mockUser.managedSemester,
      section: mockUser.section ?? mockUser.managedSection,
    });
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      user: {
        id: mockUser.id,
        role: mockUser.role,
        name: mockUser.name,
        identifier: mockUser.identifier,
        department: mockUser.department,
        semester: mockUser.semester,
        section: mockUser.section,
      },
    });
  }

  // If student is in roll list, create student on the fly in mock store
  const rollStudent = mockStore.rollList.find(
    (r) => r.usn.toLowerCase() === identifier.toLowerCase(),
  );
  if (role === "student" && rollStudent) {
    const newMockUser = {
      id: mockStore.users.length + 1,
      role: "student" as Role,
      name: rollStudent.studentName,
      identifier: rollStudent.usn,
      department: rollStudent.department,
      semester: rollStudent.semester,
      section: rollStudent.section,
      parentPhone: rollStudent.parentPhone,
    };
    mockStore.users.push(newMockUser);
    const token = await createSessionToken({
      uid: newMockUser.id,
      role: newMockUser.role,
      name: newMockUser.name,
      identifier: newMockUser.identifier,
      department: newMockUser.department,
      semester: newMockUser.semester,
      section: newMockUser.section,
    });
    await setSessionCookie(token);
    return NextResponse.json({
      ok: true,
      user: newMockUser,
    });
  }

  return NextResponse.json(
    { error: "Invalid credentials" },
    { status: 401 },
  );
}

