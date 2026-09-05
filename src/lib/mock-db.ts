import studentsMaster from "@/data/students_master.json";
import timetableSectionB from "@/data/timetable_section_b.json";

export interface MockUser {
  id: number;
  role: "student" | "mentor" | "hod" | "security" | "admin";
  name: string;
  identifier: string;
  passwordHash?: string;
  department?: string | null;
  semester?: number | null;
  section?: string | null;
  parentPhone?: string | null;
  managedDepartment?: string | null;
  managedSemester?: number | null;
  managedSection?: string | null;
  clerkId?: string | null;
  phone?: string;
}

export interface MockRoll {
  id: number;
  usn: string;
  studentName: string;
  department: string;
  semester: number;
  section: string;
  parentPhone: string;
}

export interface MockTimetable {
  id: number;
  department: string;
  semester: number;
  section: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  isBreak: boolean;
}

export interface MockGatePass {
  id: number;
  passId: string;
  studentUsn: string;
  studentName: string;
  department: string;
  semester: number;
  section: string;
  reason: string;
  requestTimestamp: Date;
  status: "pending_mentor" | "pending_hod" | "approved" | "rejected";
  flow: "academic" | "free_period" | "emergency";
  currentSubject?: string | null;
  currentSubjectCode?: string | null;
  currentFaculty?: string | null;
  slotStart?: string | null;
  slotEnd?: string | null;
  mentorName?: string | null;
  mentorActionAt?: Date | null;
  mentorComment?: string | null;
  hodName?: string | null;
  hodActionAt?: Date | null;
  hodComment?: string | null;
  qrToken?: string | null;
  qrPayload?: string | null;
  qrIssuedAt?: Date | null;
  qrExpiresAt?: Date | null;
  exitTimestamp?: Date | null;
  exitLoggedBy?: string | null;
  parentSmsSent: boolean;
  parentSmsBody?: string | null;
}

export interface MockExitLog {
  id: number;
  passId: string;
  studentUsn: string;
  studentName: string;
  guardName?: string | null;
  scannedBy?: string | null;
  exitTimestamp: Date;
  status?: string | null;
  notes?: string | null;
}

export interface MockSmsLog {
  id: number;
  passId: string;
  studentName?: string;
  studentUsn?: string;
  parentPhone?: string;
  phone?: string;
  body: string;
  sentAt: Date;
}

// Global Memory Store Singleton
const globalStore = globalThis as typeof globalThis & {
  __gpMockStore?: {
    users: MockUser[];
    rollList: MockRoll[];
    timetable: MockTimetable[];
    gatePasses: MockGatePass[];
    exitLogs: MockExitLog[];
    parentSmsLogs: MockSmsLog[];
  };
};

