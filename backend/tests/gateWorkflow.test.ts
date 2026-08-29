import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import './setup.js';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Timetable } from '../src/models/Timetable.js';
import { CampusConfig } from '../src/models/CampusConfig.js';
import { env } from '../src/config/env.js';

describe('GATEGUARD End-to-End Gate Workflow & Verification Scenarios', () => {
  const app = createApp();
  const campusLat = 21.2227;
  const campusLon = 79.0494;

  let studentToken: string;
  let studentUser: any;
  let wardenToken: string;
  let wardenUser: any;
  let guardToken: string;
  let guardUser: any;

  // Timestamps using local Date instances so hour matching is timezone-agnostic
  const wednesdayFreePeriod = new Date(2026, 8, 2, 14, 0, 0).toISOString(); // 14:00 on Wed
  const wednesdayActiveLecture = new Date(2026, 8, 2, 15, 0, 0).toISOString(); // 15:00 on Wed

  beforeEach(async () => {
    // Setup Campus Geofence
    await CampusConfig.create({
      campusName: 'S. B. Jain Institute of Technology, Nagpur',
      latitude: campusLat,
      longitude: campusLon,
      radiusMeters: 200,
      isActive: true,
    });

    // Create Student
    studentUser = await User.create({
      name: 'Alex Mercer',
      studentId: 'SBJ-2026-AIML-042',
      email: 'alex@sbjit.edu',
      passwordHash: 'pass123',
      role: 'STUDENT',
      department: 'CSE(AI&ML)',
      semester: 3,
      section: 'B',
    });
    studentToken = jwt.sign(
      { userId: studentUser._id.toString(), role: 'STUDENT' },
      env.JWT_SECRET
    );

    // Create Warden
    wardenUser = await User.create({
      name: 'Dr. Sarah Connor',
      email: 'warden@sbjit.edu',
      passwordHash: 'pass123',
      role: 'WARDEN',
    });
    wardenToken = jwt.sign(
      { userId: wardenUser._id.toString(), role: 'WARDEN' },
      env.JWT_SECRET
    );

    // Create Guard
    guardUser = await User.create({
      name: 'Officer John Davis',
      email: 'guard@sbjit.edu',
      passwordHash: 'pass123',
      role: 'GUARD',
    });
    guardToken = jwt.sign(
      { userId: guardUser._id.toString(), role: 'GUARD' },
      env.JWT_SECRET
    );

    // Seed Wednesday Timetable Slot: 13:30 to 14:30 (FREE period)
    await Timetable.create({
      day: 'WEDNESDAY',
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

    // Seed Wednesday Timetable Slot: 14:30 to 15:30 (ACTIVE OOP lecture)
    await Timetable.create({
      day: 'WEDNESDAY',
      startTime: '14:30',
      endTime: '15:30',
      startMinutes: 870,
      endMinutes: 930,
      subject: 'Object Oriented Programming',
      subjectCode: 'PCC-CS303',
      room: 'LH-201',
      section: 'B',
      semester: 3,
      department: 'CSE(AI&ML)',
      status: 'ACTIVE',
    });
  });

  it('Scenario 1: Student Requests Pass during Free Period -> AUTO_APPROVED & QR Issued', async () => {
    const res = await request(app)
      .post('/api/passes/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        reason: 'Project work in town',
        latitude: campusLat,
        longitude: campusLon,
        timestamp: wednesdayFreePeriod,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.decision).toBe('AUTO_APPROVED');
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.qrToken).toBeDefined();
  });

  it('Scenario 2: Student Requests Pass during Active Lecture -> PENDING (Requires Warden Approval)', async () => {
    const res = await request(app)
      .post('/api/passes/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        reason: 'Dentist appointment',
        latitude: campusLat,
        longitude: campusLon,
        timestamp: wednesdayActiveLecture,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.decision).toBe('REQUIRES_APPROVAL');
    expect(res.body.data.status).toBe('PENDING');

    const passId = res.body.data.passId;

    // Warden views pending passes
    const pendingRes = await request(app)
      .get('/api/admin/passes/pending')
      .set('Authorization', `Bearer ${wardenToken}`);

    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data.count).toBeGreaterThan(0);

    // Warden approves the pass
    const approveRes = await request(app)
      .post(`/api/admin/passes/${passId}/approve`)
      .set('Authorization', `Bearer ${wardenToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.pass.status).toBe('ACTIVE');

    // Student fetches QR code
    const qrRes = await request(app)
      .get(`/api/passes/${passId}/qr`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(qrRes.status).toBe(200);
    expect(qrRes.body.data.qrToken).toBeDefined();
    expect(qrRes.body.data.qrImage).toBeDefined();
  });

  it('Scenario 3: Guard Verification and Campus Exit Flow', async () => {
    // 1. Request pass
    const reqRes = await request(app)
      .post('/api/passes/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        reason: 'Hospital visit',
        latitude: campusLat,
        longitude: campusLon,
        timestamp: wednesdayFreePeriod,
      });

    const qrToken = reqRes.body.data.qrToken;

    // 2. Guard verifies QR
    const verifyRes = await request(app)
      .post('/api/gate/verify')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        token: qrToken,
        gateId: 'MAIN_GATE',
        latitude: campusLat,
        longitude: campusLon,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('VALID');

    // 3. Guard records EXIT
    const exitRes = await request(app)
      .post('/api/gate/exit')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        token: qrToken,
        gateId: 'MAIN_GATE',
        latitude: campusLat,
        longitude: campusLon,
      });

    expect(exitRes.status).toBe(200);
    expect(exitRes.body.data.action).toBe('EXIT');
    expect(exitRes.body.data.verified).toBe(true);

    // 4. Duplicate Exit Attempt with same QR -> 409 Rejection
    const replayRes = await request(app)
      .post('/api/gate/exit')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        token: qrToken,
        gateId: 'MAIN_GATE',
        latitude: campusLat,
        longitude: campusLon,
      });

    expect(replayRes.status).toBe(409);
    expect(replayRes.body.code).toBe('PASS_ALREADY_USED');
  });

  it('Scenario 4: Guard Verification at Wrong Gate -> DENIED', async () => {
    // Create pass specifically for NORTH_GATE
    const reqRes = await request(app)
      .post('/api/passes/request')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        reason: 'Hostel exit',
        gateId: 'NORTH_GATE',
        latitude: campusLat,
        longitude: campusLon,
        timestamp: wednesdayFreePeriod,
      });

    const qrToken = reqRes.body.data.qrToken;

    // Guard scans at MAIN_GATE
    const verifyRes = await request(app)
      .post('/api/gate/verify')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        token: qrToken,
        gateId: 'MAIN_GATE', // Wrong Gate!
        latitude: campusLat,
        longitude: campusLon,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('INVALID');
    expect(verifyRes.body.data.code).toBe('WRONG_GATE');
  });
});
