import mongoose, { Document, Model, Schema } from 'mongoose';

export type PassStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'USED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'REVOKED';

export type PassDecision =
  | 'AUTO_APPROVED'
  | 'REQUIRES_APPROVAL'
  | 'REJECTED'
  | 'REJECT_LOCATION'
  | 'REJECT_DUPLICATE';

export interface IRequestLocation {
  latitude: number;
  longitude: number;
  distanceMeters?: number;
}

export interface IGatePass extends Document {
  passId: string; // e.g. "GP-1042"
  studentId: mongoose.Types.ObjectId;
  reason: string;
  requestedAt: Date;
  issuedAt?: Date;
  expiresAt: Date;
  expectedReturnTime?: Date;
  gateId: string; // e.g. "GATE_MAIN_01"
  status: PassStatus;
  decision: PassDecision;
  decisionReason?: string;
  requestLocation: IRequestLocation;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  usedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GatePassSchema = new Schema<IGatePass>(
  {
    passId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID reference is required'],
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for pass is required'],
      trim: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    issuedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    expectedReturnTime: {
      type: Date,
    },
    gateId: {
      type: String,
      default: 'MAIN_GATE',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'ACTIVE', 'USED', 'EXPIRED', 'REJECTED', 'REVOKED'],
      default: 'PENDING',
      index: true,
    },
    decision: {
      type: String,
      enum: [
        'AUTO_APPROVED',
        'REQUIRES_APPROVAL',
        'REJECTED',
        'REJECT_LOCATION',
        'REJECT_DUPLICATE',
      ],
      required: true,
    },
    decisionReason: {
      type: String,
      trim: true,
    },
    requestLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      distanceMeters: { type: Number },
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    usedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

GatePassSchema.index({ studentId: 1, status: 1 });
GatePassSchema.index({ status: 1, createdAt: -1 });

export const GatePass: Model<IGatePass> =
  mongoose.models.GatePass || mongoose.model<IGatePass>('GatePass', GatePassSchema);
