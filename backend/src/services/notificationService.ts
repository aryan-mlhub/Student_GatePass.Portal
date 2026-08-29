import mongoose from 'mongoose';
import { Notification, INotification, NotificationType } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export interface CreateNotificationDTO {
  userId: mongoose.Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Dispatches and stores an in-app notification in MongoDB.
   */
  public static async createNotification(
    data: CreateNotificationDTO
  ): Promise<INotification> {
    const notif = await Notification.create({
      userId: new mongoose.Types.ObjectId(data.userId.toString()),
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
    });

    logger.info(`[Notification] Dispatched ${data.type} to User ${data.userId}: "${data.title}"`);
    return notif;
  }

  /**
   * Retrieves notifications for a specific user.
   */
  public static async getUserNotifications(
    userId: string,
    limit: number = 20
  ): Promise<INotification[]> {
    return Notification.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Marks a notification as read.
   */
  public static async markAsRead(notificationId: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
  }
}
