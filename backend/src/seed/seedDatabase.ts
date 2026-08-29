import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CampusConfig } from '../models/CampusConfig.js';
import { Timetable } from '../models/Timetable.js';
import { GatePass } from '../models/GatePass.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { seedUsers } from './seedUsers.js';
import { seedTimetable } from './seedTimetable.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase(): Promise<void> {
  await connectDatabase();

  // 1. Seed Campus Configuration
  await CampusConfig.findOneAndUpdate(
    { isActive: true },
    {
      campusName: 'S. B. Jain Institute of Technology, Management & Research, Nagpur',
      latitude: env.CAMPUS_LATITUDE || 21.2227,
      longitude: env.CAMPUS_LONGITUDE || 79.0494,
      radiusMeters: env.CAMPUS_RADIUS_METERS || 200,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 2. Seed Real Users & Master Student List
  const userSeedResult = await seedUsers();

  // 3. Seed Section B Timetable
  await seedTimetable();
  const timetableRecordsCount = await Timetable.countDocuments({ section: 'B' });

  // 4. Seed Sample Demo Passes & Notifications for instant demo readiness
  const sampleStudent = await User.findOne({ studentId: 'CM25001' });
  if (sampleStudent) {
    const existingPass = await GatePass.findOne({ passId: 'GP-1001' });
    if (!existingPass) {
      await GatePass.create({
        passId: 'GP-1001',
        studentId: sampleStudent._id,
        reason: 'Research Library Study & Lab Material Procurement',
        requestedAt: new Date(),
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60000),
        gateId: 'MAIN_GATE',
        status: 'ACTIVE',
        decision: 'AUTO_APPROVED',
        decisionReason: 'Free period: No active lecture scheduled at this time.',
        requestLocation: {
          latitude: env.CAMPUS_LATITUDE || 21.2227,
          longitude: env.CAMPUS_LONGITUDE || 79.0494,
          distanceMeters: 15.2,
        },
      });
    }

    const existingNotif = await Notification.findOne({ userId: sampleStudent._id });
    if (!existingNotif) {
      await Notification.create({
        userId: sampleStudent._id,
        type: 'PASS_APPROVED',
        title: 'Gate Pass Auto-Approved',
        message: 'Your gate pass GP-1001 has been auto-approved for campus exit.',
        metadata: { passId: 'GP-1001' },
      });
    }
  }

  // 5. Output Official Seed Summary
  console.log('\n========================================');
  console.log('GateGuard Database Seed');
  console.log('========================================\n');
  console.log(`Students imported: ${userSeedResult.studentsCount}`);
  console.log(`Timetable records: ${timetableRecordsCount}`);
  console.log(`Admin created: ${userSeedResult.adminCount}`);
  console.log(`Warden created: ${userSeedResult.wardenCount}`);
  console.log(`Guards created: ${userSeedResult.guardsCount}`);

  if (userSeedResult.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of userSeedResult.warnings) {
      console.log(`- ${w.studentId} → ${w.warning}`);
    }
  }

  console.log('\nDatabase seed completed successfully.');
  console.log('========================================\n');
}

if (process.argv[1]?.includes('seedDatabase')) {
  seedDatabase()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('[Seed Error]', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
