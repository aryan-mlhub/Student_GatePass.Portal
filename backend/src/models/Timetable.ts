import mongoose, { Document, Model, Schema } from 'mongoose';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type TimetableStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'FREE'
  | 'BREAK';

export interface ITimetable extends Document {
  day: DayOfWeek;
  startTime: string; // "HH:mm" e.g. "09:30"
  endTime: string;   // "HH:mm" e.g. "10:30"
  startMinutes: number; // minutes from 00:00 (e.g. 9*60+30 = 570)
  endMinutes: number;   // minutes from 00:00 (e.g. 10*60+30 = 630)
  subject: string;
  subjectCode: string;
  room: string;
  faculty?: string;
  section: string; // 'A', 'B'
  semester: number; // e.g. 3
  department: string; // 'CSE(AI&ML)'
  status: TimetableStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema = new Schema<ITimetable>(
  {
    day: {
      type: String,
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      required: [true, 'Day is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must be in HH:mm format'],
    },
    startMinutes: {
      type: Number,
      required: true,
      index: true,
    },
    endMinutes: {
      type: Number,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    subjectCode: {
      type: String,
      default: 'FREE',
      trim: true,
      uppercase: true,
    },
    room: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    faculty: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    semester: {
      type: Number,
      default: 3,
      index: true,
    },
    department: {
      type: String,
      default: 'CSE(AI&ML)',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'RESCHEDULED', 'FREE', 'BREAK'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-speed timetable lookups
TimetableSchema.index({ section: 1, semester: 1, day: 1 });
TimetableSchema.index({ day: 1, startMinutes: 1, endMinutes: 1 });
TimetableSchema.index({ section: 1, day: 1, startMinutes: 1 });

export const Timetable: Model<ITimetable> =
  mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema);
