import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rollList } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { mockStore } from "@/lib/mock-db";

export const dynamic = "force-dynamic";

// GET /api/auth/lookup?usn=SBJ23CSE001
export async function GET(req: NextRequest) {
  const usn = req.nextUrl.searchParams.get("usn")?.trim().toUpperCase() || "";
  if (!usn) {
    return NextResponse.json({ error: "USN required" }, { status: 400 });
  }

  // 1. Try DB
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(rollList)
      .where(eq(rollList.usn, usn))
      .limit(1);
    if (rows[0]) {
      return NextResponse.json({
        exists: true,
        student: {
          usn: rows[0].usn,
          name: rows[0].studentName,
          department: rows[0].department,
          semester: rows[0].semester,
          section: rows[0].section,
          parentPhone: rows[0].parentPhone,
        },
      });
    }
  } catch (e) {
    console.warn("[Lookup DB notice]", e);
  }

  // 2. Fallback to Mock Store
  const mockRoll = mockStore.rollList.find((r) => r.usn.toUpperCase() === usn);
  if (mockRoll) {
    return NextResponse.json({
      exists: true,
      student: {
        usn: mockRoll.usn,
        name: mockRoll.studentName,
        department: mockRoll.department,
        semester: mockRoll.semester,
        section: mockRoll.section,
        parentPhone: mockRoll.parentPhone,
      },
    });
  }

  // 3. Fallback for any entered USN
  return NextResponse.json({
    exists: true,
    student: {
      usn: usn,
      name: "",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      parentPhone: "",
    },
  });
}

