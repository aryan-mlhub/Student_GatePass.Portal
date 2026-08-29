import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PassService } from '../services/passService.js';
import { GatePass } from '../models/GatePass.js';
import { GateLog } from '../models/GateLog.js';
import { User } from '../models/User.js';
import { CampusConfig } from '../models/CampusConfig.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const rejectPassSchema = z.object({
  body: z.object({
    reason: z.string().min(3),
  }),
});

export const updateCampusConfigSchema = z.object({
  body: z.object({
    campusName: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().min(10).max(10000).optional(),
    isActive: z.boolean().optional(),
  }),
});

export class AdminController {
  /**
   * GET /api/admin/passes/pending
   * List all passes awaiting Warden approval.
   */
  public static async getPendingPasses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const passes = await GatePass.find({ status: 'PENDING' })
        .populate('studentId', 'name studentId email department section phone guardian')
        .sort({ requestedAt: -1 });

      sendSuccess(res, { count: passes.length, passes }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/passes/:id/approve
   * Warden or Admin approves pending pass.
   */
  public static async approvePass(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const pass = await PassService.approvePass(req.params.id, req.user.id);
      sendSuccess(res, { pass }, 200, 'Gate pass approved by Warden');
    } catch (err: any) {
      sendError(res, err.message, 400, 'APPROVAL_FAILED');
    }
  }

  /**
   * POST /api/admin/passes/:id/reject
   * Warden or Admin rejects pending pass with reason.
   */
  public static async rejectPass(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const { reason } = req.body;
      const pass = await PassService.rejectPass(req.params.id, req.user.id, reason);
      sendSuccess(res, { pass }, 200, 'Gate pass rejected');
    } catch (err: any) {
      sendError(res, err.message, 400, 'REJECTION_FAILED');
    }
  }

  /**
   * GET /api/admin/dashboard
   * Analytics summary for Admin and Warden portal.
   */
  public static async getDashboardAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalStudents, activePasses, pendingPasses, todayExits, todayEntries, deniedAttempts] =
        await Promise.all([
          User.countDocuments({ role: 'STUDENT', isActive: true }),
          GatePass.countDocuments({ status: 'ACTIVE', expiresAt: { $gt: new Date() } }),
          GatePass.countDocuments({ status: 'PENDING' }),
          GateLog.countDocuments({ action: 'EXIT', timestamp: { $gte: todayStart } }),
          GateLog.countDocuments({ action: 'ENTRY', timestamp: { $gte: todayStart } }),
          GateLog.countDocuments({ action: 'DENIED', timestamp: { $gte: todayStart } }),
        ]);

      sendSuccess(
        res,
        {
          totalStudents,
          activePasses,
          pendingPasses,
          todayExits,
          todayEntries,
          deniedAttempts,
          timestamp: new Date(),
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/gate-logs
   * Searchable gate access ledger with filters.
   */
  public static async getGateLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { date, gateId, action, studentId, limit } = req.query;
      const filter: any = {};

      if (action) filter.action = (action as string).toUpperCase();
      if (gateId) filter.gateId = (gateId as string).toUpperCase();

      if (date) {
        const start = new Date(date as string);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date as string);
        end.setHours(23, 59, 59, 999);
        filter.timestamp = { $gte: start, $lte: end };
      }

      if (studentId) {
        const student = await User.findOne({
          $or: [
            { studentId: (studentId as string).toUpperCase() },
            { _id: (studentId as string).match(/^[0-9a-fA-F]{24}$/) ? studentId : undefined },
          ],
        });
        if (student) {
          filter.studentId = student._id;
        }
      }

      const logs = await GateLog.find(filter)
        .populate('studentId', 'name studentId email section phone')
        .sort({ timestamp: -1 })
        .limit(limit ? parseInt(limit as string, 10) : 100);

      sendSuccess(res, { count: logs.length, logs }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/admin/campus-config
   */
  public static async getCampusConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let config = await CampusConfig.findOne({ isActive: true });
      if (!config) {
        config = await CampusConfig.create({
          campusName: 'S. B. Jain Institute of Technology, Nagpur',
          latitude: 21.2227,
          longitude: 79.0494,
          radiusMeters: 200,
          isActive: true,
        });
      }
      sendSuccess(res, { config }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/admin/campus-config
   */
  public static async updateCampusConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let config = await CampusConfig.findOne({ isActive: true });
      if (!config) {
        config = new CampusConfig(req.body);
      } else {
        Object.assign(config, req.body);
      }
      await config.save();
      sendSuccess(res, { config }, 200, 'Campus geofence config updated');
    } catch (err) {
      next(err);
    }
  }
}
