import mongoose, { Document, Model, Schema } from 'mongoose';

export type NotificationType =
  | 'PASS_REQUESTED'
  | 'PASS_APPROVED'
  | 'PASS_REJECTED'
  | 'CLASS_CANCELLED'
  | 'CLASS_RESCHEDULED'
  | 'GATE_EXIT'
  | 'GATE_DENIED';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'PASS_REQUESTED',
        'PASS_APPROVED',
        'PASS_REJECTED',
        'CLASS_CANCELLED',
        'CLASS_RESCHEDULED',
        'GATE_EXIT',
        'GATE_DENIED',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
