import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export interface SeedValidationWarning {
  studentId: string;
  warning: string;
}

export interface SeedUsersResult {
  studentsCount: number;
  adminCount: number;
  wardenCount: number;
  guardsCount: number;
  warnings: SeedValidationWarning[];
}

// Authoritative real student master data for S. B. Jain Institute (Nagpur) - CSE (AI&ML) 3rd Sem Section B
export const realStudentMasterList = [
  { studentId: 'CM25001', name: 'Aaditya Sharma' },
  { studentId: 'CM25002', name: 'Aakash Verma' },
  { studentId: 'CM25003', name: 'Abhishek Kumar' },
  { studentId: 'CM25004', name: 'Aditi Deshmukh' },
  { studentId: 'CM25005', name: 'Aditya Wankhede' },
  { studentId: 'CM25006', name: 'Akanksha Patil' },
  { studentId: 'CM25007', name: 'Aman Gupta' },
  { studentId: 'CM25008', name: 'Aniket Raut' },
  { studentId: 'CM25009', name: 'Anjali Meshram' },
  { studentId: 'CM25010', name: 'Ankita Tiwari' },
  { studentId: 'CM25011', name: 'Anmol Kulkarni' },
  { studentId: 'CM25012', name: 'Aryan Joshi' },
  { studentId: 'CM25013', name: 'Atharva Kale' },
  { studentId: 'CM25014', name: 'Ayush Bante' },
  // Notice CM25O15 has character 'O' instead of '0'
  { studentId: 'CM25O15', name: 'Bhavesh Gawande' },
  { studentId: 'CM25016', name: 'Chetan Thakre' },
  { studentId: 'CM25017', name: 'Devendra Mahajan' },
  { studentId: 'CM25018', name: 'Dhruv Agrawal' },
  { studentId: 'CM25019', name: 'Divya Khobragade' },
  { studentId: 'CM25020', name: 'Gaurav Choudhary' },
  { studentId: 'CM25021', name: 'Harsh Wardhan' },
  { studentId: 'CM25022', name: 'Himanshu Nagpure' },
  { studentId: 'CM25023', name: 'Isha Bobde' },
  { studentId: 'CM25024', name: 'Janhavi Charde' },
  { studentId: 'CM25025', name: 'Jayesh Sonkusare' },
  { studentId: 'CM25026', name: 'Karan Jaiswal' },
  { studentId: 'CM25027', name: 'Khushi Mishra' },
  { studentId: 'CM25028', name: 'Kunal Borkar' },
  { studentId: 'CM25029', name: 'Manish Sahu' },
  { studentId: 'CM25030', name: 'Mayur Tembhare' },
  { studentId: 'CM25031', name: 'Mohit Gedam' },
  { studentId: 'CM25032', name: 'Mrunal Dhote' },
  { studentId: 'CM25033', name: 'Nayan Bhoyar' },
  { studentId: 'CM25034', name: 'Neeraj Bisen' },
  { studentId: 'CM25035', name: 'Nikhil Pande' },
  { studentId: 'CM25036', name: 'Nisha Bopche' },
  { studentId: 'CM25037', name: 'Omkar Dandekar' },
  { studentId: 'CM25038', name: 'Parth Zade' },
  { studentId: 'CM25039', name: 'Prachi Kamble' },
  { studentId: 'CM25040', name: 'Pranav Mohurle' },
  { studentId: 'CM25041', name: 'Prashant Bawane' },
  { studentId: 'CM25042', name: 'Pratik Hatwar' },
  { studentId: 'CM25043', name: 'Priya Sharma' },
  { studentId: 'CM25044', name: 'Rahul Mendhe' },
  { studentId: 'CM25045', name: 'Rashi Jain' },
  { studentId: 'CM25046', name: 'Ritesh Kohale' },
  { studentId: 'CM25047', name: 'Riya Kapse' },
  { studentId: 'CM25048', name: 'Rohit Uikey' },
  { studentId: 'CM25049', name: 'Sahil Ninawe' },
  { studentId: 'CM25050', name: 'Sakshi Badwaik' },
  { studentId: 'CM25051', name: 'Sameer Sheikh' },
  { studentId: 'CM25052', name: 'Sanika Thakare' },
  { studentId: 'CM25053', name: 'Sanket Rahangdale' },
  { studentId: 'CM25054', name: 'Sarthak Wairagade' },
  { studentId: 'CM25055', name: 'Saurabh Bisen' },
  { studentId: 'CM25056', name: 'Shivani Nimbalkar' },
  { studentId: 'CM25057', name: 'Shreya Kohad' },
  { studentId: 'CM25058', name: 'Shubham Kohale' },
  { studentId: 'CM25059', name: 'Siddheshwar Tidke' },
  { studentId: 'CM25060', name: 'Sneha Lanjewar' },
  { studentId: 'CM25061', name: 'Tanmayee Deshpande' },
  { studentId: 'CM25062', name: 'Tejaswini Bagde' },
  { studentId: 'CM25063', name: 'Tushar Nandanwar' },
  { studentId: 'CM25064', name: 'Utkarsh Meshram' },
  { studentId: 'CM25065', name: 'Vaibhav Choudhary' },
  { studentId: 'CM25066', name: 'Vedant Gaidhane' },
  { studentId: 'CM25067', name: 'Yashaswi Ghodmare' },
  { studentId: 'CM25068', name: 'Yashodhara Vaidya' },
];

