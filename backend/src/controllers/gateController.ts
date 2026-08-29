import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QRService } from '../services/qrService.js';
import { GatePass } from '../models/GatePass.js';
import { GateLog } from '../models/GateLog.js';
import { User } from '../models/User.js';
import { GeofenceService } from '../services/geofenceService.js';
import { NotificationService } from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const verifyQRSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    gateId: z.string().default('MAIN_GATE'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export const exitSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    gateId: z.string().default('MAIN_GATE'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export const entrySchema = z.object({
  body: z.object({
    studentId: z.string(),
    passId: z.string().optional(),
    gateId: z.string().default('MAIN_GATE'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export class GateController {
  /**
   * POST /api/gate/verify
   * Validates dynamic QR token signature, expiration, status, gate ID, and boundary.
   */
  public static async verifyQR(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, gateId, latitude, longitude } = req.body;

      // 1. Verify cryptographic JWT signature and expiration
      let payload;
      try {
        payload = QRService.verifyPassQRToken(token);
      } catch (err: any) {
        return void sendSuccess(
          res,
          {
            status: 'INVALID',
            reason: err.message,
            code: err.code || 'INVALID_QR_TOKEN',
          },
          200
        );
      }

      // 2. Fetch Pass record
      const pass = await GatePass.findOne({ passId: payload.passId }).populate(
        'studentId',
        'name studentId email department section phone'
      );

      if (!pass) {
        return void sendSuccess(
          res,
          {
            status: 'INVALID',
            reason: 'Pass record not found in system database.',
            code: 'PASS_NOT_FOUND',
          },
          200
        );
      }

      // 3. Check if already used
      if (pass.status === 'USED') {
        return void sendSuccess(
          res,
          {
            status: 'INVALID',
            reason: 'QR code has already been used.',
            code: 'PASS_ALREADY_USED',
            passId: pass.passId,
          },
          200
        );
      }

      // 4. Check if expired
      if (pass.status === 'EXPIRED' || new Date() > pass.expiresAt) {
        if (pass.status !== 'EXPIRED') {
          pass.status = 'EXPIRED';
          await pass.save();
        }
        return void sendSuccess(
          res,
          {
            status: 'INVALID',
            reason: 'QR code has expired.',
            code: 'QR_EXPIRED',
            passId: pass.passId,
          },
          200
        );
      }

      // 5. Check pass status
      if (pass.status !== 'ACTIVE' && pass.status !== 'APPROVED') {
        return void sendSuccess(
          res,
          {
            status: 'INVALID',
            reason: `Gate pass is in "${pass.status}" state, not active for exit.`,
            code: 'PASS_NOT_ACTIVE',
            passId: pass.passId,
          },
          200
        );
      }

      // 6. Check Gate matching
      if (pass.gateId && gateId && pass.gateId.toUpperCase() !== gateId.toUpperCase()) {
        return void sendSuccess(
          res,
          {
            status: 'INVALID',
            reason: `Wrong gate: Pass is designated for ${pass.gateId}, but scanned at ${gateId}.`,
            code: 'WRONG_GATE',
            passId: pass.passId,
          },
          200
        );
      }

      // 7. Optional Guard Terminal Location Verification
      if (latitude !== undefined && longitude !== undefined) {
        const geofence = await GeofenceService.isInsideCampus(latitude, longitude);
        if (!geofence.valid) {
          return void sendSuccess(
            res,
            {
              status: 'INVALID',
              reason: 'Scan terminal is outside campus boundary.',
              code: 'LOCATION_INVALID',
              passId: pass.passId,
            },
            200
          );
        }
      }

      sendSuccess(
        res,
        {
          status: 'VALID',
          reason: 'Pass verified successfully.',
          passId: pass.passId,
          student: pass.studentId,
          gateId: pass.gateId,
          expiresAt: pass.expiresAt,
        },
        200
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gate/exit
   * Performs atomic exit transition (ACTIVE -> USED) and logs physical movement.
   */
  public static async recordExit(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, gateId, latitude, longitude } = req.body;

      let payload;
      try {
        payload = QRService.verifyPassQRToken(token);
      } catch (err: any) {
        sendError(res, err.message, 400, err.code || 'INVALID_QR_TOKEN');
        return;
      }

      const now = new Date();

      // Atomic update to eliminate race conditions / duplicate exit attempts
      const pass = await GatePass.findOneAndUpdate(
        {
          passId: payload.passId,
          status: { $in: ['ACTIVE', 'APPROVED'] },
          expiresAt: { $gt: now },
        },
        {
          $set: {
            status: 'USED',
            usedAt: now,
          },
        },
        { new: true }
      ).populate('studentId', 'name studentId email section phone');

      if (!pass) {
        // Find if it was already used or expired
        const existing = await GatePass.findOne({ passId: payload.passId });
        const reason = !existing
          ? 'Pass not found'
          : existing.status === 'USED'
          ? 'PASS_ALREADY_USED'
          : 'PASS_EXPIRED_OR_INACTIVE';

        // Record denied log
        if (existing) {
          await GateLog.create({
            passId: payload.passId,
            studentId: existing.studentId,
            gateId: gateId || 'MAIN_GATE',
            action: 'DENIED',
            timestamp: now,
            latitude,
            longitude,
            verified: false,
            reason,
          });
        }

        sendError(
          res,
          existing?.status === 'USED'
            ? 'QR code has already been used.'
            : 'Pass is expired, inactive, or already used.',
          409,
          reason
        );
        return;
      }

      // Check wrong gate if specific gate was required
      if (pass.gateId && gateId && pass.gateId.toUpperCase() !== gateId.toUpperCase()) {
        await GateLog.create({
          passId: pass.passId,
          studentId: (pass.studentId as any)._id,
          gateId,
          action: 'DENIED',
          timestamp: now,
          latitude,
          longitude,
          verified: false,
          reason: 'WRONG_GATE',
        });

        sendError(res, 'Scanned at wrong gate', 400, 'WRONG_GATE');
        return;
      }

      // Create Successful GateLog record
      const gateLog = await GateLog.create({
        passId: pass.passId,
        studentId: (pass.studentId as any)._id,
        gateId: gateId || 'MAIN_GATE',
        action: 'EXIT',
        timestamp: now,
        latitude,
        longitude,
        verified: true,
      });

      // Dispatch Exit Notification
      await NotificationService.createNotification({
        userId: (pass.studentId as any)._id,
        type: 'GATE_EXIT',
        title: 'Campus Exit Recorded',
        message: `Your exit was verified and recorded at ${gateId || 'Main Gate'} at ${now.toLocaleTimeString()}.`,
        metadata: { passId: pass.passId, logId: gateLog._id },
      });

      sendSuccess(
        res,
        {
          action: 'EXIT',
          verified: true,
          passId: pass.passId,
          student: pass.studentId,
          usedAt: now,
          gateId: gateId || 'MAIN_GATE',
        },
        200,
        'Campus exit recorded successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/gate/entry
   * Records student campus re-entry without changing past pass state back to active.
   */
  public static async recordEntry(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { studentId, passId, gateId, latitude, longitude } = req.body;

      const student = await User.findOne({
        $or: [
          { studentId: studentId.toUpperCase() },
          { _id: studentId.match(/^[0-9a-fA-F]{24}$/) ? studentId : undefined },
        ],
      });

      if (!student) {
        sendError(res, 'Student not found', 404, 'STUDENT_NOT_FOUND');
        return;
      }

      const now = new Date();

      const log = await GateLog.create({
        passId,
        studentId: student._id,
        gateId: gateId || 'MAIN_GATE',
        action: 'ENTRY',
        timestamp: now,
        latitude,
        longitude,
        verified: true,
      });

      await NotificationService.createNotification({
        userId: student._id,
        type: 'GATE_EXIT',
        title: 'Campus Re-entry Recorded',
        message: `Your re-entry was recorded at ${gateId || 'Main Gate'} at ${now.toLocaleTimeString()}.`,
        metadata: { passId, logId: log._id },
      });

      sendSuccess(
        res,
        {
          action: 'ENTRY',
          student: {
            id: student._id,
            name: student.name,
            studentId: student.studentId,
          },
          gateId: gateId || 'MAIN_GATE',
          timestamp: now,
        },
        200,
        'Campus re-entry recorded successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}
