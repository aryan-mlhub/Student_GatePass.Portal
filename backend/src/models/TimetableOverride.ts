import mongoose, { Document, Model, Schema } from 'mongoose';

export type OverrideType = 'CANCEL' | 'RESCHEDULE' | 'ADD' | 'REMOVE';

export interface ITimetableOverride extends Document {
  timetableId?: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD" e.g. "2026-08-29"
  type: OverrideType;
  reason: string;
  newSubject?: string;
  newStartTime?: string; // "HH:mm"
  newEndTime?: string;   // "HH:mm"
  newStartMinutes?: number;
  newEndMinutes?: number;
  newRoom?: string;
  section?: string;
  semester?: number;
  department?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableOverrideSchema = new Schema<ITimetableOverride>(
  {
    timetableId: {
      type: Schema.Types.ObjectId,
      ref: 'Timetable',
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
      index: true,
    },
    type: {
      type: String,
      enum: ['CANCEL', 'RESCHEDULE', 'ADD', 'REMOVE'],
      required: [true, 'Override type is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    newSubject: {
      type: String,
      trim: true,
    },
    newStartTime: {
      type: String,
      match: [/^\d{2}:\d{2}$/, 'Start time must be in HH:mm format'],
    },
    newEndTime: {
      type: String,
      match: [/^\d{2}:\d{2}$/, 'End time must be in HH:mm format'],
    },
    newStartMinutes: {
      type: Number,
    },
    newEndMinutes: {
      type: Number,
    },
    newRoom: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
    },
    semester: {
      type: Number,
    },
    department: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

TimetableOverrideSchema.index({ date: 1, timetableId: 1 });
TimetableOverrideSchema.index({ date: 1, section: 1 });

export const TimetableOverride: Model<ITimetableOverride> =
  mongoose.models.TimetableOverride ||
  mongoose.model<ITimetableOverride>('TimetableOverride', TimetableOverrideSchema);
