import { Notification, NotificationResult, NotificationStatus, NotificationContext, NotificationPreferences } from './types';
import { channelFactory } from '../channels/channel-factory';
import { channelSelector } from '../channels/channel-selector';
import { platformDetector, Platform } from '../platform/platform-detector';
import { capabilityChecker } from '../platform/capability-checker';
import { LocalNotificationChannel } from '../channels/local-channel';
import { FCMChannel } from '../channels/fcm-channel';
import { firestoreStorage, INotificationStorage } from '../storage/firestore-storage';
import { eventBus } from '../handlers/event-handler';
import { clickHandler } from '../handlers/click-handler';
import { retryHandler } from '../utils/retry-handler';
import { errorHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { configManager } from '../config/config';
import { getMatches } from '@/lib/firestore';
import { getUserPredictions } from '@/lib/firestore';
import { getPrediction } from '@/lib/firestore';
import { getActiveTournament } from '@/lib/firestore';
import { Match, Prediction } from '@/types';

export interface INotificationManager {
  initialize(): Promise<void>;
  send(notification: Notification): Promise<NotificationResult>;
  subscribe(userId: string, preferences?: NotificationPreferences): Promise<void>;
  unsubscribe(userId: string): Promise<void>;
  getStatus(userId: string): Promise<NotificationStatus>;
  getNotificationContext(): Promise<NotificationContext | null>;
}

export class NotificationManager implements INotificationManager {
  private initialized: boolean = false;
  private currentUserId: string | null = null;
  private storage: INotificationStorage;

  constructor(storage?: INotificationStorage) {
    this.storage = storage || firestoreStorage;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Notification manager already initialized');
      return;
    }

    try {
      // Register channels
      const localChannel = new LocalNotificationChannel();
      const fcmChannel = new FCMChannel(this.storage);
      
      channelFactory.register('local', localChannel);
      channelFactory.register('fcm', fcmChannel);

      // Initialize FCM provider (gracefully handle unsupported browsers)
      await fcmProvider.initialize().catch(error => {
        // Don't log as error if browser doesn't support FCM - this is expected on some browsers
        if (error?.code === 'messaging/unsupported-browser' || 
            error?.message?.includes('does not support')) {
          logger.debug('FCM not supported in this browser, using local notifications only', { error });
        } else {
          logger.warn('FCM initialization failed', { error });
        }
      });

      this.initialized = true;
      logger.info('Notification manager initialized');
      
      await eventBus.emit('subscription_success', {});
    } catch (error) {
      logger.error('Error initializing notification manager', { error });
      throw error;
    }
  }

  async send(notification: Notification): Promise<NotificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const platform = platformDetector.detect();
      const availableChannels = await channelSelector.selectWithFallback(notification, platform);

      if (availableChannels.length === 0) {
        logger.warn('No available channels for notification', {
          notificationId: notification.id,
          platform,
        });
        return {
          success: false,
          error: 'No available notification channels',
          retryable: false,
        };
      }

      // Try channels in order (with fallback)
      let lastError: NotificationResult | null = null;

      for (const channel of availableChannels) {
        try {
          // Check if channel is available
          const isAvailable = await channel.isAvailable();
          if (!isAvailable) {
            logger.debug(`Channel ${channel.name} not available, trying next`, {
              notificationId: notification.id,
            });
            continue;
          }

          // Check if channel can send this notification
          if (!channel.canSend(notification)) {
            logger.debug(`Channel ${channel.name} cannot send notification`, {
              notificationId: notification.id,
            });
            continue;
          }

          // Send notification with retry
          const result = await retryHandler.execute(
            () => channel.send(notification),
            {
              retryable: (error) => errorHandler.isRetryable(error),
            }
          );

          if (result.success) {
            logger.info('Notification sent successfully', {
              notificationId: notification.id,
              channel: channel.name,
            });

            // Log notification
            await this.logNotification(notification, channel.name, 'sent');

            await eventBus.emit('notification_sent', {
              notification,
              channel: channel.name,
            });

            return result;
          } else {
            lastError = result;
            logger.warn(`Channel ${channel.name} failed, trying next`, {
              notificationId: notification.id,
              error: result.error,
            });
          }
        } catch (error) {
          lastError = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            retryable: errorHandler.isRetryable(error),
          };
          logger.error(`Error sending notification via ${channel.name}`, {
            error,
            notificationId: notification.id,
          });
        }
      }

      // All channels failed
      const finalError = lastError || {
        success: false,
        error: 'All notification channels failed',
        retryable: false,
      };

      await this.logNotification(notification, 'unknown', 'failed', finalError.error);
      await eventBus.emit('notification_failed', {
        notification,
        error: finalError.error,
      });

      return finalError;
    } catch (error) {
      logger.error('Error sending notification', { error, notification });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: errorHandler.isRetryable(error),
      };
    }
  }

  async subscribe(userId: string, preferences?: NotificationPreferences): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      this.currentUserId = userId;
      const platform = platformDetector.detect();
      const capabilities = await capabilityChecker.getCapabilities();

      // Determine which channels to subscribe to
      const channels: { local?: any; fcm?: any } = {};

      // Subscribe to local notifications (if supported)
      if (capabilities.localNotifications && (platform === Platform.ANDROID || platform === Platform.DESKTOP)) {
        const localChannel = channelFactory.get('local');
        if (localChannel) {
          const result = await localChannel.subscribe(userId);
          if (result.success) {
            channels.local = { enabled: true };
            logger.info('Subscribed to local notifications', { userId });
          }
        }
      }

      // Subscribe to FCM (especially for iOS, or as fallback)
      if (capabilities.fcm && (platform === Platform.IOS || platform === Platform.ANDROID || platform === Platform.DESKTOP)) {
        const fcmChannel = channelFactory.get('fcm');
        if (fcmChannel) {
          const result = await fcmChannel.subscribe(userId);
          if (result.success) {
            channels.fcm = {
              enabled: true,
              token: result.token,
              platform,
            };
            logger.info('Subscribed to FCM', { userId, platform });
          }
        }
      }

      // Save subscription
      const subscription = await this.storage.getSubscription(userId);
      await this.storage.saveSubscription({
        userId,
        channels,
        preferences: preferences || subscription?.preferences || {
          cutoffReminders: true,
          matchAvailable: false,
          scoreUpdates: false,
          leaderboardUpdates: false,
        },
        createdAt: subscription?.createdAt || new Date(),
        updatedAt: new Date(),
      });

      await eventBus.emit('subscription_success', { userId, channels });
    } catch (error) {
      logger.error('Error subscribing to notifications', { error, userId });
      await eventBus.emit('subscription_failed', { userId, error });
      throw error;
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    try {
      const localChannel = channelFactory.get('local');
      const fcmChannel = channelFactory.get('fcm');

      if (localChannel) {
        await localChannel.unsubscribe(userId);
      }

      if (fcmChannel) {
        await fcmChannel.unsubscribe(userId);
      }

      await this.storage.deleteSubscription(userId);
      await eventBus.emit('unsubscription_success', { userId });
      logger.info('Unsubscribed from notifications', { userId });
    } catch (error) {
      logger.error('Error unsubscribing from notifications', { error, userId });
      throw error;
    }
  }

  async getStatus(userId: string): Promise<NotificationStatus> {
    try {
      const capabilities = await capabilityChecker.getCapabilities();
      const subscription = await this.storage.getSubscription(userId);
      const preference = await this.storage.getPreference(userId);

      const permissionState = localProvider.getPermissionState();
      const permissionGranted = permissionState === 'granted';

      return {
        enabled: subscription !== null,
        permissionGranted,
        channels: {
          local: {
            enabled: subscription?.channels.local?.enabled || false,
            available: capabilities.localNotifications,
          },
          fcm: {
            enabled: subscription?.channels.fcm?.enabled || false,
            available: capabilities.fcm,
            subscribed: !!subscription?.channels.fcm?.token,
          },
        },
        preferences: preference || subscription?.preferences || {
          cutoffReminders: true,
          matchAvailable: false,
          scoreUpdates: false,
          leaderboardUpdates: false,
        },
      };
    } catch (error) {
      logger.error('Error getting notification status', { error, userId });
      throw error;
    }
  }

  async getNotificationContext(): Promise<NotificationContext | null> {
    if (!this.currentUserId) {
      return null;
    }

    try {
      const tournament = await getActiveTournament();
      if (!tournament) {
        return null;
      }

      const allMatches = await getMatches(tournament.id);
      const userPredictions = await getUserPredictions(this.currentUserId);

      return {
        userId: this.currentUserId,
        tournamentId: tournament.id,
        allMatches,
        userPredictions,
        hasUserPredicted: async (matchId: string) => {
          const prediction = await getPrediction(this.currentUserId!, matchId);
          return prediction !== null;
        },
      };
    } catch (error) {
      logger.error('Error getting notification context', { error });
      return null;
    }
  }

  setUserId(userId: string): void {
    this.currentUserId = userId;
  }

  private async logNotification(
    notification: Notification,
    channel: string,
    status: 'sent' | 'failed' | 'pending',
    error?: string
  ): Promise<void> {
    try {
      await this.storage.saveNotificationLog({
        id: `${notification.id}-${Date.now()}`,
        userId: notification.userId,
        notificationId: notification.id,
        type: notification.type,
        channel,
        status,
        sentAt: status === 'sent' ? new Date() : undefined,
        error,
        retryCount: 0,
        createdAt: new Date(),
      });
    } catch (error) {
      logger.error('Error logging notification', { error });
    }
  }
}

// Import fcmProvider
import { fcmProvider } from '../providers/fcm-provider';
import { localProvider } from '../providers/local-provider';

// Singleton instance
let managerInstance: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!managerInstance) {
    managerInstance = new NotificationManager();
  }
  return managerInstance;
}

