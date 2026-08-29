# GATEGUARD: Timetable-Aware Campus Gate Pass Engine

> **Production-ready, timetable-aware campus gate pass and physical access automation backend.**
> Designed for rapid frontend integration across Mobile (Flutter, React Native) and Web dashboards (Admin, Warden, Guard).

---

## 1. Project Overview

GATEGUARD automates campus student physical exit and entry by evaluating live academic timetables in real-time. Instead of manual paper registers or static permission slips, GATEGUARD evaluates student requests against their live lecture schedule, active cancellations, room relocations, night curfew rules, and Haversine campus geofences.

### Core Capabilities:
- **Timetable-Aware Evaluation Engine**: Intelligently auto-approves passes during free periods, breaks, and cancelled lectures, while routing active lecture requests to Wardens for review.
- **Dynamic Timetable Overrides**: Real-time lecture cancellations, reschedulings, and extra classes instantly take precedence over master timetables.
- **Single-Use Dynamic QR System**: Cryptographically signed JWT tokens with strict expiration and atomic database status locking (`ACTIVE` $\rightarrow$ `USED`) eliminating screenshot sharing and replay attacks.
- **Haversine Campus Geofencing**: Validates that pass requests originate from physically within the authorized campus perimeter.
- **Role-Based Access Control (RBAC)**: Dedicated endpoints for `STUDENT`, `GUARD`, `WARDEN`, and `ADMIN`.
- **Physical Access Audit Ledger**: Full audit logging of exits, entries, and denied scan attempts with timestamp and terminal coordinates.

---

## 2. Technology Stack

- **Runtime & Language**: Node.js v20+ with TypeScript / ES Modules
- **Web Framework**: Express.js
- **Database & ODM**: MongoDB with Mongoose
- **Security & Cryptography**: JWT (JsonWebToken), Bcryptjs, Helmet, CORS
- **Validation**: Zod runtime schema validation
- **QR Code Generation**: QRCode (Base64 Data URLs)
- **Testing**: Vitest with `mongodb-memory-server` and `supertest`

---

## 3. Architecture & Folder Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection manager & event listeners
│   │   └── env.ts              # Zod-validated environment config
│   │
│   ├── models/
│   │   ├── User.ts             # RBAC User schema (STUDENT, GUARD, WARDEN, ADMIN)
│   │   ├── Timetable.ts        # Weekly slots with startMinutes/endMinutes
│   │   ├── TimetableOverride.ts# Dynamic overrides (CANCEL, RESCHEDULE, ADD)
│   │   ├── GatePass.ts         # Pass lifecycle states & decisions
│   │   ├── GateLog.ts          # Physical access audit ledger (EXIT, ENTRY, DENIED)
│   │   ├── Notification.ts     # In-app notifications
│   │   └── CampusConfig.ts     # Geofence center & radius
│   │
│   ├── controllers/
│   │   ├── authController.ts   # Register, Login, GetMe
│   │   ├── studentController.ts# Live current status, my timetable, my passes
│   │   ├── passController.ts   # Request pass, view passes, get signed QR
│   │   ├── timetableController.ts # CRUD slots, cancel, reschedule, add
│   │   ├── gateController.ts   # QR verify, atomic exit, re-entry
│   │   └── adminController.ts  # Warden approval/rejection, analytics dashboard, logs
│   │
│   ├── routes/
│   │   ├── authRoutes.ts       # /api/auth
│   │   ├── studentRoutes.ts    # /api/student
│   │   ├── passRoutes.ts       # /api/passes
│   │   ├── timetableRoutes.ts  # /api/timetable
│   │   ├── gateRoutes.ts       # /api/gate
│   │   └── adminRoutes.ts      # /api/admin
│   │
│   ├── services/
│   │   ├── timetableEngine.ts  # Core decision evaluation engine
│   │   ├── geofenceService.ts  # Haversine distance calculator
│   │   ├── qrService.ts        # Cryptographic JWT QR signer & verifier
│   │   ├── notificationService.ts # Internal notification dispatcher
│   │   └── passService.ts      # Pass lifecycle & approval transitions
│   │
│   ├── middleware/
│   │   ├── authenticate.ts     # Bearer JWT token authenticator
│   │   ├── authorize.ts        # RBAC role authorizer
│   │   ├── errorHandler.ts     # Centralized error handler
│   │   └── validate.ts         # Zod request validator
│   │
│   ├── utils/
│   │   ├── haversine.ts        # Great-circle distance formula
│   │   ├── response.ts         # Standard API success/error wrappers
│   │   └── logger.ts           # Structured logging
│   │
│   ├── seed/
│   │   ├── seedUsers.ts        # Admin, Warden, Guards, Students
│   │   ├── seedTimetable.ts    # Real SB Jain CSE(AI&ML) Sem-3 Section B & A timetable
│   │   └── seedDatabase.ts     # Master seed runner
│   │
│   ├── app.ts                  # Express app configuration
│   └── server.ts               # Server startup
│
├── tests/
│   ├── setup.ts                # In-memory Mongo test harness
│   ├── timetableEngine.test.ts # Core timetable engine decision tests
│   ├── geofence.test.ts        # Haversine distance tests
│   ├── qrService.test.ts       # QR signing and expiration tests
│   └── gateWorkflow.test.ts    # End-to-end pass and guard scan tests
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Setup & Installation

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI

