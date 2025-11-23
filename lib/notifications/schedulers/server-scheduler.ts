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
// Note: This requires Firebase Admin SDK on the server for actual FCM sending
// For now, this is a placeholder that can be implemented when needed
// To use: import { admin } from 'firebase-admin'; import { getMessaging } from 'firebase-admin/messaging';

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
      // This requires Firebase Admin SDK
      // For now, log that it would be sent
      logger.info('Would send FCM notification', {
        userId: subscription.userId,
        notificationId: notification.id,
        token: subscription.channels.fcm?.token?.substring(0, 20) + '...',
      });

      // Actual implementation would use:
      // const messaging = getMessaging();
      // await messaging.send({
      //   token: subscription.channels.fcm!.token!,
      //   notification: {
      //   title: notification.title,
      //   body: notification.body,
      //   icon: '/logo.png',
      //   badge: '/logo.png',
      //   },
      //   data: {
      //     ...notification.data,
      //     notificationId: notification.id,
      //     type: notification.type,
      //   },
      //   webpush: {
      //     fcmOptions: {
      //       link: notification.data.url || '/',
      //     },
      //   },
      // });
    } catch (error) {
      logger.error('Error sending FCM notification', {
        error,
        userId: subscription.userId,
        notificationId: notification.id,
      });
    }
  }
}

