import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, IUser, UserRole } from '../models/User.js';
import { sendError } from '../utils/response.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  studentId?: string;
  section?: string;
  semester?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token missing or invalid format', 401, 'UNAUTHORIZED');
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      role: UserRole;
    };

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      sendError(res, 'User account not found or deactivated', 401, 'USER_INACTIVE');
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: user.studentId,
      section: user.section,
      semester: user.semester,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Authentication token has expired', 401, 'TOKEN_EXPIRED');
      return;
    }
    sendError(res, 'Invalid authentication token', 401, 'INVALID_TOKEN');
  }
}
