import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db";
import { users, rollList } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  hashPassword,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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

    // 1. Try PostgreSQL Registration if configured
    if (isDatabaseConfigured || process.env.NODE_ENV !== "production") {
      try {
        await ensureSeeded();

      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(
          and(eq(users.identifier, usn), eq(users.role, "student")),
        )
        .limit(1);

      if (existing[0]) {
        return NextResponse.json(
          { error: "An account already exists for this USN. Please sign in." },
          { status: 409 },
        );
      }

      // Check roll list or upsert roll entry
      let dept = "Computer Science & Engineering";
      let sem = 5;
      let sec = "A";

      const roll = await db
        .select()
        .from(rollList)
        .where(eq(rollList.usn, usn))
        .limit(1);

      if (roll[0]) {
        dept = roll[0].department;
        sem = roll[0].semester;
        sec = roll[0].section;
        // Update roll list name/phone to match student entry if needed
        await db
          .update(rollList)
          .set({ studentName: name, parentPhone })
          .where(eq(rollList.usn, usn));
      } else {
        await db.insert(rollList).values({
          usn,
          studentName: name,
          department: dept,
          semester: sem,
          section: sec,
          parentPhone,
        });
      }

      const passwordHash = await hashPassword(password);
      const inserted = await db
        .insert(users)
        .values({
          role: "student",
          name,
          identifier: usn,
          passwordHash,
          department: dept,
          semester: sem,
          section: sec,
          parentPhone,
        })
        .returning();

      const user = inserted[0];
      const token = await createSessionToken({
        uid: user.id,
        role: "student",
        name: user.name,
        identifier: user.identifier,
        department: user.department ?? dept,
        semester: user.semester ?? sem,
        section: user.section ?? sec,
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
    } catch (dbErr) {
      console.warn("[Signup DB Notice] Falling back to memory store.", dbErr);
    }
  }

  // 2. Fallback to mockStore
    let mockRoll = mockStore.rollList.find((r) => r.usn.toUpperCase() === usn);
    if (!mockRoll) {
      mockRoll = {
        id: mockStore.rollList.length + 1,
        usn,
        studentName: name,
        department: "Computer Science & Engineering",
        semester: 5,
        section: "A",
        parentPhone,
      };
      mockStore.rollList.push(mockRoll);
    } else {
      mockRoll.studentName = name;
      mockRoll.parentPhone = parentPhone;
    }

    // Check existing in mockStore
    const existingMock = mockStore.users.find(
      (u) => u.identifier.toUpperCase() === usn && u.role === "student",
    );
    if (existingMock) {
      return NextResponse.json(
        { error: "An account already exists for this USN. Please sign in." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const newMockUser = {
      id: mockStore.users.length + 1,
      role: "student" as const,
      name,
      identifier: usn,
      passwordHash,
      department: mockRoll.department,
      semester: mockRoll.semester,
      section: mockRoll.section,
      parentPhone,
    };
    mockStore.users.push(newMockUser);

    const token = await createSessionToken({
      uid: newMockUser.id,
      role: "student",
      name: newMockUser.name,
      identifier: newMockUser.identifier,
      department: newMockUser.department,
      semester: newMockUser.semester,
      section: newMockUser.section,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: {
        id: newMockUser.id,
        role: newMockUser.role,
        name: newMockUser.name,
        identifier: newMockUser.identifier,
        department: newMockUser.department,
        semester: newMockUser.semester,
        section: newMockUser.section,
      },
    });
  } catch (err: any) {
    console.error("[Signup Error]", err);
    return NextResponse.json(
      { error: "Registration could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
