import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rollList } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

// GET /api/auth/lookup?usn=SBJ23CSE001
// Returns pre-filled student data from the roll list
export async function GET(req: NextRequest) {
  await ensureSeeded();
  const usn = req.nextUrl.searchParams.get("usn")?.trim().toUpperCase() || "";
  if (!usn) {
    return NextResponse.json({ error: "USN required" }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(rollList)
    .where(eq(rollList.usn, usn))
    .limit(1);
  if (!rows[0]) {
    return NextResponse.json(
      { exists: false, error: "USN not found in SBJITMR roll list" },
      { status: 404 },
    );
  }
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