if (!globalStore.__gpMockStore) {
  // 1. Build roll list from uploaded students_master.json
  const rollList: MockRoll[] = (studentsMaster as Array<{ studentId: string; name: string; department?: string; semester?: number; section?: string }>).map((s, idx) => ({
    id: idx + 1,
    usn: s.studentId.toUpperCase(),
    studentName: s.name,
    department: s.department || "CSE (AI&ML)",
    semester: s.semester || 3,
    section: s.section || "B",
    parentPhone: `+9198765${String(idx + 1).padStart(5, "0")}`,
  }));

  // Append legacy test roll numbers
  rollList.push(
    { id: rollList.length + 1, usn: "SBJ23CSE001", studentName: "Aarav Sharma", department: "Computer Science & Engineering", semester: 5, section: "A", parentPhone: "+919876500001" },
    { id: rollList.length + 1, usn: "SBJ23CSE002", studentName: "Aditi Verma", department: "Computer Science & Engineering", semester: 5, section: "B", parentPhone: "+919876500002" },
    { id: rollList.length + 1, usn: "SBJ23AIM001", studentName: "Priya Patel", department: "Artificial Intelligence & ML", semester: 3, section: "B", parentPhone: "+919876500003" },
  );

  // 2. Pre-seeded Users
  const users: MockUser[] = [
    // Staff & Faculty Accounts
    {
      id: 1,
      role: "admin",
      name: "System Administrator",
      identifier: "admin",
      phone: "+919876543200",
    } as any,
    {
      id: 2,
      role: "hod",
      name: "Dr. Sarah Connor (HOD CSE)",
      identifier: "hod_cse",
      managedDepartment: "CSE (AI&ML)",
      phone: "+919876543201",
    } as any,
    {
      id: 3,
      role: "mentor",
      name: "Prof. S. Patil (Mentor Sec B)",
      identifier: "mentor_cse_3_b",
      managedDepartment: "CSE (AI&ML)",
      managedSemester: 3,
      managedSection: "B",
    },
    {
      id: 4,
      role: "mentor",
      name: "Prof. Fifth A Mentor",
      identifier: "mentor_cse_5_a",
      managedDepartment: "Computer Science & Engineering",
      managedSemester: 5,
      managedSection: "A",
    },
    {
      id: 5,
      role: "security",
      name: "Officer John Davis (Main Gate)",
      identifier: "guard1",
    },
    {
      id: 6,
      role: "security",
      name: "Officer Rajesh Kumar (North Gate)",
      identifier: "guard2",
    },
    // Seed sample students
    {
      id: 7,
      role: "student",
      name: "Aaditya Sharma",
      identifier: "CM25001",
      department: "CSE (AI&ML)",
      semester: 3,
      section: "B",
      parentPhone: "+919876525001",
    },
    {
      id: 8,
      role: "student",
      name: "Aakash Verma",
      identifier: "CM25002",
      department: "CSE (AI&ML)",
      semester: 3,
      section: "B",
      parentPhone: "+919876525002",
    },
    {
      id: 9,
      role: "student",
      name: "Aarav Sharma",
      identifier: "SBJ23CSE001",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      parentPhone: "+919876500001",
    },
  ];

  // 3. Populate Timetable from timetable_section_b.json
  const timetable: MockTimetable[] = [];
  let ttId = 1;

  for (const item of timetableSectionB as Array<{ day: string; startTime: string; endTime: string; subject: string; subjectCode: string; faculty?: string; type: string }>) {
    const day = item.day.toLowerCase();
    const isBreak = item.type === "BREAK" || item.subjectCode === "LUNCH";
    
    // For CSE (AI&ML) Sem 3 Sec B
    timetable.push({
      id: ttId++,
      department: "CSE (AI&ML)",
      semester: 3,
      section: "B",
      dayOfWeek: day,
      startTime: item.startTime,
      endTime: item.endTime,
      subjectName: item.subject,
      subjectCode: item.subjectCode,
      facultyName: item.faculty || "-",
      isBreak,
    });

    // Also support Computer Science & Engineering alias
    timetable.push({
      id: ttId++,
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      dayOfWeek: day,
      startTime: item.startTime,
      endTime: item.endTime,
      subjectName: item.subject,
      subjectCode: item.subjectCode,
      facultyName: item.faculty || "-",
      isBreak,
    });
  }

  const gatePasses: MockGatePass[] = [
    {
      id: 1,
      passId: "GP-2026-8921",
      studentUsn: "CM25001",
      studentName: "Aaditya Sharma",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      reason: "Medical Appointment / Health Emergency",
      requestTimestamp: new Date(Date.now() - 3600000),
      status: "approved",
      flow: "academic",
      currentSubject: "Database Management",
      currentSubjectCode: "CS303",
      currentFaculty: "Dr. M. Khan",
      slotStart: "11:15",
      slotEnd: "12:15",
      mentorName: "Prof. Fifth A Mentor",
      mentorActionAt: new Date(Date.now() - 3000000),
      hodName: "Dr. CSE HOD",
      hodActionAt: new Date(Date.now() - 2500000),
      qrToken: "GP8921-SIG-VALID-2026",
      qrPayload: "SBJITMR|PASS=GP-2026-8921|SIG=MOCK_SIG_VALID",
      qrIssuedAt: new Date(Date.now() - 2500000),
      qrExpiresAt: new Date(Date.now() + 18000000),
      parentSmsSent: true,
      parentSmsBody: "Dear Parent, Gate Pass GP-2026-8921 for Aaditya Sharma has been approved.",
    },
    {
      id: 2,
      passId: "GP-2026-8922",
      studentUsn: "CM25002",
      studentName: "Aakash Verma",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      reason: "Academic Off-Campus Work / Project",
      requestTimestamp: new Date(Date.now() - 1800000),
      status: "pending_mentor",
      flow: "academic",
      currentSubject: "Computer Networks",
      currentSubjectCode: "CS304",
      currentFaculty: "Prof. N. Reddy",
      slotStart: "12:15",
      slotEnd: "13:15",
      parentSmsSent: false,
    },
  ];

  const exitLogs: MockExitLog[] = [
    {
      id: 1,
      passId: "GP-2026-8918",
      studentUsn: "SBJ23CSE001",
      studentName: "Aarav Sharma",
      scannedBy: "Security Guard 1",
      exitTimestamp: new Date(Date.now() - 7200000),
      notes: "Main Campus Gate 1 Exit",
    },
  ];

  const parentSmsLogs: MockSmsLog[] = [
    {
      id: 1,
      passId: "GP-2026-8921",
      studentName: "Aaditya Sharma",
      studentUsn: "CM25001",
      parentPhone: "+919876525001",
      body: "Dear Parent, Gate Pass GP-2026-8921 for Aaditya Sharma has been approved.",
      sentAt: new Date(Date.now() - 2500000),
    },
  ];

  globalStore.__gpMockStore = {
    users,
    rollList,
    timetable,
    gatePasses,
    exitLogs,
    parentSmsLogs,
  };
}

export const mockStore = globalStore.__gpMockStore!;
