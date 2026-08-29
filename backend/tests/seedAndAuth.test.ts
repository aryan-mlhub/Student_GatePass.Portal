import { describe, it, expect } from 'vitest';
import request from 'supertest';
import './setup.js';
import { createApp } from '../src/app.js';
import { seedUsers, realStudentMasterList } from '../src/seed/seedUsers.js';
import { User } from '../src/models/User.js';

describe('Real Student Master Data & Seed Integrity', () => {
  const app = createApp();

  it('should seed real student master list with CM25O15 validation warning', async () => {
    const result = await seedUsers();

    expect(result.studentsCount).toBe(realStudentMasterList.length);
    expect(result.adminCount).toBe(1);
    expect(result.wardenCount).toBe(1);
    expect(result.guardsCount).toBe(2);

    // Verify warning for CM25O15
    const cm25o15Warning = result.warnings.find((w) => w.studentId === 'CM25O15');
    expect(cm25o15Warning).toBeDefined();
    expect(cm25o15Warning?.warning).toContain('Student ID contains unexpected character O. Verify whether this should be CM25015.');

    // Verify student document in DB
    const student = await User.findOne({ studentId: 'CM25O15' });
    expect(student).toBeDefined();
    expect(student?.name).toBe('Bhavesh Gawande');
    expect(student?.department).toBe('CSE (AI&ML)');
    expect(student?.semester).toBe(3);
    expect(student?.section).toBe('B');
    expect(student?.isActive).toBe(true);
  });

  it('should be idempotent: running seedUsers again does not create duplicate students', async () => {
    await seedUsers();
    const countFirst = await User.countDocuments({ role: 'STUDENT' });

    await seedUsers();
    const countSecond = await User.countDocuments({ role: 'STUDENT' });

    expect(countFirst).toBe(countSecond);
    expect(countSecond).toBe(realStudentMasterList.length);
  });

  it('should allow student authentication via studentId + demo password', async () => {
    await seedUsers();

    // Authenticate using studentId
    const res = await request(app).post('/api/auth/login').send({
      studentId: 'CM25001',
      password: 'student123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.studentId).toBe('CM25001');
    expect(res.body.data.user.name).toBe('Aaditya Sharma');
    expect(res.body.data.user.section).toBe('B');
    expect(res.body.data.user.semester).toBe(3);
    expect(res.body.data.user.department).toBe('CSE (AI&ML)');
  });

  it('should allow student CM25O15 authentication via studentId + demo password', async () => {
    await seedUsers();

    const res = await request(app).post('/api/auth/login').send({
      studentId: 'CM25O15',
      password: 'student123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.studentId).toBe('CM25O15');
    expect(res.body.data.user.name).toBe('Bhavesh Gawande');
  });

  it('should reject invalid password for real students', async () => {
    await seedUsers();

    const res = await request(app).post('/api/auth/login').send({
      studentId: 'CM25001',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});
