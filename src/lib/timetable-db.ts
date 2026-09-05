import "server-only";
import { db } from "@/db";
import { timetable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { mockStore } from "@/lib/mock-db";
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

  try {
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

    if (rows && rows.length > 0) {
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
  } catch (err) {
    console.warn("[getCurrentSlot DB Notice] Using memory store fallback.", err);
  }

  // Fallback to mockStore
  const fallbackRows = mockStore.timetable.filter(
    (t) =>
      t.department.toLowerCase() === opts.department.toLowerCase() &&
      t.semester === opts.semester &&
      t.section.toLowerCase() === opts.section.toLowerCase() &&
      t.dayOfWeek.toLowerCase() === day.toLowerCase(),
  );

  for (const r of fallbackRows) {
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
  try {
    const rows = await db
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
    if (rows && rows.length > 0) return rows;
  } catch (err) {
    console.warn("[getDayTimetable DB Notice] Using memory store fallback.", err);
  }

  return mockStore.timetable.filter(
    (t) =>
      t.department.toLowerCase() === opts.department.toLowerCase() &&
      t.semester === opts.semester &&
      t.section.toLowerCase() === opts.section.toLowerCase() &&
      t.dayOfWeek.toLowerCase() === opts.day.toLowerCase(),
  );
}

export { DAYS };
