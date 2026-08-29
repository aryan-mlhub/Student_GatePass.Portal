import "server-only";
import { db } from "@/db";
import { timetable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  DAYS,
  type DayOfWeek,
  toMinutes,
  currentDayName,
  currentTimeHHMM,
} from "./timetable";

export interface CurrentSlot {
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  isBreak: boolean;
}

export async function getCurrentSlot(opts: {
  department: string;
  semester: number;
  section: string;
  day?: DayOfWeek;
  time?: string;
}): Promise<CurrentSlot | null> {
  const day = opts.day ?? currentDayName();
  const time = opts.time ?? currentTimeHHMM();
  const now = toMinutes(time);

  const rows = await db
    .select()
    .from(timetable)
    .where(
      and(
        eq(timetable.department, opts.department),
        eq(timetable.semester, opts.semester),
        eq(timetable.section, opts.section),
        eq(timetable.dayOfWeek, day),
      ),
    );

  for (const r of rows) {
    const s = toMinutes(r.startTime);
    const e = toMinutes(r.endTime);
    if (now >= s && now < e) {
      return {
        startTime: r.startTime,
        endTime: r.endTime,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
        facultyName: r.facultyName,
        isBreak: r.isBreak,
      };
    }
  }
  return null;
}

export async function getDayTimetable(opts: {
  department: string;
  semester: number;
  section: string;
  day: DayOfWeek;
}) {
  return db
    .select()
    .from(timetable)
    .where(
      and(
        eq(timetable.department, opts.department),
        eq(timetable.semester, opts.semester),
        eq(timetable.section, opts.section),
        eq(timetable.dayOfWeek, opts.day),
      ),
    );
}

export { DAYS };
