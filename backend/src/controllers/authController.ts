import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, UserRole } from '../models/User.js';
import { env } from '../config/env.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['STUDENT', 'GUARD', 'WARDEN', 'ADMIN']).default('STUDENT'),
    studentId: z.string().optional(),
    department: z.string().optional(),
    semester: z.number().int().min(1).max(8).optional(),
    section: z.string().optional(),
    phone: z.string().optional(),
    guardian: z
      .object({
        name: z.string(),
        phone: z.string(),
        email: z.string().email().optional(),
      })
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().optional(),
      studentId: z.string().optional(),
      identifier: z.string().optional(),
      password: z.string().min(1, 'Password is required'),
    })
    .refine((data) => data.email || data.studentId || data.identifier, {
      message: 'Either email or studentId is required for login',
    }),
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name, role, studentId, department, semester, section, phone, guardian } =
        req.body;

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        sendError(res, 'Email is already registered', 409, 'EMAIL_EXISTS');
        return;
      }

      if (studentId) {
        const existingStudentId = await User.findOne({ studentId: studentId.toUpperCase() });
        if (existingStudentId) {
          sendError(res, 'Student ID is already registered', 409, 'STUDENT_ID_EXISTS');
          return;
        }
      }

      const user = await User.create({
        name: name.trim().replace(/\s+/g, ' '),
        email: email.toLowerCase(),
        passwordHash: password,
        role: (role as UserRole) || 'STUDENT',
        studentId: studentId ? studentId.toUpperCase().trim() : undefined,
        department: department || (role === 'STUDENT' ? 'CSE (AI&ML)' : undefined),
        semester: semester || (role === 'STUDENT' ? 3 : undefined),
        section: section ? section.toUpperCase().trim() : role === 'STUDENT' ? 'B' : undefined,
        phone,
        guardian,
      });

      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      sendSuccess(
        res,
        {
          token,
          user: user.toJSON(),
        },
        201,
        'User registered successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, studentId, identifier, password } = req.body;
      const lookup = (studentId || identifier || email || '').trim();

      const user = await User.findOne({
        $or: [
          { email: lookup.toLowerCase() },
          { studentId: lookup.toUpperCase() },
        ],
      });

      if (!user) {
        sendError(res, 'Invalid credentials (Student ID / Email or Password)', 401, 'INVALID_CREDENTIALS');
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        sendError(res, 'Invalid credentials (Student ID / Email or Password)', 401, 'INVALID_CREDENTIALS');
        return;
      }

      if (!user.isActive) {
        sendError(res, 'User account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
        return;
      }

      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      sendSuccess(
        res,
        {
          token,
          user: user.toJSON(),
        },
        200,
        'Login successful'
      );
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
        return;
      }

      sendSuccess(res, { user: user.toJSON() }, 200);
    } catch (err) {
      next(err);
    }
  }
}
