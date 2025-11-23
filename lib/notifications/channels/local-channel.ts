import { INotificationChannel } from './channel.interface';
import type { Notification } from '../core/types';
import { NotificationResult, SubscriptionResult } from '../core/result';
import { Platform } from '../platform/platform-detector';
import { localProvider } from '../providers/local-provider';
import { createSuccessResult, createErrorResult } from '../core/result';
import { logger } from '../utils/logger';
import { errorHandler, ErrorType } from '../utils/error-handler';

export class LocalNotificationChannel implements INotificationChannel {
  name = 'local';
  platform = [Platform.ANDROID, Platform.DESKTOP];

  async send(notification: Notification): Promise<NotificationResult> {
    try {
      const payload = {
        title: notification.title,
        body: notification.body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `notification-${notification.id}`,
        data: {
          ...notification.data,
          notificationId: notification.id,
          type: notification.type,
        },
        requireInteraction: notification.priority === 'urgent',
      };

      const result = await localProvider.send(payload);

      if (result.success) {
        logger.info('Local notification sent', { notificationId: notification.id });
        return createSuccessResult(this.name, notification.id);
      } else {
        logger.error('Failed to send local notification', {
          notificationId: notification.id,
          error: result.error,
        });
        return createErrorResult(result.error, result.retryable, this.name, result.errorCode);
      }
    } catch (error) {
      const errorType = errorHandler.handle(error);
      const retryable = errorHandler.isRetryable(error);
      logger.error('Error sending local notification', { error, notificationId: notification.id });
      return createErrorResult(
        error instanceof Error ? error.message : String(error),
        retryable,
        this.name,
        errorType
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!('Notification' in window)) {
      return false;
    }

    const permission = localProvider.getPermissionState();
    return permission === 'granted' || permission === 'default';
  }

  async subscribe(userId: string): Promise<SubscriptionResult> {
    try {
      const permission = await localProvider.requestPermission();
      
      if (permission === 'granted') {
        logger.info('Local notification subscription successful', { userId });
        return { success: true };
      } else {
        logger.warn('Local notification permission denied', { userId, permission });
        return {
          success: false,
          error: `Permission denied: ${permission}`,
          retryable: false,
        };
      }
    } catch (error) {
      logger.error('Error subscribing to local notifications', { error, userId });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    // Local notifications don't require explicit unsubscription
    // Permission can be revoked by user in browser settings
    logger.debug('Local notification unsubscription', { userId });
  }

  canSend(notification: Notification): boolean {
    // Check if notification is not expired
    if (notification.expiresAt && new Date() > notification.expiresAt) {
      return false;
    }

    // Check if notification is scheduled for future
    if (notification.scheduledFor && new Date() < notification.scheduledFor) {
      return false;
    }

    return localProvider.getPermissionState() === 'granted';
  }
}

