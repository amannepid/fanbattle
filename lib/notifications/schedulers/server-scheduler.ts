import { INotificationScheduler } from './scheduler.interface';
import type { Notification } from '../core/types';
import { NotificationType, NotificationPriority } from '../core/types';
import { ruleEngine } from './rule-engine';
import { firestoreStorage } from '../storage/firestore-storage';
import { FCMChannel } from '../channels/fcm-channel';
import { logger } from '../utils/logger';
import { getMatches } from '@/lib/firestore';
import { getActiveTournament } from '@/lib/firestore';
import { getUserPredictions } from '@/lib/firestore';
import { getPrediction } from '@/lib/firestore';

// Firebase Admin SDK for FCM sending
let messaging: any = null;
let adminInitialized = false;

async function initializeFirebaseAdmin() {
  if (adminInitialized && messaging) {
    return true;
  }

  try {
    // Dynamic import to avoid build errors if firebase-admin is not installed
    const admin = await import('firebase-admin');
    const { getMessaging } = await import('firebase-admin/messaging');

    if (!admin.getApps().length) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (!serviceAccountKey) {
        logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found, FCM sending will not work');
        return false;
      }

      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        admin.initializeApp({
          credential: admin.cert(serviceAccount),
        });
        logger.info('Firebase Admin initialized for FCM');
      } catch (error) {
        logger.error('Error initializing Firebase Admin', { error });
        return false;
      }
    }

    messaging = getMessaging();
    adminInitialized = true;
    return true;
  } catch (error) {
    logger.warn('Firebase Admin SDK not available, FCM sending disabled', { error });
    return false;
  }
}

export class ServerNotificationScheduler implements INotificationScheduler {
  async schedule(notification: Notification, when: Date): Promise<string> {
    // Server-side scheduling would use a job queue (e.g., Bull, Agenda)
    // For now, we'll store it in Firestore and have a cron job check
    logger.info('Scheduling notification on server', {
      notificationId: notification.id,
      scheduledFor: when.toISOString(),
    });

    // Store in Firestore for cron job to pick up
    // This would be implemented with a scheduledNotifications collection
    return notification.id;
  }

  async cancel(scheduleId: string): Promise<void> {
    logger.info('Cancelling scheduled notification', { scheduleId });
    // Remove from scheduledNotifications collection
  }

  async getScheduled(): Promise<Notification[]> {
    // Query scheduledNotifications collection
    return [];
  }

  async checkAndTrigger(): Promise<void> {
    try {
      // Check if test mode is enabled via environment variable
      const testMode = process.env.NOTIFICATION_TEST_MODE === 'true' || process.env.NOTIFICATION_TEST_MODE === '1';
      
      if (testMode) {
        logger.info('🧪 TEST MODE ENABLED - Sending test notifications to all subscribed users');
        await this.sendTestNotificationsToAll();
        return;
      }

      // Normal production mode - check for actual cutoff reminders
      // Get all users with FCM subscriptions
      const subscriptions = await firestoreStorage.getAllSubscriptions();
      const fcmSubscriptions = subscriptions.filter(
        sub => sub.channels.fcm?.enabled && sub.channels.fcm?.token
      );

      if (fcmSubscriptions.length === 0) {
        logger.debug('No FCM subscriptions found');
        return;
      }

      // Get active tournament and matches
      const tournament = await getActiveTournament();
      if (!tournament) {
        logger.debug('No active tournament found');
        return;
      }

      const allMatches = await getMatches(tournament.id);

      // Check each user
      for (const subscription of fcmSubscriptions) {
        try {
          const userPredictions = await getUserPredictions(subscription.userId);

          const context = {
            userId: subscription.userId,
            tournamentId: tournament.id,
            allMatches,
            userPredictions,
            hasUserPredicted: async (matchId: string) => {
              const prediction = await getPrediction(subscription.userId, matchId);
              return prediction !== null;
            },
          };

          // Evaluate rules
          const notifications = await ruleEngine.evaluate(context);

          // Send FCM notifications
          for (const notification of notifications) {
            await this.sendFCMNotification(subscription, notification);
          }
        } catch (error) {
          logger.error('Error processing user subscription', {
            error,
            userId: subscription.userId,
          });
        }
      }
    } catch (error) {
      logger.error('Error in server scheduler checkAndTrigger', { error });
    }
  }

