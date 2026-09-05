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
  scannedBy: string;
  exitTimestamp: Date;
  notes?: string | null;
}

export interface MockSmsLog {
  id: number;
  passId: string;
  studentName: string;
  studentUsn: string;
  parentPhone: string;
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
  const rollList: MockRoll[] = [
    { id: 1, usn: "CM25001", studentName: "Aaditya Sharma", department: "Computer Science & Engineering", semester: 5, section: "A", parentPhone: "+919876525001" },
    { id: 2, usn: "CM25002", studentName: "Aakash Verma", department: "Computer Science & Engineering", semester: 5, section: "A", parentPhone: "+919876525002" },
    { id: 3, usn: "CM25003", studentName: "Abhishek Kumar", department: "Computer Science & Engineering", semester: 5, section: "A", parentPhone: "+919876525003" },
    { id: 4, usn: "SBJ23CSE001", studentName: "Aarav Sharma", department: "Computer Science & Engineering", semester: 5, section: "A", parentPhone: "+919876500001" },
    { id: 5, usn: "SBJ23CSE002", studentName: "Aditi Verma", department: "Computer Science & Engineering", semester: 5, section: "B", parentPhone: "+919876500002" },
    { id: 6, usn: "SBJ23AIM001", studentName: "Priya Patel", department: "Artificial Intelligence & ML", semester: 3, section: "B", parentPhone: "+919876500003" },
  ];

  const users: MockUser[] = [
    {
      id: 1,
      role: "student",
      name: "Aaditya Sharma",
      identifier: "CM25001",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      parentPhone: "+919876525001",
    },
    {
      id: 2,
      role: "student",
      name: "Aarav Sharma",
      identifier: "SBJ23CSE001",
      department: "Computer Science & Engineering",
      semester: 5,
      section: "A",
      parentPhone: "+919876500001",
    },
    {
      id: 3,
      role: "mentor",
      name: "Prof. Fifth A Mentor",
      identifier: "mentor_cse_5_a",
      managedDepartment: "Computer Science & Engineering",
      managedSemester: 5,
      managedSection: "A",
    },
    {
      id: 4,
      role: "hod",
      name: "Dr. CSE HOD",
      identifier: "hod_cse",
      managedDepartment: "Computer Science & Engineering",
    },
    {
      id: 5,
      role: "security",
      name: "Security Guard 1",
      identifier: "guard1",
    },
    {
      id: 6,
      role: "admin",
      name: "System Administrator",
      identifier: "admin",
    },
  ];

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const SLOTS = [
    { start: "09:00", end: "10:00", subject: "Data Structures", code: "CS301", faculty: "Dr. S. Joshi", isBreak: false },
    { start: "10:00", end: "11:00", subject: "Operating Systems", code: "CS302", faculty: "Prof. R. Iyer", isBreak: false },
    { start: "11:00", end: "11:15", subject: "Tea Break", code: "BRK", faculty: "-", isBreak: true },
    { start: "11:15", end: "12:15", subject: "Database Management", code: "CS303", faculty: "Dr. M. Khan", isBreak: false },
    { start: "12:15", end: "13:15", subject: "Computer Networks", code: "CS304", faculty: "Prof. N. Reddy", isBreak: false },
    { start: "13:15", end: "14:00", subject: "Lunch Break", code: "BRK", faculty: "-", isBreak: true },
    { start: "14:00", end: "15:00", subject: "Software Engineering", code: "CS305", faculty: "Dr. A. Verma", isBreak: false },
    { start: "15:00", end: "16:00", subject: "Web Technologies Lab", code: "CS306L", faculty: "Prof. P. Sharma", isBreak: false },
  ];

  const timetable: MockTimetable[] = [];
  let ttId = 1;
  for (const day of DAYS) {
    for (const s of SLOTS) {
      timetable.push({
        id: ttId++,
        department: "Computer Science & Engineering",
        semester: 5,
        section: "A",
        dayOfWeek: day,
        startTime: s.start,
        endTime: s.end,
        subjectName: s.subject,
        subjectCode: s.code,
        facultyName: s.faculty,
        isBreak: s.isBreak,
      });
    }
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
