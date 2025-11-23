import { INotificationChannel } from './channel.interface';
import type { Notification } from '../core/types';
import { NotificationResult, SubscriptionResult } from '../core/result';
import { Platform } from '../platform/platform-detector';
import { fcmProvider } from '../providers/fcm-provider';
import { createSuccessResult, createErrorResult } from '../core/result';
import { logger } from '../utils/logger';
import { errorHandler, ErrorType } from '../utils/error-handler';
import { INotificationStorage } from '../storage/storage.interface';

export class FCMChannel implements INotificationChannel {
  name = 'fcm';
  platform = [Platform.IOS, Platform.ANDROID, Platform.DESKTOP];

  constructor(private storage?: INotificationStorage) {}

  async send(notification: Notification): Promise<NotificationResult> {
    // FCM sending happens on server side
    // This method validates the notification and checks if user is subscribed
    try {
      if (!this.storage) {
        return createErrorResult(
          'Storage not configured for FCM channel',
          false,
          this.name,
          ErrorType.SERVICE_UNAVAILABLE
        );
      }

      const subscription = await this.storage.getSubscription(notification.userId);
      
      if (!subscription || !subscription.channels.fcm?.enabled || !subscription.channels.fcm?.token) {
        return createErrorResult(
          'User not subscribed to FCM',
          false,
          this.name,
          ErrorType.INVALID_TOKEN
        );
      }

      // Validate payload
      const payload = {
        title: notification.title,
        body: notification.body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          ...notification.data,
          notificationId: notification.id,
          type: notification.type,
        },
      };

      const result = await fcmProvider.send(payload);

      if (result.success) {
        logger.info('FCM notification validated', { notificationId: notification.id });
        // Note: Actual sending happens on server
        return createSuccessResult(this.name, notification.id);
      } else {
        logger.error('Failed to validate FCM notification', {
          notificationId: notification.id,
          error: result.error,
        });
        return createErrorResult(result.error, result.retryable, this.name, result.errorCode);
      }
    } catch (error) {
      const errorType = errorHandler.handle(error);
      const retryable = errorHandler.isRetryable(error);
      logger.error('Error in FCM channel', { error, notificationId: notification.id });
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

    // Check notification permission first
    if ('Notification' in window && Notification.permission !== 'granted') {
      return false;
    }

    const initialized = await fcmProvider.initialize();
    if (!initialized) {
      return false;
    }

    // Try to get token, but don't fail if it's blocked
    // FCM can still work for server-sent notifications even if client token fails
    try {
      const token = await fcmProvider.getToken();
      return token !== null;
    } catch (error) {
      // If permission is blocked, FCM is not available
      // But we'll still return true if initialized, as server can send notifications
      return initialized;
    }
  }

  async subscribe(userId: string): Promise<SubscriptionResult> {
    try {
      const initialized = await fcmProvider.initialize();
      if (!initialized) {
        return {
          success: false,
          error: 'FCM not initialized',
          retryable: true,
        };
      }

      const token = await fcmProvider.getToken();
      if (!token) {
        return {
          success: false,
          error: 'Failed to get FCM token',
          retryable: true,
        };
      }

      // Store subscription in storage
      if (this.storage) {
        const subscription = await this.storage.getSubscription(userId);
        await this.storage.saveSubscription({
          userId,
          channels: {
            ...subscription?.channels,
            fcm: {
              enabled: true,
              token,
              platform: Platform.IOS, // Will be set correctly by platform detector
            },
          },
          preferences: subscription?.preferences || {
            cutoffReminders: true,
            matchAvailable: false,
            scoreUpdates: false,
            leaderboardUpdates: false,
          },
          createdAt: subscription?.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }

      logger.info('FCM subscription successful', { userId });
      return { success: true, token, subscriptionId: userId };
    } catch (error) {
      logger.error('Error subscribing to FCM', { error, userId });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    try {
      if (this.storage) {
        const subscription = await this.storage.getSubscription(userId);
        if (subscription) {
          await this.storage.saveSubscription({
            ...subscription,
            channels: {
              ...subscription.channels,
              fcm: {
                ...subscription.channels.fcm,
                enabled: false,
              },
            },
            updatedAt: new Date(),
          });
        }
      }
      logger.info('FCM unsubscription successful', { userId });
    } catch (error) {
      logger.error('Error unsubscribing from FCM', { error, userId });
    }
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

    // FCM can send if provider is initialized
    return fcmProvider.isInitialized();
  }
}

