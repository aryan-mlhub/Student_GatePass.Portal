import mongoose from 'mongoose';
import { GatePass, IGatePass, PassStatus, PassDecision } from '../models/GatePass.js';
import { User } from '../models/User.js';
import { TimetableEngine } from './timetableEngine.js';
import { QRService } from './qrService.js';
import { NotificationService } from './notificationService.js';
import { env } from '../config/env.js';

export interface CreatePassInput {
  studentUserId: string;
  reason: string;
  expectedReturnTime?: Date;
  gateId?: string;
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

export class PassService {
  /**
   * Evaluates and creates a new gate pass request.
   */
  public static async requestPass(input: CreatePassInput): Promise<{
    pass: IGatePass;
    decision: PassDecision;
    reason: string;
    qrToken?: string;
  }> {
    const student = await User.findById(input.studentUserId);
    if (!student || student.role !== 'STUDENT') {
      throw new Error('Invalid student user identifier.');
    }

    const evaluation = await TimetableEngine.evaluateGatePassRequest({
      studentId: student._id.toString(),
      timestamp: input.timestamp,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    const now = input.timestamp || new Date();
    const expiryMinutes = env.QR_EXPIRY_MINUTES || 30;
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);

    const isAutoApproved = evaluation.decision === 'AUTO_APPROVED';
    const status: PassStatus = isAutoApproved ? 'ACTIVE' : 'PENDING';
    const passId = `GP-${Math.floor(1000 + Math.random() * 9000)}`;

    const pass = await GatePass.create({
      passId,
      studentId: student._id,
      reason: input.reason,
      requestedAt: now,
      issuedAt: isAutoApproved ? now : undefined,
      expiresAt,
      expectedReturnTime: input.expectedReturnTime,
      gateId: input.gateId || 'MAIN_GATE',
      status,
      decision: evaluation.decision,
      decisionReason: evaluation.reason,
      requestLocation: {
        latitude: input.latitude,
        longitude: input.longitude,
        distanceMeters: evaluation.distanceFromCampus,
      },
    });

    let qrToken: string | undefined;
    if (isAutoApproved) {
      qrToken = QRService.generatePassQRToken(pass);
    }

    // Send notification to student
    await NotificationService.createNotification({
      userId: student._id,
      type: isAutoApproved ? 'PASS_APPROVED' : 'PASS_REQUESTED',
      title: isAutoApproved ? 'Gate Pass Auto-Approved' : 'Gate Pass Submitted for Review',
      message: isAutoApproved
        ? `Your gate pass ${passId} has been auto-approved (${evaluation.reason}).`
        : `Your gate pass ${passId} is pending Warden approval due to scheduled lecture.`,
      metadata: { passId, decision: evaluation.decision },
    });

    return {
      pass,
      decision: evaluation.decision,
      reason: evaluation.reason,
      qrToken,
    };
  }

  /**
   * Warden or Admin approves a pending gate pass.
   */
  public static async approvePass(
    passIdOrMongoId: string,
    wardenUserId: string
  ): Promise<IGatePass> {
    const warden = await User.findById(wardenUserId);
    if (!warden || (warden.role !== 'WARDEN' && warden.role !== 'ADMIN')) {
      throw new Error('Unauthorized: Only Warden or Admin can approve passes.');
    }

    const pass = await GatePass.findOne({
      $or: [
        { passId: passIdOrMongoId },
        mongoose.Types.ObjectId.isValid(passIdOrMongoId)
          ? { _id: new mongoose.Types.ObjectId(passIdOrMongoId) }
          : { passId: passIdOrMongoId },
      ],
    });

    if (!pass) {
      throw new Error('Gate pass not found.');
    }

    if (pass.status !== 'PENDING') {
      throw new Error(`Cannot approve pass with status "${pass.status}".`);
    }

    const now = new Date();
    const expiryMinutes = env.QR_EXPIRY_MINUTES || 30;

    pass.status = 'ACTIVE';
    pass.approvedBy = warden._id as mongoose.Types.ObjectId;
    pass.approvedAt = now;
    pass.issuedAt = now;
    pass.expiresAt = new Date(now.getTime() + expiryMinutes * 60000);
    await pass.save();

    await NotificationService.createNotification({
      userId: pass.studentId,
      type: 'PASS_APPROVED',
      title: 'Gate Pass Approved by Warden',
      message: `Your gate pass ${pass.passId} has been approved by ${warden.name}. Valid for 30 minutes.`,
      metadata: { passId: pass.passId, approvedBy: warden.name },
    });

    return pass;
  }

  /**
   * Warden or Admin rejects a pending gate pass.
   */
  public static async rejectPass(
    passIdOrMongoId: string,
    wardenUserId: string,
    rejectionReason: string
  ): Promise<IGatePass> {
    const warden = await User.findById(wardenUserId);
    if (!warden || (warden.role !== 'WARDEN' && warden.role !== 'ADMIN')) {
      throw new Error('Unauthorized: Only Warden or Admin can reject passes.');
    }

    const pass = await GatePass.findOne({
      $or: [
        { passId: passIdOrMongoId },
        mongoose.Types.ObjectId.isValid(passIdOrMongoId)
          ? { _id: new mongoose.Types.ObjectId(passIdOrMongoId) }
          : { passId: passIdOrMongoId },
      ],
    });

    if (!pass) {
      throw new Error('Gate pass not found.');
    }

    if (pass.status !== 'PENDING') {
      throw new Error(`Cannot reject pass with status "${pass.status}".`);
    }

    pass.status = 'REJECTED';
    pass.decisionReason = rejectionReason;
    pass.approvedBy = warden._id as mongoose.Types.ObjectId;
    pass.approvedAt = new Date();
    await pass.save();

    await NotificationService.createNotification({
      userId: pass.studentId,
      type: 'PASS_REJECTED',
      title: 'Gate Pass Rejected',
      message: `Your gate pass ${pass.passId} was rejected by Warden: ${rejectionReason}`,
      metadata: { passId: pass.passId, reason: rejectionReason },
    });

    return pass;
  }
}