  /**
   * Send test notifications to all subscribed users
   * This is used when NOTIFICATION_TEST_MODE is enabled
   */
  private async sendTestNotificationsToAll(): Promise<void> {
    try {
      const subscriptions = await firestoreStorage.getAllSubscriptions();
      const fcmSubscriptions = subscriptions.filter(
        sub => sub.channels.fcm?.enabled && sub.channels.fcm?.token
      );

      if (fcmSubscriptions.length === 0) {
        logger.info('No FCM subscriptions found for test notification');
        return;
      }

      logger.info(`Sending test notifications to ${fcmSubscriptions.length} subscribed user(s)`);

      // Create test notification
      const testNotification: Notification = {
        id: `test-all-${Date.now()}`,
        type: NotificationType.CUTOFF_REMINDER,
        userId: 'test-all-users', // Special ID for test notifications
        title: '🧪 Test Notification - NPL Fan Battle',
        body: 'This is a test notification sent to all subscribed users! Match #1 (Team A vs Team B) cutoff in 2 hours. Make your prediction!',
        data: {
          type: 'cutoff_reminder',
          notificationId: `test-all-${Date.now()}`,
          matchId: 'test-match-123',
          matchNumber: 1,
          teamAName: 'Team A',
          teamBName: 'Team B',
          url: '/predict/test-match-123',
        },
        priority: NotificationPriority.HIGH,
        createdAt: new Date(),
      };

      // Send to all subscribed users
      for (const subscription of fcmSubscriptions) {
        try {
          await this.sendFCMNotification(
            {
              userId: subscription.userId,
              channels: subscription.channels,
            },
            testNotification
          );
          logger.info('Test notification sent', { userId: subscription.userId });
        } catch (error) {
          logger.error('Error sending test notification', {
            error,
            userId: subscription.userId,
          });
        }
      }

      logger.info(`✅ Test notifications sent to ${fcmSubscriptions.length} user(s)`);
    } catch (error) {
      logger.error('Error sending test notifications to all', { error });
    }
  }

  private async sendFCMNotification(
    subscription: { userId: string; channels: { fcm?: { token: string } } },
    notification: Notification
  ): Promise<void> {
    try {
      const token = subscription.channels.fcm?.token;
      if (!token) {
        logger.warn('No FCM token available', { userId: subscription.userId });
        return;
      }

      // Initialize Firebase Admin if not already done
      const initialized = await initializeFirebaseAdmin();
      if (!initialized || !messaging) {
        logger.warn('Firebase Admin not initialized, cannot send FCM notification', {
          userId: subscription.userId,
        });
        return;
      }

      // Send FCM notification
      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...notification.data,
          notificationId: notification.id,
          type: notification.type,
        },
        webpush: {
          notification: {
            icon: '/logo.png',
            badge: '/logo.png',
            requireInteraction: false,
          },
          fcmOptions: {
            link: notification.data?.url || '/',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await messaging.send(message);
      
      logger.info('FCM notification sent successfully', {
        userId: subscription.userId,
        notificationId: notification.id,
      });
    } catch (error: any) {
      // Handle specific FCM errors
      if (error?.code === 'messaging/invalid-registration-token' || 
          error?.code === 'messaging/registration-token-not-registered') {
        logger.warn('Invalid FCM token, user may need to resubscribe', {
          userId: subscription.userId,
          error: error.code,
        });
        // Optionally: Remove invalid token from subscription
      } else {
        logger.error('Error sending FCM notification', {
          error: error?.message || error,
          userId: subscription.userId,
          notificationId: notification.id,
        });
      }
    }
  }
}

