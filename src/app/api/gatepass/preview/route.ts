import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentSlot } from "@/lib/timetable-db";
import { currentDayName, currentTimeHHMM } from "@/lib/timetable";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

// POST /api/gatepass/preview
// Returns the live conflict-check info for the requesting student
export async function POST(_req: NextRequest) {
  await ensureSeeded();
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.department || !session.semester || !session.section) {
    return NextResponse.json(
      { error: "Profile missing department details" },
      { status: 400 },
    );
  }
  const day = currentDayName();
  const time = currentTimeHHMM();
  const slot = await getCurrentSlot({
    department: session.department,
    semester: session.semester,
    section: session.section,
    day,
    time,
  });
  let flow: "academic" | "free_period" | "emergency" = "free_period";
  let summary = "No class scheduled — Free period";
  let requiresMentor = false;
  let requiresHod = true;
  if (slot) {
    if (slot.isBreak) {
      flow = "free_period";
      summary = `Currently on ${slot.subjectName} (${slot.startTime} – ${slot.endTime})`;
      requiresMentor = false;
      requiresHod = true;
    } else {
      flow = "academic";
      summary = `Was supposed to be in ${slot.subjectName} (${slot.subjectCode}) taught by ${slot.facultyName}`;
      requiresMentor = true;
      requiresHod = true;
    }
  }
  return NextResponse.json({
    day,
    time,
    slot,
    flow,
    summary,
    requiresMentor,
    requiresHod,
  });
}
