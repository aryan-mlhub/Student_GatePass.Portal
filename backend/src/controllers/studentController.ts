import { Request, Response, NextFunction } from 'express';
import { TimetableEngine } from '../services/timetableEngine.js';
import { Timetable } from '../models/Timetable.js';
import { GatePass } from '../models/GatePass.js';
import { NotificationService } from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class StudentController {
  /**
   * GET /api/student/current-status
   * Evaluates live current lecture, upcoming lecture, and free status.
   */
  public static async getCurrentStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const timestamp = req.query.timestamp
        ? new Date(req.query.timestamp as string)
        : new Date();

      const status = await TimetableEngine.getCurrentStudentTimetableStatus(
        req.user.id,
        timestamp
      );

      sendSuccess(res, status, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/student/timetable
   * Retrieves full weekly timetable for the student's cohort.
   */
  public static async getMyTimetable(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const section = req.user.section || 'B';
      const semester = req.user.semester || 3;

      const slots = await Timetable.find({ section, semester }).sort({
        day: 1,
        startMinutes: 1,
      });

      sendSuccess(res, { count: slots.length, section, semester, slots }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/student/passes
   * Returns list of passes requested by the student.
   */
  public static async getMyPasses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const passes = await GatePass.find({ studentId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50);

      sendSuccess(res, { count: passes.length, passes }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/student/notifications
   * Returns student's recent alerts and gate notifications.
   */
  public static async getMyNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const notifications = await NotificationService.getUserNotifications(req.user.id);
      sendSuccess(res, { count: notifications.length, notifications }, 200);
    } catch (err) {
      next(err);
    }
  }
}