export async function seedUsers(): Promise<SeedUsersResult> {
  const warnings: SeedValidationWarning[] = [];
  let studentsCount = 0;
  let adminCount = 0;
  let wardenCount = 0;
  let guardsCount = 0;

  const adminHashed = await bcrypt.hash('admin123', 10);
  const wardenHashed = await bcrypt.hash('warden123', 10);
  const guardHashed = await bcrypt.hash('guard123', 10);
  const studentHashed = await bcrypt.hash('student123', 10);

  // 1. Seed Administrator
  const adminData = {
    name: 'System Administrator',
    email: 'admin@gateguard.demo',
    passwordHash: adminHashed,
    role: 'ADMIN' as const,
    department: 'Management',
    phone: '+919876543200',
    isActive: true,
  };
  const admin = await User.findOneAndUpdate({ email: adminData.email }, adminData, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  if (admin) adminCount++;

  // 2. Seed Warden
  const wardenData = {
    name: 'Dr. Sarah Connor',
    email: 'warden@gateguard.demo',
    passwordHash: wardenHashed,
    role: 'WARDEN' as const,
    department: 'Student Affairs',
    phone: '+919876543201',
    isActive: true,
  };
  const warden = await User.findOneAndUpdate({ email: wardenData.email }, wardenData, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
  if (warden) wardenCount++;

  // 3. Seed Guards
  const guardsData = [
    {
      name: 'Officer John Davis (Main Gate)',
      email: 'guard@gateguard.demo',
      passwordHash: guardHashed,
      role: 'GUARD' as const,
      department: 'Security',
      phone: '+919876543202',
      isActive: true,
    },
    {
      name: 'Officer Rajesh Kumar (North Gate)',
      email: 'northguard@gateguard.demo',
      passwordHash: guardHashed,
      role: 'GUARD' as const,
      department: 'Security',
      phone: '+919876543203',
      isActive: true,
    },
  ];

  for (const g of guardsData) {
    const guard = await User.findOneAndUpdate({ email: g.email }, g, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    if (guard) guardsCount++;
  }

  // 4. Seed Real Student Master List
  for (const rawStudent of realStudentMasterList) {
    const rawStudentId = rawStudent.studentId.trim();
    const studentId = rawStudentId.toUpperCase();
    const name = rawStudent.name.trim().replace(/\s+/g, ' ');

    // Validation check for unexpected character 'O' in student ID
    if (rawStudentId === 'CM25O15' || rawStudentId.includes('O')) {
      warnings.push({
        studentId: rawStudentId,
        warning: `Student ID contains unexpected character O. Verify whether this should be ${rawStudentId.replace(
          /O/g,
          '0'
        )}.`,
      });
    }

    const email = `${studentId.toLowerCase()}@sbjit.edu`;
    const studentData = {
      name,
      studentId,
      email,
      passwordHash: studentHashed, // Hashed demo authentication password
      role: 'STUDENT' as const,
      department: 'CSE (AI&ML)',
      semester: 3,
      section: 'B',
      phone: `+9198765${studentId.replace(/\D/g, '').slice(-5).padStart(5, '0')}`,
      guardian: {
        name: `Guardian of ${name}`,
        phone: `+9198760${studentId.replace(/\D/g, '').slice(-5).padStart(5, '0')}`,
        email: `guardian.${studentId.toLowerCase()}@example.com`,
      },
      isActive: true,
    };

    await User.findOneAndUpdate({ studentId }, studentData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    studentsCount++;
  }

  return {
    studentsCount,
    adminCount,
    wardenCount,
    guardsCount,
    warnings,
  };
}
