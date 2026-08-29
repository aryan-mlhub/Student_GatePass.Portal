import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
import { User } from '../src/models/User.js';
import { Timetable } from '../src/models/Timetable.js';
import { TimetableOverride } from '../src/models/TimetableOverride.js';
import { GatePass } from '../src/models/GatePass.js';
import { CampusConfig } from '../src/models/CampusConfig.js';
import { TimetableEngine } from '../src/services/timetableEngine.js';

describe('TimetableEngine Decision Logic (Core Engine)', () => {
  let student: any;
  const campusLat = 21.2227;
  const campusLon = 79.0494;

  beforeEach(async () => {
    // Setup active campus config
    await CampusConfig.create({
      campusName: 'S. B. Jain Institute of Technology, Nagpur',
      latitude: campusLat,
      longitude: campusLon,
      radiusMeters: 200,
      isActive: true,
    });

    // Create student
    student = await User.create({
      name: 'Alex Mercer',
      studentId: 'SBJ-2026-AIML-042',
      email: 'alex.mercer@sbjit.edu',
      passwordHash: 'password123',
      role: 'STUDENT',
      department: 'CSE(AI&ML)',
      semester: 3,
      section: 'B',
    });

    // Seed Monday timetable slot: DSA 09:30 to 10:30 (570 to 630 mins)
    await Timetable.create({
      day: 'MONDAY',
      startTime: '09:30',
      endTime: '10:30',
      startMinutes: 570,
      endMinutes: 630,
      subject: 'Data Structures & Algorithms',
      subjectCode: 'PCC-AIML301',
      room: 'LH-201',
      faculty: 'Prof. V. K. Joshi',
      section: 'B',
      semester: 3,
      department: 'CSE(AI&ML)',
      status: 'ACTIVE',
    });

    // Seed Monday timetable slot: Free Period 13:30 to 14:30 (810 to 870 mins)
    await Timetable.create({
      day: 'MONDAY',
      startTime: '13:30',
      endTime: '14:30',
      startMinutes: 810,
      endMinutes: 870,
      subject: 'Self-Study & Library Period',
      subjectCode: 'FREE',
      room: 'Central Library',
      section: 'B',
      semester: 3,
      department: 'CSE(AI&ML)',
      status: 'FREE',
    });
  });

  it('Scenario 1: Active Scheduled Lecture in Progress -> REQUIRES_APPROVAL', async () => {
    // Monday at 10:00 AM (Within DSA lecture 09:30 - 10:30)
    // Date: 2026-08-31 is a Monday
    const testDate = new Date('2026-08-31T10:00:00');

    const result = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: testDate,
      latitude: campusLat,
      longitude: campusLon,
    });

    expect(result.decision).toBe('REQUIRES_APPROVAL');
    expect(result.currentClass).toBe('Data Structures & Algorithms');
    expect(result.timetableStatus).toBe('ACTIVE');
    expect(result.reason).toContain('Active lecture in progress');
    expect(result.locationValid).toBe(true);
  });

  it('Scenario 2: Lecture with CANCELLED Override -> AUTO_APPROVED', async () => {
    const testDate = new Date('2026-08-31T10:00:00');

    // Create CANCEL override for that date
    await TimetableOverride.create({
      section: 'B',
      date: '2026-08-31',
      type: 'CANCEL',
      reason: 'Instructor attending academic conference',
      createdBy: student._id,
    });

    const result = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: testDate,
      latitude: campusLat,
      longitude: campusLon,
    });

    expect(result.decision).toBe('AUTO_APPROVED');
    expect(result.timetableStatus).toBe('CANCELLED');
    expect(result.reason).toContain('Current lecture has been cancelled');
    expect(result.overrideApplied?.type).toBe('CANCEL');
  });

  it('Scenario 3: Lecture with RESCHEDULED Override -> AUTO_APPROVED', async () => {
    const testDate = new Date('2026-08-31T10:00:00');

    // Reschedule DSA from 09:30-10:30 to 15:30-16:30
    await TimetableOverride.create({
      section: 'B',
      date: '2026-08-31',
      type: 'RESCHEDULE',
      newStartTime: '15:30',
      newEndTime: '16:30',
      newStartMinutes: 930,
      newEndMinutes: 990,
      reason: 'Department lab maintenance',
    });

    const result = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: testDate,
      latitude: campusLat,
      longitude: campusLon,
    });

    expect(result.decision).toBe('AUTO_APPROVED');
    expect(result.timetableStatus).toBe('RESCHEDULED');
    expect(result.reason).toContain('rescheduled to 15:30-16:30');
  });

  it('Scenario 4: Free Scheduled Period -> AUTO_APPROVED', async () => {
    // Monday at 14:00 (Within Free Library period 13:30 - 14:30)
    const testDate = new Date('2026-08-31T14:00:00');

    const result = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: testDate,
      latitude: campusLat,
      longitude: campusLon,
    });

    expect(result.decision).toBe('AUTO_APPROVED');
    expect(result.timetableStatus).toBe('FREE');
    expect(result.reason).toContain('free period');
  });

  it('Scenario 5: Outside Campus Geofence Boundary -> REJECT_LOCATION', async () => {
    const testDate = new Date('2026-08-31T14:00:00');

    // Student coordinates 5km away from campus
    const result = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: testDate,
      latitude: 21.1458,
      longitude: 79.0882,
    });

    expect(result.decision).toBe('REJECT_LOCATION');
    expect(result.locationValid).toBe(false);
    expect(result.reason).toContain('outside campus boundary');
  });

  it('Scenario 6: Student Already Has an Active Gate Pass -> REJECT_DUPLICATE', async () => {
    const testDate = new Date('2026-08-31T14:00:00');

    // Create an existing active pass valid until 14:30
    await GatePass.create({
      passId: 'GP-8888',
      studentId: student._id,
      reason: 'Library research',
      requestedAt: new Date('2026-08-31T13:45:00'),
      expiresAt: new Date('2026-08-31T14:30:00'),
      status: 'ACTIVE',
      decision: 'AUTO_APPROVED',
      requestLocation: { latitude: campusLat, longitude: campusLon },
    });

    const result = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: testDate,
      latitude: campusLat,
      longitude: campusLon,
    });

    expect(result.decision).toBe('REJECT_DUPLICATE');
    expect(result.reason).toContain('already has an active gate pass');
  });

  it('Scenario 7: Live Student Current Status Evaluation', async () => {
    const testDate = new Date('2026-08-31T10:00:00'); // During DSA class

    const status = await TimetableEngine.getCurrentStudentTimetableStatus(
      student._id.toString(),
      testDate
    );

    expect(status.isFreePeriod).toBe(false);
    expect(status.currentClass?.subject).toBe('Data Structures & Algorithms');
    expect(status.currentClass?.status).toBe('ACTIVE');
  });
});
