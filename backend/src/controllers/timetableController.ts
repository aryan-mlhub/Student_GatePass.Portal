import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Timetable, DayOfWeek, TimetableStatus } from '../models/Timetable.js';
import { TimetableOverride } from '../models/TimetableOverride.js';
import { NotificationService } from '../services/notificationService.js';
import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const createSlotSchema = z.object({
  body: z.object({
    day: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    subject: z.string().min(2),
    subjectCode: z.string().optional().default('FREE'),
    room: z.string().optional().default('N/A'),
    faculty: z.string().optional(),
    section: z.string().min(1).default('B'),
    semester: z.number().int().min(1).max(8).default(3),
    department: z.string().optional().default('CSE(AI&ML)'),
    status: z.enum(['ACTIVE', 'CANCELLED', 'RESCHEDULED', 'FREE', 'BREAK']).default('ACTIVE'),
  }),
});

export const cancelLectureSchema = z.object({
  body: z.object({
    timetableId: z.string().optional(),
    section: z.string().optional().default('B'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(3),
  }),
});

export const rescheduleLectureSchema = z.object({
  body: z.object({
    timetableId: z.string().optional(),
    section: z.string().optional().default('B'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
    newEndTime: z.string().regex(/^\d{2}:\d{2}$/),
    newRoom: z.string().optional(),
    reason: z.string().min(3),
  }),
});

export const addLectureSchema = z.object({
  body: z.object({
    section: z.string().default('B'),
    semester: z.number().int().default(3),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    newSubject: z.string().min(2),
    newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
    newEndTime: z.string().regex(/^\d{2}:\d{2}$/),
    newRoom: z.string().optional().default('Auditorium'),
    reason: z.string().min(3),
  }),
});

export class TimetableController {
  private static parseMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    return h * 60 + m;
  }

  /**
   * GET /api/timetable
   * Retrieve timetable slots with optional filters.
   */
  public static async getTimetable(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { section, semester, day, department } = req.query;
      const query: any = {};

      if (section) query.section = (section as string).toUpperCase();
      if (semester) query.semester = parseInt(semester as string, 10);
      if (day) query.day = (day as string).toUpperCase();
      if (department) query.department = department as string;

      const slots = await Timetable.find(query).sort({ day: 1, startMinutes: 1 });
      sendSuccess(res, { count: slots.length, slots }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/timetable
   * Create a master timetable slot.
   */
  public static async createSlot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { day, startTime, endTime, subject, subjectCode, room, faculty, section, semester, department, status } =
        req.body;

      const startMinutes = TimetableController.parseMinutes(startTime);
      const endMinutes = TimetableController.parseMinutes(endTime);

      if (startMinutes >= endMinutes) {
        sendError(res, 'endTime must be after startTime', 400, 'INVALID_TIME_RANGE');
        return;
      }

      const slot = await Timetable.create({
        day,
        startTime,
        endTime,
        startMinutes,
        endMinutes,
        subject,
        subjectCode: subjectCode || 'FREE',
        room: room || 'N/A',
        faculty,
        section: section.toUpperCase(),
        semester: semester || 3,
        department: department || 'CSE(AI&ML)',
        status: status || 'ACTIVE',
      });

      sendSuccess(res, { slot }, 201, 'Timetable slot created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/timetable/:id
   * Update a timetable slot.
   */
  public static async updateSlot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const slotId = req.params.id;
      const updates = { ...req.body };

      if (updates.startTime) {
        updates.startMinutes = TimetableController.parseMinutes(updates.startTime);
      }
      if (updates.endTime) {
        updates.endMinutes = TimetableController.parseMinutes(updates.endTime);
      }
      if (updates.section) {
        updates.section = updates.section.toUpperCase();
      }

      const slot = await Timetable.findByIdAndUpdate(slotId, updates, {
        new: true,
        runValidators: true,
      });

      if (!slot) {
        sendError(res, 'Timetable slot not found', 404, 'SLOT_NOT_FOUND');
        return;
      }

      sendSuccess(res, { slot }, 200, 'Timetable slot updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/timetable/:id
   */
  public static async deleteSlot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const slot = await Timetable.findByIdAndDelete(req.params.id);
      if (!slot) {
        sendError(res, 'Timetable slot not found', 404, 'SLOT_NOT_FOUND');
        return;
      }
      sendSuccess(res, { message: 'Slot deleted' }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/timetable/cancel
   * Admin cancels a lecture on a specific date.
   */
  public static async cancelLecture(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { timetableId, section, date, reason } = req.body;

      let slot;
      if (timetableId) {
        slot = await Timetable.findById(timetableId);
      }

      const override = await TimetableOverride.create({
        timetableId: slot?._id,
        section: section ? section.toUpperCase() : slot?.section || 'B',
        date,
        type: 'CANCEL',
        reason,
        createdBy: req.user?.id,
      });

      // Notify students of the cancellation
      const targetSection = section ? section.toUpperCase() : slot?.section || 'B';
      const students = await User.find({ role: 'STUDENT', section: targetSection });
      for (const student of students) {
        await NotificationService.createNotification({
          userId: student._id,
          type: 'CLASS_CANCELLED',
          title: 'Lecture Cancelled',
          message: `Your lecture on ${date} (${slot?.subject || 'Class'}) is cancelled: ${reason}.`,
          metadata: { date, reason, timetableId: slot?._id },
        });
      }

      sendSuccess(
        res,
        { override },
        201,
        `Lecture cancelled for ${date}. Student passes during this period will now auto-approve.`
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/timetable/reschedule
   */
  public static async rescheduleLecture(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { timetableId, section, date, newStartTime, newEndTime, newRoom, reason } =
        req.body;

      const newStartMinutes = TimetableController.parseMinutes(newStartTime);
      const newEndMinutes = TimetableController.parseMinutes(newEndTime);

      let slot;
      if (timetableId) {
        slot = await Timetable.findById(timetableId);
      }

      const override = await TimetableOverride.create({
        timetableId: slot?._id,
        section: section ? section.toUpperCase() : slot?.section || 'B',
        date,
        type: 'RESCHEDULE',
        newStartTime,
        newEndTime,
        newStartMinutes,
        newEndMinutes,
        newRoom: newRoom || slot?.room,
        reason,
        createdBy: req.user?.id,
      });

      sendSuccess(
        res,
        { override },
        201,
        `Lecture rescheduled on ${date} to ${newStartTime}-${newEndTime}.`
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/timetable/add
   */
  public static async addLecture(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { section, semester, date, newSubject, newStartTime, newEndTime, newRoom, reason } =
        req.body;

      const newStartMinutes = TimetableController.parseMinutes(newStartTime);
      const newEndMinutes = TimetableController.parseMinutes(newEndTime);

      const override = await TimetableOverride.create({
        section: section.toUpperCase(),
        semester: semester || 3,
        date,
        type: 'ADD',
        newSubject,
        newStartTime,
        newEndTime,
        newStartMinutes,
        newEndMinutes,
        newRoom: newRoom || 'Auditorium',
        reason,
        createdBy: req.user?.id,
      });

      sendSuccess(res, { override }, 201, `Extra lecture added for ${date}.`);
    } catch (err) {
      next(err);
    }
  }
}
