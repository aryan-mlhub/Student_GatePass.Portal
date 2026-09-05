import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums ----------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "student",
  "mentor",
  "hod",
  "security",
  "admin",
]);

export const passStatusEnum = pgEnum("pass_status", [
  "pending_mentor",
  "pending_hod",
  "approved",
  "rejected",
]);

export const passFlowEnum = pgEnum("pass_flow", [
  "academic", // routes to mentor + HOD
  "free_period", // routes to HOD only
  "emergency", // routes to mentor + HOD
]);

// Pre-loaded roll list -------------------------------------------------------
export const rollList = pgTable(
  "roll_list",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    usn: varchar("usn", { length: 32 }).notNull(),
    studentName: text("student_name").notNull(),
    department: text("department").notNull(),
    semester: integer("semester").notNull(),
    section: text("section").notNull(),
    parentPhone: varchar("parent_phone", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    usnUnique: uniqueIndex("roll_list_usn_unique").on(t.usn),
    deptSemSecIdx: index("roll_list_dept_sem_sec").on(
      t.department,
      t.semester,
      t.section,
    ),
  }),
);

// Users ----------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    role: userRoleEnum("role").notNull(),
    name: text("name").notNull(),
    // For students this is the USN, for staff this is the employee id
    identifier: varchar("identifier", { length: 64 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    // Clerk Authentication User ID
    clerkId: varchar("clerk_id", { length: 128 }),
    // For students (linked to roll list)
    department: text("department"),
    semester: integer("semester"),
    section: text("section"),
    parentPhone: varchar("parent_phone", { length: 20 }),
    // For mentors / HOD
    managedDepartment: text("managed_department"),
    managedSemester: integer("managed_semester"),
    managedSection: text("managed_section"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    identifierRoleUnique: uniqueIndex("users_identifier_role_unique").on(
      t.identifier,
      t.role,
    ),
    clerkIdIdx: index("users_clerk_id_idx").on(t.clerkId),
  }),
);

// Timetable ------------------------------------------------------------------
export const timetable = pgTable(
  "timetable",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    department: text("department").notNull(),
    semester: integer("semester").notNull(),
    section: text("section").notNull(),
    dayOfWeek: text("day_of_week").notNull(), // monday..saturday
    startTime: varchar("start_time", { length: 8 }).notNull(), // "09:00"
    endTime: varchar("end_time", { length: 8 }).notNull(), // "10:00"
    subjectName: text("subject_name").notNull(),
    subjectCode: varchar("subject_code", { length: 32 }).notNull(),
    facultyName: text("faculty_name").notNull(),
    isBreak: boolean("is_break").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    lookupIdx: index("timetable_lookup").on(
      t.department,
      t.semester,
      t.section,
      t.dayOfWeek,
    ),
  }),
);

// Gate Pass Requests ---------------------------------------------------------
export const gatePasses = pgTable(
  "gate_passes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    passId: varchar("pass_id", { length: 32 }).notNull(),
    studentUsn: varchar("student_usn", { length: 32 }).notNull(),
    studentName: text("student_name").notNull(),
    department: text("department").notNull(),
    semester: integer("semester").notNull(),
    section: text("section").notNull(),
    reason: text("reason").notNull(),
    requestTimestamp: timestamp("request_timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: passStatusEnum("status").notNull().default("pending_mentor"),
    flow: passFlowEnum("flow").notNull().default("academic"),
    // Current timetable context at time of request
    currentSubject: text("current_subject"),
    currentSubjectCode: varchar("current_subject_code", { length: 32 }),
    currentFaculty: text("current_faculty"),
    slotStart: varchar("slot_start", { length: 8 }),
    slotEnd: varchar("slot_end", { length: 8 }),
    // Mentor approval
    mentorName: text("mentor_name"),
    mentorActionAt: timestamp("mentor_action_at", { withTimezone: true }),
    mentorComment: text("mentor_comment"),
    // HOD approval
    hodName: text("hod_name"),
    hodActionAt: timestamp("hod_action_at", { withTimezone: true }),
    hodComment: text("hod_comment"),
    // Final approval payload / QR
    qrToken: varchar("qr_token", { length: 128 }),
    qrPayload: text("qr_payload"),
    qrIssuedAt: timestamp("qr_issued_at", { withTimezone: true }),
    qrExpiresAt: timestamp("qr_expires_at", { withTimezone: true }),
    // Exit log
    exitTimestamp: timestamp("exit_timestamp", { withTimezone: true }),
    exitLoggedBy: text("exit_logged_by"),
    // Parent SMS log
    parentSmsSent: boolean("parent_sms_sent").notNull().default(false),
    parentSmsBody: text("parent_sms_body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    passIdUnique: uniqueIndex("gate_passes_pass_id_unique").on(t.passId),
    qrTokenUnique: uniqueIndex("gate_passes_qr_token_unique").on(t.qrToken),
    studentIdx: index("gate_passes_student").on(t.studentUsn),
    statusIdx: index("gate_passes_status").on(t.status),
  }),
);

// Parent SMS log (simulated delivery) ---------------------------------------
export const parentSmsLog = pgTable("parent_sms_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  passId: varchar("pass_id", { length: 32 }).notNull(),
  studentName: text("student_name").notNull(),
  studentUsn: varchar("student_usn", { length: 32 }).notNull(),
  parentPhone: varchar("parent_phone", { length: 20 }).notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

// Exit Logs ------------------------------------------------------------------
export const exitLogs = pgTable(
  "exit_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    passId: varchar("pass_id", { length: 32 }).notNull(),
    studentUsn: varchar("student_usn", { length: 32 }).notNull(),
    studentName: text("student_name").notNull(),
    scannedBy: text("scanned_by").notNull(),
    exitTimestamp: timestamp("exit_timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
  },
  (t) => ({
    passIdx: index("exit_logs_pass").on(t.passId),
  }),
);

// re-export sql helper for queries
export { sql };
