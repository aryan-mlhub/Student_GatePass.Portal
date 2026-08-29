import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PassService } from '../services/passService.js';
import { QRService } from '../services/qrService.js';
import { GatePass } from '../models/GatePass.js';
import { sendSuccess, sendError } from '../utils/response.js';

export const requestPassSchema = z.object({
  body: z.object({
    reason: z.string().min(3),
    expectedReturnTime: z.string().datetime().optional(),
    gateId: z.string().optional().default('MAIN_GATE'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timestamp: z.string().datetime().optional(),
  }),
});

export class PassController {
  /**
   * POST /api/passes/request
   * Student requests a gate pass. Runs the timetable evaluation engine.
   */
  public static async requestPass(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Unauthenticated', 401, 'UNAUTHORIZED');
        return;
      }

      const { reason, expectedReturnTime, gateId, latitude, longitude, timestamp } =
        req.body;

      const result = await PassService.requestPass({
        studentUserId: req.user.id,
        reason,
        expectedReturnTime: expectedReturnTime ? new Date(expectedReturnTime) : undefined,
        gateId,
        latitude,
        longitude,
        timestamp: timestamp ? new Date(timestamp) : undefined,
      });

      sendSuccess(
        res,
        {
          decision: result.decision,
          passId: result.pass.passId,
          status: result.pass.status,
          reason: result.reason,
          qrToken: result.qrToken,
          expiresAt: result.pass.expiresAt,
        },
        201,
        result.decision === 'AUTO_APPROVED'
          ? 'Gate pass auto-approved'
          : 'Gate pass submitted for Warden review'
      );
    } catch (err: any) {
      if (err.message.includes('outside campus boundary')) {
        sendError(res, err.message, 403, 'REJECT_LOCATION');
        return;
      }
      if (err.message.includes('already has an active gate pass')) {
        sendError(res, err.message, 409, 'REJECT_DUPLICATE');
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/passes/:id
   * Retrieves specific pass details.
   */
  public static async getPassById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const passId = req.params.id;
      const pass = await GatePass.findOne({
        $or: [{ passId }, { _id: passId.match(/^[0-9a-fA-F]{24}$/) ? passId : undefined }],
      }).populate('studentId', 'name studentId email section phone');

      if (!pass) {
        sendError(res, 'Gate pass not found', 404, 'PASS_NOT_FOUND');
        return;
      }

      // Check permission: Student can only view own pass unless Warden/Admin/Guard
      if (
        req.user?.role === 'STUDENT' &&
        (pass.studentId as any)._id?.toString() !== req.user.id &&
        pass.studentId.toString() !== req.user.id
      ) {
        sendError(res, 'Access denied to this pass record', 403, 'FORBIDDEN');
        return;
      }

      sendSuccess(res, { pass }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/passes/:id/qr
   * Issues signed QR token and base64 QR code image for approved pass.
   */
  public static async getPassQR(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const passId = req.params.id;
      const pass = await GatePass.findOne({
        $or: [{ passId }, { _id: passId.match(/^[0-9a-fA-F]{24}$/) ? passId : undefined }],
      });

      if (!pass) {
        sendError(res, 'Gate pass not found', 404, 'PASS_NOT_FOUND');
        return;
      }

      if (pass.status !== 'ACTIVE' && pass.status !== 'APPROVED') {
        sendError(
          res,
          `Cannot generate QR for pass with status "${pass.status}". Must be APPROVED or ACTIVE.`,
          403,
          'PASS_NOT_ACTIVE'
        );
        return;
      }

      if (new Date() > pass.expiresAt) {
        pass.status = 'EXPIRED';
        await pass.save();
        sendError(res, 'Gate pass has expired', 410, 'PASS_EXPIRED');
        return;
      }

      const qrToken = QRService.generatePassQRToken(pass);
      const qrImage = await QRService.generateQRCodeImage(qrToken);

      sendSuccess(
        res,
        {
          passId: pass.passId,
          qrToken,
          qrImage,
          expiresAt: pass.expiresAt,
          issuedAt: pass.issuedAt || pass.requestedAt,
        },
        200,
        'QR token generated successfully'
      );
    } catch (err) {
      next(err);
    }
  }
}