### Installation Steps

1. **Clone or Navigate to Project Directory**:
   ```bash
   cd backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

   `.env` parameters:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/gateguard
   JWT_SECRET=gateguard_super_secret_jwt_key_2026_change_in_production
   QR_SECRET=gateguard_dedicated_qr_signing_secret_key_2026
   CAMPUS_LATITUDE=21.2227
   CAMPUS_LONGITUDE=79.0494
   CAMPUS_RADIUS_METERS=200
   QR_EXPIRY_MINUTES=30
   NODE_ENV=development
   ```

4. **Seed Database with Real College Timetable & Demo Accounts**:
   ```bash
   npm run seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Server will start at: `http://localhost:5000`

6. **Run Automated Test Suite**:
   ```bash
   npm run test
   ```

---

## 5. Pre-Seeded Demo Accounts & Real Student Master Data

All accounts are pre-seeded idempotently with standard demo passwords (hashed securely via Bcrypt):

### 5.1 Staff & Security Demo Accounts
| Role | Email / Identifier | Password | Details |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@gateguard.demo` | `admin123` | Full system access & master timetable manager |
| **WARDEN** | `warden@gateguard.demo` | `warden123` | Approves / rejects pending student passes |
| **GUARD** | `guard@gateguard.demo` | `guard123` | Main Gate QR scanner terminal |
| **GUARD** | `northguard@gateguard.demo` | `guard123` | North Gate QR scanner terminal |

### 5.2 Real Student Master Data (CSE AI&ML, 3rd Sem, Section B)
Students can log in via **`studentId`** (or email) and standard demo password **`student123`**:

| Student ID | Full Name | Email | Password | Department & Section |
| :--- | :--- | :--- | :--- | :--- |
| `CM25001` | Aaditya Sharma | `cm25001@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |
| `CM25002` | Aakash Verma | `cm25002@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |
| `CM25003` | Abhishek Kumar | `cm25003@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |
| `CM25004` | Aditi Deshmukh | `cm25004@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |
| `CM25005` | Aditya Wankhede | `cm25005@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |
| ... | *(Full 68 Students Seeded)* | ... | `student123` | CSE (AI&ML), Sem 3, Sec B |
| `CM25O15` ⚠️ | Bhavesh Gawande | `cm25o15@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |
| `CM25068` | Yashodhara Vaidya | `cm25068@sbjit.edu` | `student123` | CSE (AI&ML), Sem 3, Sec B |

> **⚠️ Data Validation Warning (CM25O15)**:
> The student list contains `CM25O15` (letter `O` instead of digit `0`). The seed script preserves identity fidelity and emits a validation warning:
> `CM25O15 → Student ID contains unexpected character O. Verify whether this should be CM25015.`


---

## 6. Real College Timetable Embedded in Seed

**College**: S. B. Jain Institute of Technology, Management & Research, Nagpur  
**Department**: Emerging Technologies CSE (AI&ML) | **Year**: 2026-27 | **Semester**: 3rd Semester | **Section**: B & A

| Day | 09:30 - 10:30 | 10:30 - 11:30 | 11:30 - 11:45 | 11:45 - 12:45 | 12:45 - 01:30 | 01:30 - 02:30 | 02:30 - 03:30 | 03:30 - 04:30 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Monday** | PCC-AIML301 (DSA) | BSC-CS302 (DMGT) | *Short Break* | PCC-CS303 (OOP) | *Lunch Break* | PCC-AIML305 (AI Fund.) | DSA Lab (B1) / OOP Lab (B2) | DSA Lab (B1) / OOP Lab (B2) |
| **Tuesday** | ESC-CS304 (DECA) | PCC-AIML301 (DSA) | *Short Break* | BSC-CS302 (DMGT) | *Lunch Break* | PCC-CS303 (OOP) | AI Lab (B1) / DECA Lab (B2) | AI Lab (B1) / DECA Lab (B2) |
| **Wednesday** | PCC-AIML305 (AI Fund.) | ESC-CS304 (DECA) | *Short Break* | PCC-AIML301 (DSA) | *Lunch Break* | FREE / Library | PCC-CS303 (OOP) | Mentoring & Remedial |
| **Thursday** | BSC-CS302 (DMGT) | PCC-CS303 (OOP) | *Short Break* | ESC-CS304 (DECA) | *Lunch Break* | PCC-AIML305 (AI Fund.) | OOP Lab (B1) / AI Lab (B2) | OOP Lab (B1) / AI Lab (B2) |
| **Friday** | PCC-AIML301 (DSA) | PCC-AIML305 (AI Fund.) | *Short Break* | BSC-CS302 (DMGT) | *Lunch Break* | ESC-CS304 (DECA) | Soft Skills / Mini Project | Soft Skills / Mini Project |
| **Saturday** | Remedial / Doubt | FREE | *Short Break* | Clubs / Co-Curricular | *Lunch Break* | FREE | FREE | FREE |

---

## 7. REST API Reference

### 7.1 Authentication (`/api/auth`)
- `POST /api/auth/register`: Register new user.
- `POST /api/auth/login`: Authenticate and receive Bearer JWT.
- `GET /api/auth/me`: Fetch current authenticated profile.

### 7.2 Student Endpoints (`/api/student`)
- `GET /api/student/current-status`: Live evaluation of current class, upcoming class, and free period status.
- `GET /api/student/timetable`: Weekly timetable for student's section.
- `GET /api/student/passes`: History of student's passes.
- `GET /api/student/notifications`: In-app notifications.

### 7.3 Gate Passes (`/api/passes`)
- `POST /api/passes/request`: Student requests pass. Runs live `TimetableEngine`.
- `GET /api/passes/:id`: Pass details.
- `GET /api/passes/:id/qr`: Returns signed JWT QR token and base64 QR code image.

### 7.4 Guard Scanner (`/api/gate`)
- `POST /api/gate/verify`: Guard scanner verifies dynamic QR token.
- `POST /api/gate/exit`: Atomic exit transition (`ACTIVE` $\rightarrow$ `USED`), logs physical exit.
- `POST /api/gate/entry`: Records campus re-entry.

### 7.5 Timetable & Dynamic Overrides (`/api/timetable`)
- `GET /api/timetable`: Query weekly slots by section, semester, day.
- `POST /api/timetable`: Create new slot (Admin).
- `PUT /api/timetable/:id`: Update slot (Admin).
- `DELETE /api/timetable/:id`: Delete slot (Admin).
- `POST /api/timetable/cancel`: Cancel a lecture on a specific date (auto-approves student passes during that period).
- `POST /api/timetable/reschedule`: Reschedule a lecture to a different hour.
- `POST /api/timetable/add`: Add an additional lecture for a specific date.

### 7.6 Admin & Warden (`/api/admin`)
- `GET /api/admin/passes/pending`: List all passes awaiting Warden approval.
- `POST /api/admin/passes/:id/approve`: Warden approves pending pass.
- `POST /api/admin/passes/:id/reject`: Warden rejects pending pass with reason.
- `GET /api/admin/dashboard`: Real-time analytics summary (`totalStudents`, `activePasses`, `pendingPasses`, `todayExits`, `todayEntries`, `deniedAttempts`).
- `GET /api/admin/gate-logs`: Searchable audit ledger with date/gate/action filters.
- `GET /api/admin/campus-config`: View active geofence coordinates and radius.
- `PUT /api/admin/campus-config`: Update campus coordinates or geofence radius.

---

## 8. Demo Scenarios & Test Coverage

All 8 demo scenarios are fully implemented and verified via automated tests:

1. **Scenario 1 (Active Lecture)**: Requesting during an active lecture routes to `PENDING` with decision `REQUIRES_APPROVAL`.
2. **Scenario 2 (Lecture Cancellation)**: Admin cancels lecture $\rightarrow$ student pass during that period auto-approves (`AUTO_APPROVED`).
3. **Scenario 3 (Lecture Rescheduled)**: Lecture moved to a new time $\rightarrow$ original slot becomes free and auto-approves (`AUTO_APPROVED`).
4. **Scenario 4 (GPS Spoofing / Off-Campus)**: Requesting from coordinates $>200$m from campus is rejected with `REJECT_LOCATION`.
5. **Scenario 5 (Valid QR Verification)**: Guard scans valid QR token $\rightarrow$ returns `VALID` and student details.
6. **Scenario 6 (Expired QR)**: Guard scans token past expiration $\rightarrow$ returns `INVALID` (`QR_EXPIRED`).
7. **Scenario 7 (Replay / Duplicate Scan)**: Guard attempts to scan an already-exited pass $\rightarrow$ rejected with `409` (`PASS_ALREADY_USED`).
8. **Scenario 8 (Wrong Gate)**: Guard at Main Gate scans a pass designated for North Gate $\rightarrow$ returns `INVALID` (`WRONG_GATE`).

---

## 9. Error Response Standards

Success Response:
```json
{
  "success": true,
  "data": {},
  "message": "Optional descriptive text"
}
```

Error Response:
```json
{
  "success": false,
  "message": "Human readable error description",
  "code": "PASS_ALREADY_USED"
}
```
