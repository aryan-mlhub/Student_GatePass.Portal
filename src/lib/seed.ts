import { db } from "@/db";
import { rollList, users, timetable, parentSmsLog, exitLogs, gatePasses } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sql } from "drizzle-orm";

const FIRST_NAMES = [
  "Aarav", "Aditi", "Akash", "Anjali", "Arjun", "Bhavna", "Chirag", "Diya",
  "Gaurav", "Isha", "Karan", "Kavya", "Manish", "Neha", "Nikhil", "Priya",
  "Rahul", "Riya", "Rohan", "Sakshi", "Saurabh", "Shreya", "Tushar", "Vikas",
  "Yash", "Zoya", "Aman", "Ankita", "Deepak", "Harsh",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Gupta", "Iyer", "Reddy", "Khan", "Singh",
  "Kumar", "Mehta", "Joshi", "Rao", "Nair", "Das", "Roy", "Bhat",
];

function phone() {
  const n = Math.floor(7000000000 + Math.random() * 2999999999);
  return `+91${n}`;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const ROLL_ROWS: Array<{
  usn: string;
  name: string;
  dept: string;
  sem: number;
  sec: string;
}> = [];

let serialByDept: Record<string, number> = {};
const DEPT_CODE: Record<string, string> = {
  "Computer Science & Engineering": "CSE",
  "Information Technology": "IT",
  "Electronics & Communication": "ECE",
  "Mechanical Engineering": "MEC",
  "Civil Engineering": "CIV",
  "Electrical Engineering": "EEE",
  "Artificial Intelligence & ML": "AIM",
};
function nextUSN(dept: string) {
  const code = DEPT_CODE[dept] ?? "GEN";
  const year = "23";
  serialByDept[dept] = (serialByDept[dept] ?? 0) + 1;
  const serial = String(serialByDept[dept]).padStart(3, "0");
  return `SBJ${year}${code}${serial}`;
}

const DEPARTMENTS = [
  { name: "Computer Science & Engineering", short: "CSE" },
  { name: "Information Technology", short: "IT" },
  { name: "Electronics & Communication", short: "ECE" },
  { name: "Mechanical Engineering", short: "MEC" },
  { name: "Civil Engineering", short: "CIV" },
  { name: "Electrical Engineering", short: "EEE" },
  { name: "Artificial Intelligence & ML", short: "AIM" },
];

const SECTIONS = ["A", "B", "C"] as const;
const SEMESTERS = [3, 4, 5, 6, 7, 8] as const;

for (const dept of DEPARTMENTS) {
  for (const sem of SEMESTERS) {
    for (const sec of SECTIONS) {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const usn = nextUSN(dept.name);
        const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        ROLL_ROWS.push({
          usn,
          name,
          dept: dept.name,
          sem,
          sec,
        });
      }
    }
  }
}

// Build default timetables
const TIMETABLE_TEMPLATE: Array<{
  start: string;
  end: string;
  subject: string;
  code: string;
  faculty: string;
  isBreak?: boolean;
}> = [
  { start: "09:00", end: "10:00", subject: "Data Structures", code: "CS301", faculty: "Dr. S. Joshi" },
  { start: "10:00", end: "11:00", subject: "Operating Systems", code: "CS302", faculty: "Prof. R. Iyer" },
  { start: "11:00", end: "11:15", subject: "Tea Break", code: "BRK", faculty: "-", isBreak: true },
  { start: "11:15", end: "12:15", subject: "Database Management", code: "CS303", faculty: "Dr. M. Khan" },
  { start: "12:15", end: "13:15", subject: "Computer Networks", code: "CS304", faculty: "Prof. N. Reddy" },
  { start: "13:15", end: "14:00", subject: "Lunch Break", code: "BRK", faculty: "-", isBreak: true },
  { start: "14:00", end: "15:00", subject: "Software Engineering", code: "CS305", faculty: "Dr. A. Verma" },
  { start: "15:00", end: "16:00", subject: "Web Technologies Lab", code: "CS306L", faculty: "Prof. P. Sharma" },
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export async function ensureSeeded() {
  // Skip if roll list already populated
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rollList);
  if ((existing[0]?.count ?? 0) > 0) return;

  // Roll list
  await db.insert(rollList).values(
    ROLL_ROWS.map((r) => ({
      usn: r.usn,
      studentName: r.name,
      department: r.dept,
      semester: r.sem,
      section: r.sec,
      parentPhone: phone(),
    })),
  );

  // Admin
  const adminHash = await hashPassword("admin123");
  await db.insert(users).values({
    role: "admin",
    name: "System Administrator",
    identifier: "admin",
    passwordHash: adminHash,
  });

  // HOD for each department
  for (const dept of DEPARTMENTS) {
    const hash = await hashPassword("hod123");
    await db.insert(users).values({
      role: "hod",
      name: `Dr. ${dept.short} HOD`,
      identifier: `hod_${dept.short.toLowerCase()}`,
      passwordHash: hash,
      managedDepartment: dept.name,
    });
  }

  // Mentors — one per (department, semester, section) for CSE only to keep manageable
  for (const sem of [3, 5, 7]) {
    for (const sec of SECTIONS) {
      const hash = await hashPassword("mentor123");
      await db.insert(users).values({
        role: "mentor",
        name: `Prof. ${semesterWord(sem)} ${sec} Mentor`,
        identifier: `mentor_cse_${sem}_${sec.toLowerCase()}`,
        passwordHash: hash,
        managedDepartment: "Computer Science & Engineering",
        managedSemester: sem,
        managedSection: sec,
      });
    }
  }

  // Security guards
  const secHash = await hashPassword("security123");
  for (let i = 1; i <= 2; i++) {
    await db.insert(users).values({
      role: "security",
      name: `Security Guard ${i}`,
      identifier: `guard${i}`,
      passwordHash: secHash,
    });
  }

  // Timetables for CSE 5 A
  const tts: Array<typeof timetable.$inferInsert> = [];
  for (const day of DAYS) {
    for (const t of TIMETABLE_TEMPLATE) {
      tts.push({
        department: "Computer Science & Engineering",
        semester: 5,
        section: "A",
        dayOfWeek: day,
        startTime: t.start,
        endTime: t.end,
        subjectName: t.subject,
        subjectCode: t.code,
        facultyName: t.faculty,
        isBreak: t.isBreak ?? false,
      });
    }
  }
  // Add a different schedule for CSE 5 B
  for (const day of DAYS) {
    for (const t of TIMETABLE_TEMPLATE) {
      tts.push({
        department: "Computer Science & Engineering",
        semester: 5,
        section: "B",
        dayOfWeek: day,
        startTime: t.start,
        endTime: t.end,
        subjectName: rotate(t.subject, 1),
        subjectCode: rotate(t.code, 1),
        facultyName: rotate(t.faculty, 1),
        isBreak: t.isBreak ?? false,
      });
    }
  }
  await db.insert(timetable).values(tts);
}

function semesterWord(s: number) {
  const map: Record<number, string> = {
    1: "First", 2: "Second", 3: "Third", 4: "Fourth",
    5: "Fifth", 6: "Sixth", 7: "Seventh", 8: "Eighth",
  };
  return map[s] ?? `${s}`;
}

function rotate<T>(arr: T, _i: number): T {
  return arr;
}
