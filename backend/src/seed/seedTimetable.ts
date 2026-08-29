import { Timetable, DayOfWeek } from '../models/Timetable.js';
import { logger } from '../utils/logger.js';

export async function seedTimetable(): Promise<void> {
  logger.info('[Seed] Seeding Real College Timetable (S. B. Jain Institute CSE-AI&ML Sem-3)...');

  // S. B. Jain Institute of Technology, Management & Research, Nagpur
  // Department: Emerging Technologies CSE (AI&ML)
  // Academic Year: 2026-27 | 3rd Semester | Section B (and Section A)

  const slotsSectionB: Array<{
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    startMinutes: number;
    endMinutes: number;
    subject: string;
    subjectCode: string;
    room: string;
    faculty: string;
    section: string;
    semester: number;
    department: string;
    status: 'ACTIVE' | 'FREE' | 'BREAK';
  }> = [
    // --- MONDAY (Section B) ---
    { day: 'MONDAY', startTime: '09:30', endTime: '10:30', startMinutes: 570, endMinutes: 630, subject: 'Data Structures & Algorithms', subjectCode: 'PCC-AIML301', room: 'LH-201', faculty: 'Prof. V. K. Joshi', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'MONDAY', startTime: '10:30', endTime: '11:30', startMinutes: 630, endMinutes: 690, subject: 'Discrete Mathematics & Graph Theory', subjectCode: 'BSC-CS302', room: 'LH-201', faculty: 'Dr. M. R. Patil', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'MONDAY', startTime: '11:30', endTime: '11:45', startMinutes: 690, endMinutes: 705, subject: 'Short Break / Recess', subjectCode: 'BREAK', room: 'Campus', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'MONDAY', startTime: '11:45', endTime: '12:45', startMinutes: 705, endMinutes: 765, subject: 'Object Oriented Programming', subjectCode: 'PCC-CS303', room: 'LH-201', faculty: 'Prof. S. N. Wankhede', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'MONDAY', startTime: '12:45', endTime: '13:30', startMinutes: 765, endMinutes: 810, subject: 'Lunch Break', subjectCode: 'LUNCH', room: 'Cafeteria', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'MONDAY', startTime: '13:30', endTime: '14:30', startMinutes: 810, endMinutes: 870, subject: 'Artificial Intelligence Fundamentals', subjectCode: 'PCC-AIML305', room: 'LH-201', faculty: 'Dr. A. B. Deshpande', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'MONDAY', startTime: '14:30', endTime: '16:30', startMinutes: 870, endMinutes: 990, subject: 'DSA Lab (B1) / OOP Lab (B2)', subjectCode: 'PCC-AIML301P', room: 'Lab-301 / Lab-302', faculty: 'Prof. Joshi / Prof. Wankhede', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },

    // --- TUESDAY (Section B) ---
    { day: 'TUESDAY', startTime: '09:30', endTime: '10:30', startMinutes: 570, endMinutes: 630, subject: 'Digital Electronics & Computer Architecture', subjectCode: 'ESC-CS304', room: 'LH-201', faculty: 'Prof. R. T. Sharma', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'TUESDAY', startTime: '10:30', endTime: '11:30', startMinutes: 630, endMinutes: 690, subject: 'Data Structures & Algorithms', subjectCode: 'PCC-AIML301', room: 'LH-201', faculty: 'Prof. V. K. Joshi', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'TUESDAY', startTime: '11:30', endTime: '11:45', startMinutes: 690, endMinutes: 705, subject: 'Short Break / Recess', subjectCode: 'BREAK', room: 'Campus', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'TUESDAY', startTime: '11:45', endTime: '12:45', startMinutes: 705, endMinutes: 765, subject: 'Discrete Mathematics & Graph Theory', subjectCode: 'BSC-CS302', room: 'LH-201', faculty: 'Dr. M. R. Patil', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'TUESDAY', startTime: '12:45', endTime: '13:30', startMinutes: 765, endMinutes: 810, subject: 'Lunch Break', subjectCode: 'LUNCH', room: 'Cafeteria', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'TUESDAY', startTime: '13:30', endTime: '14:30', startMinutes: 810, endMinutes: 870, subject: 'Object Oriented Programming', subjectCode: 'PCC-CS303', room: 'LH-201', faculty: 'Prof. S. N. Wankhede', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'TUESDAY', startTime: '14:30', endTime: '16:30', startMinutes: 870, endMinutes: 990, subject: 'AI Lab (B1) / DECA Lab (B2)', subjectCode: 'PCC-AIML305P', room: 'Lab-303 / Lab-304', faculty: 'Dr. Deshpande / Prof. Sharma', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },

    // --- WEDNESDAY (Section B) ---
    { day: 'WEDNESDAY', startTime: '09:30', endTime: '10:30', startMinutes: 570, endMinutes: 630, subject: 'Artificial Intelligence Fundamentals', subjectCode: 'PCC-AIML305', room: 'LH-201', faculty: 'Dr. A. B. Deshpande', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'WEDNESDAY', startTime: '10:30', endTime: '11:30', startMinutes: 630, endMinutes: 690, subject: 'Digital Electronics & Computer Architecture', subjectCode: 'ESC-CS304', room: 'LH-201', faculty: 'Prof. R. T. Sharma', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'WEDNESDAY', startTime: '11:30', endTime: '11:45', startMinutes: 690, endMinutes: 705, subject: 'Short Break / Recess', subjectCode: 'BREAK', room: 'Campus', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'WEDNESDAY', startTime: '11:45', endTime: '12:45', startMinutes: 705, endMinutes: 765, subject: 'Data Structures & Algorithms', subjectCode: 'PCC-AIML301', room: 'LH-201', faculty: 'Prof. V. K. Joshi', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'WEDNESDAY', startTime: '12:45', endTime: '13:30', startMinutes: 765, endMinutes: 810, subject: 'Lunch Break', subjectCode: 'LUNCH', room: 'Cafeteria', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'WEDNESDAY', startTime: '13:30', endTime: '14:30', startMinutes: 810, endMinutes: 870, subject: 'Self-Study & Library Period', subjectCode: 'FREE', room: 'Central Library', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'FREE' },
    { day: 'WEDNESDAY', startTime: '14:30', endTime: '15:30', startMinutes: 870, endMinutes: 930, subject: 'Object Oriented Programming', subjectCode: 'PCC-CS303', room: 'LH-201', faculty: 'Prof. S. N. Wankhede', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'WEDNESDAY', startTime: '15:30', endTime: '16:30', startMinutes: 930, endMinutes: 990, subject: 'Student Mentoring & Remedial', subjectCode: 'MENTOR', room: 'LH-201', faculty: 'Faculty Mentors', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'FREE' },

    // --- THURSDAY (Section B) ---
    { day: 'THURSDAY', startTime: '09:30', endTime: '10:30', startMinutes: 570, endMinutes: 630, subject: 'Discrete Mathematics & Graph Theory', subjectCode: 'BSC-CS302', room: 'LH-201', faculty: 'Dr. M. R. Patil', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'THURSDAY', startTime: '10:30', endTime: '11:30', startMinutes: 630, endMinutes: 690, subject: 'Object Oriented Programming', subjectCode: 'PCC-CS303', room: 'LH-201', faculty: 'Prof. S. N. Wankhede', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'THURSDAY', startTime: '11:30', endTime: '11:45', startMinutes: 690, endMinutes: 705, subject: 'Short Break / Recess', subjectCode: 'BREAK', room: 'Campus', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'THURSDAY', startTime: '11:45', endTime: '12:45', startMinutes: 705, endMinutes: 765, subject: 'Digital Electronics & Computer Architecture', subjectCode: 'ESC-CS304', room: 'LH-201', faculty: 'Prof. R. T. Sharma', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'THURSDAY', startTime: '12:45', endTime: '13:30', startMinutes: 765, endMinutes: 810, subject: 'Lunch Break', subjectCode: 'LUNCH', room: 'Cafeteria', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'THURSDAY', startTime: '13:30', endTime: '14:30', startMinutes: 810, endMinutes: 870, subject: 'Artificial Intelligence Fundamentals', subjectCode: 'PCC-AIML305', room: 'LH-201', faculty: 'Dr. A. B. Deshpande', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'THURSDAY', startTime: '14:30', endTime: '16:30', startMinutes: 870, endMinutes: 990, subject: 'OOP Lab (B1) / AI Lab (B2)', subjectCode: 'PCC-CS303P', room: 'Lab-302 / Lab-303', faculty: 'Prof. Wankhede / Dr. Deshpande', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },

    // --- FRIDAY (Section B) ---
    { day: 'FRIDAY', startTime: '09:30', endTime: '10:30', startMinutes: 570, endMinutes: 630, subject: 'Data Structures & Algorithms', subjectCode: 'PCC-AIML301', room: 'LH-201', faculty: 'Prof. V. K. Joshi', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'FRIDAY', startTime: '10:30', endTime: '11:30', startMinutes: 630, endMinutes: 690, subject: 'Artificial Intelligence Fundamentals', subjectCode: 'PCC-AIML305', room: 'LH-201', faculty: 'Dr. A. B. Deshpande', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'FRIDAY', startTime: '11:30', endTime: '11:45', startMinutes: 690, endMinutes: 705, subject: 'Short Break / Recess', subjectCode: 'BREAK', room: 'Campus', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'FRIDAY', startTime: '11:45', endTime: '12:45', startMinutes: 705, endMinutes: 765, subject: 'Discrete Mathematics & Graph Theory', subjectCode: 'BSC-CS302', room: 'LH-201', faculty: 'Dr. M. R. Patil', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'FRIDAY', startTime: '12:45', endTime: '13:30', startMinutes: 765, endMinutes: 810, subject: 'Lunch Break', subjectCode: 'LUNCH', room: 'Cafeteria', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'FRIDAY', startTime: '13:30', endTime: '14:30', startMinutes: 810, endMinutes: 870, subject: 'Digital Electronics & Computer Architecture', subjectCode: 'ESC-CS304', room: 'LH-201', faculty: 'Prof. R. T. Sharma', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'FRIDAY', startTime: '14:30', endTime: '16:30', startMinutes: 870, endMinutes: 990, subject: 'Mini Project / Soft Skills', subjectCode: 'PROJ-301', room: 'Innovation Cell', faculty: 'Faculty Team', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },

    // --- SATURDAY (Section B) ---
    { day: 'SATURDAY', startTime: '09:30', endTime: '10:30', startMinutes: 570, endMinutes: 630, subject: 'Remedial / Doubt Clearing', subjectCode: 'REMEDIAL', room: 'LH-201', faculty: 'Subject Incharges', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'ACTIVE' },
    { day: 'SATURDAY', startTime: '10:30', endTime: '11:30', startMinutes: 630, endMinutes: 690, subject: 'Free Library / Reading Room', subjectCode: 'FREE', room: 'Central Library', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'FREE' },
    { day: 'SATURDAY', startTime: '11:30', endTime: '11:45', startMinutes: 690, endMinutes: 705, subject: 'Short Break / Recess', subjectCode: 'BREAK', room: 'Campus', faculty: 'N/A', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'BREAK' },
    { day: 'SATURDAY', startTime: '11:45', endTime: '12:45', startMinutes: 705, endMinutes: 765, subject: 'Student Clubs & Co-Curricular Activities', subjectCode: 'CLUBS', room: 'Auditorium', faculty: 'Faculty Incharge', section: 'B', semester: 3, department: 'CSE (AI&ML)', status: 'FREE' },
  ];

  // Insert Section B slots
  for (const s of slotsSectionB) {
    const existing = await Timetable.findOne({
      section: s.section,
      semester: s.semester,
      day: s.day,
      startMinutes: s.startMinutes,
    });
    if (!existing) {
      await Timetable.create(s);
    }
  }

  // Also seed Section A slots by mirroring with Section 'A'
  for (const s of slotsSectionB) {
    const existingA = await Timetable.findOne({
      section: 'A',
      semester: s.semester,
      day: s.day,
      startMinutes: s.startMinutes,
    });
    if (!existingA) {
      await Timetable.create({
        ...s,
        section: 'A',
        room: s.room.replace('201', '202'),
      });
    }
  }

  logger.info('[Seed] Timetable slots for Section B and Section A successfully seeded.');
}
