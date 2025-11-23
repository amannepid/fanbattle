import 'server-only';

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
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';

// Firebase Admin SDK for FCM sending
let messaging: any = null;
let adminInitialized = false;

async function initializeFirebaseAdmin() {
  if (adminInitialized && messaging) {
    return true;
  }

  try {
    // Check if already initialized
    if (getApps().length > 0) {
      messaging = getMessaging();
      adminInitialized = true;
      return true;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found, FCM sending will not work');
      return false;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
      });
      logger.info('Firebase Admin initialized for FCM');
    } catch (error) {
      logger.error('Error initializing Firebase Admin', { error });
      return false;
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
      // Note: Skip iOS subscriptions if APNs is not configured (they won't work anyway)
      const subscriptions = await firestoreStorage.getAllSubscriptions();
      const fcmSubscriptions = subscriptions.filter(
        sub => {
          const hasFCM = sub.channels.fcm?.enabled && sub.channels.fcm?.token;
          if (!hasFCM) return false;
          
          // Skip iOS if APNs might not be configured (will fail with auth error)
          // This is a graceful fallback - iOS users will rely on client-side local notifications
          const isIOS = sub.channels.fcm?.platform === 'ios';
          if (isIOS) {
            logger.debug('Skipping iOS FCM notification (APNs may not be configured). iOS users will use local notifications when app is open.', {
              userId: sub.userId,
            });
            return false; // Skip iOS FCM, rely on local notifications
          }
          
          return true;
        }
      );

      if (fcmSubscriptions.length === 0) {
        logger.debug('No FCM subscriptions found (excluding iOS)');
        return;
      }

      // Get active tournament and matches
      const tournament = await getActiveTournament();
      if (!tournament) {
        logger.debug('No active tournament found');
        return;
      }

      const allMatches = await getMatches(tournament.id);

      // Process users in parallel batches to improve performance
      const BATCH_SIZE = 10; // Process 10 users at a time
      for (let i = 0; i < fcmSubscriptions.length; i += BATCH_SIZE) {
        const batch = fcmSubscriptions.slice(i, i + BATCH_SIZE);
        
        await Promise.allSettled(
          batch.map(async (subscription) => {
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
          })
        );
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
      // Filter FCM subscriptions, but skip iOS if APNs might not be configured
      const fcmSubscriptions = subscriptions.filter(
        sub => {
          const hasFCM = sub.channels.fcm?.enabled && sub.channels.fcm?.token;
          if (!hasFCM) return false;
          
          // Skip iOS if APNs might not be configured
          const isIOS = sub.channels.fcm?.platform === 'ios';
          if (isIOS) {
            logger.info('Skipping iOS FCM test notification (APNs may not be configured). iOS users can test local notifications via the test page.', {
              userId: sub.userId,
            });
            return false;
          }
          
          return true;
        }
      );

      if (fcmSubscriptions.length === 0) {
        logger.info('No FCM subscriptions found for test notification (excluding iOS)');
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
          logger.info('Test notification sent', { 
            userId: subscription.userId,
            platform: subscription.channels.fcm?.platform,
          });
        } catch (error) {
          logger.error('Error sending test notification', {
            error,
            userId: subscription.userId,
            platform: subscription.channels.fcm?.platform,
          });
        }
      }

      logger.info(`✅ Test notifications sent to ${fcmSubscriptions.length} user(s)`);
    } catch (error) {
      logger.error('Error sending test notifications to all', { error });
    }
  }

  private async sendFCMNotification(
    subscription: { userId: string; channels: { fcm?: { token: string; platform?: string } } },
    notification: Notification
  ): Promise<void> {
    try {
      const token = subscription.channels.fcm?.token;
      const platform = subscription.channels.fcm?.platform;
      
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

      logger.info('Sending FCM notification', {
        userId: subscription.userId,
        platform,
        notificationId: notification.id,
      });

      // Build base message
      const message: Message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.data.imageUrl || undefined,
        },
        data: {
          ...notification.data,
          notificationId: notification.id,
          type: notification.type,
          url: notification.data.url || '/',
        },
      };

      // iOS-specific configuration
      if (platform === 'ios') {
        // iOS requires specific APNs configuration
        message.apns = {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: 1,
              sound: 'default',
              'content-available': 1, // Enable background fetch
            },
          },
          headers: {
            'apns-priority': '10', // High priority (10 = immediate, 5 = power-efficient)
            'apns-push-type': 'alert', // Required for iOS 13+
          },
          fcmOptions: {
            imageUrl: notification.data.imageUrl || undefined,
          },
        };
        
        // For iOS PWAs, also include webpush (Safari supports web push)
        message.webpush = {
          headers: {
            Urgency: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal',
          },
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.data.icon || '/logo.png',
            badge: '/logo.png',
            requireInteraction: false,
          },
          fcmOptions: {
            link: notification.data.url || '/',
          },
        };
      } else {
        // Android/Desktop configuration
        message.webpush = {
          headers: {
            Urgency: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal',
          },
          fcmOptions: {
            link: notification.data.url || '/',
          },
        };
        
        message.android = {
          notification: {
            icon: notification.data.icon || '/logo.png',
            color: '#0A233F',
            sound: 'default',
            priority: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal',
          },
        };
        
        // Also include APNs for cross-platform compatibility
        message.apns = {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: 1,
              sound: 'default',
            },
          },
          fcmOptions: {
            imageUrl: notification.data.imageUrl || undefined,
          },
        };
      }

      await messaging.send(message);
      
      logger.info('FCM notification sent successfully', {
        userId: subscription.userId,
        platform,
        notificationId: notification.id,
      });
    } catch (error: any) {
      // Handle specific FCM errors
      if (error?.code === 'messaging/invalid-registration-token' || 
          error?.code === 'messaging/registration-token-not-registered') {
        logger.warn('Invalid FCM token, user may need to resubscribe', {
          userId: subscription.userId,
          platform: subscription.channels.fcm?.platform,
          error: error.code,
        });
      } else if (error?.code === 'messaging/authentication-error') {
        logger.error('Firebase authentication error - check APNs configuration in Firebase Console', {
          userId: subscription.userId,
          platform: subscription.channels.fcm?.platform,
          error: error.code,
        });
      } else if (error?.code === 'messaging/invalid-argument') {
        logger.error('Invalid FCM message argument', {
          userId: subscription.userId,
          platform: subscription.channels.fcm?.platform,
          error: error.code,
          notificationId: notification.id,
        });
      } else {
        logger.error('Error sending FCM notification', {
          error: error?.message || error,
          errorCode: error?.code,
          userId: subscription.userId,
          platform: subscription.channels.fcm?.platform,
          notificationId: notification.id,
        });
      }
      // Don't re-throw - allow other users' notifications to be processed
      // The error is already logged for monitoring
    }
  }
}

