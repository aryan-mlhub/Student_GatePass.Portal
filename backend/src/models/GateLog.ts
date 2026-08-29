import mongoose, { Document, Model, Schema } from 'mongoose';

export type GateAction = 'EXIT' | 'ENTRY' | 'DENIED';

export interface IGateLog extends Document {
  passId?: string;
  studentId: mongoose.Types.ObjectId;
  gateId: string;
  action: GateAction;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  verified: boolean;
  reason?: string;
  createdAt: Date;
}

const GateLogSchema = new Schema<IGateLog>(
  {
    passId: {
      type: String,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gateId: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
    },
    action: {
      type: String,
      enum: ['EXIT', 'ENTRY', 'DENIED'],
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

GateLogSchema.index({ studentId: 1, timestamp: -1 });
GateLogSchema.index({ gateId: 1, timestamp: -1 });
GateLogSchema.index({ action: 1, timestamp: -1 });

export const GateLog: Model<IGateLog> =
  mongoose.models.GateLog || mongoose.model<IGateLog>('GateLog', GateLogSchema);
