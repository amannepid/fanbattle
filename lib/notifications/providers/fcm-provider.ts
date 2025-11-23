import { INotificationProvider, NotificationPayload, ProviderResult } from './provider.interface';
import { logger } from '../utils/logger';
import { errorHandler, ErrorType } from '../utils/error-handler';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from '@/lib/firebase';

export class FCMProvider implements INotificationProvider {
  private messaging: Messaging | null = null;
  private token: string | null = null;
  private tokenRefreshCallbacks: ((token: string) => void)[] = [];
  private initialized: boolean = false;

  async initialize(): Promise<boolean> {
    if (this.initialized && this.messaging) {
      return true;
    }

    if (typeof window === 'undefined') {
      logger.warn('FCM provider cannot initialize on server side');
      return false;
    }

    // Check if browser supports required APIs
    if (!this.isBrowserSupported()) {
      logger.warn('Browser does not support FCM required APIs (service worker, push API)');
      return false;
    }

    try {
      // Check if messaging sender ID is configured
      if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) {
        logger.warn('Firebase messaging sender ID not configured');
        return false;
      }

      // Ensure service worker is registered (FCM needs it)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          logger.debug('Service worker ready for FCM');
        } catch (error) {
          logger.warn('Service worker not ready, FCM may not work', { error });
          // Continue anyway - service worker might register later
        }
      }

      this.messaging = getMessaging(app);
      this.initialized = true;
      logger.info('FCM provider initialized');

      // Set up message listener
      if (this.messaging) {
        onMessage(this.messaging, (payload) => {
          logger.info('FCM message received', { payload });
          // Handle foreground messages if needed
        });
      }

      return true;
    } catch (error: any) {
      // Handle specific FCM unsupported browser error
      if (error?.code === 'messaging/unsupported-browser' || 
          error?.message?.includes('does not support') ||
          error?.message?.includes('apis required')) {
        logger.warn('FCM not supported in this browser, will use local notifications', { error });
        return false;
      }
      logger.error('Failed to initialize FCM provider', { error });
      return false;
    }
  }

  private isBrowserSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for required APIs
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;

    if (!hasServiceWorker || !hasPushManager || !hasNotification) {
      return false;
    }

    return true;
  }

  async getToken(): Promise<string | null> {
    if (!this.messaging) {
      const initialized = await this.initialize();
      if (!initialized) {
        return null;
      }
    }

    if (this.token) {
      return this.token;
    }

    try {
      if (!this.messaging) {
        throw new Error('Messaging not initialized');
      }

      // Check notification permission first
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission;
        if (permission !== 'granted') {
          logger.warn(`FCM token cannot be obtained: notification permission is ${permission}`);
          return null;
        }
      }

      // Ensure service worker is ready (FCM requires it)
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready;
        } catch (error) {
          logger.warn('Service worker not ready for FCM token', { error });
          // Continue anyway - might still work
        }
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        logger.warn('VAPID key not configured, FCM may not work');
        // Continue anyway - FCM might work without VAPID key in some cases
      }

      // FCM automatically looks for /firebase-messaging-sw.js
      // We've created that file, so getToken should work now
      const token = await getToken(this.messaging, {
        vapidKey: vapidKey,
      });

      if (token) {
        this.token = token;
        logger.info('FCM token obtained');
        return token;
      } else {
        logger.warn('No FCM token available');
        return null;
      }
    } catch (error: any) {
      // Handle specific FCM errors gracefully
      if (error?.code === 'messaging/permission-blocked') {
        logger.warn('FCM permission blocked - user needs to grant notification permission');
        return null;
      } else if (error?.code === 'messaging/failed-service-worker-registration') {
        logger.warn('FCM service worker registration failed - check firebase-messaging-sw.js');
        return null;
      } else {
        logger.error('Error getting FCM token', { error });
        return null;
      }
    }
  }

  async refreshToken(): Promise<string | null> {
    this.token = null;
    return this.getToken();
  }

  onTokenRefresh(callback: (token: string) => void): void {
    this.tokenRefreshCallbacks.push(callback);
  }

  validate(payload: NotificationPayload): boolean {
    if (!payload.title || !payload.body) {
      return false;
    }

    return this.initialized && this.messaging !== null;
  }

  async send(payload: NotificationPayload): Promise<ProviderResult> {
    // FCM provider doesn't send directly from client
    // Token is stored and server sends notifications
    // This method validates and prepares the payload
    
    if (!this.validate(payload)) {
      if (!this.initialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false as const,
            error: 'FCM not initialized',
            retryable: false,
            errorCode: ErrorType.SERVICE_UNAVAILABLE,
          };
        }
      } else {
        return {
          success: false as const,
          error: 'Invalid notification payload',
          retryable: false,
          errorCode: ErrorType.INVALID_PAYLOAD,
        };
      }
    }

    // For client-side, we just validate
    // Actual sending happens on server
    const token = await this.getToken();
    if (!token) {
        return {
          success: false as const,
          error: 'FCM token not available',
          retryable: true,
          errorCode: ErrorType.INVALID_TOKEN,
        };
    }

    logger.debug('FCM payload validated', { title: payload.title });

    return {
      success: true,
      messageId: token, // Return token as messageId for reference
    };
  }

  getTokenSync(): string | null {
    return this.token;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  reset(): void {
    this.token = null;
    this.initialized = false;
    this.messaging = null;
    this.tokenRefreshCallbacks = [];
  }
}

export const fcmProvider = new FCMProvider();

