import { INotificationProvider, NotificationPayload, ProviderResult } from './provider.interface';
import { logger } from '../utils/logger';
import { errorHandler, ErrorType } from '../utils/error-handler';

type PermissionState = 'default' | 'granted' | 'denied';

export class LocalNotificationProvider implements INotificationProvider {
  private permissionState: PermissionState | null = null;

  async requestPermission(): Promise<PermissionState> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (this.permissionState !== null && this.permissionState !== 'default') {
      return this.permissionState;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission as PermissionState;
      logger.info(`Notification permission: ${permission}`);
      return this.permissionState;
    } catch (error) {
      logger.error('Error requesting notification permission', { error });
      this.permissionState = 'denied';
      return 'denied';
    }
  }

  getPermissionState(): PermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (this.permissionState === null) {
      this.permissionState = Notification.permission as PermissionState;
    }

    return this.permissionState;
  }

  validate(payload: NotificationPayload): boolean {
    if (!payload.title || !payload.body) {
      return false;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    return this.getPermissionState() === 'granted';
  }

  async send(payload: NotificationPayload): Promise<ProviderResult> {
    if (!this.validate(payload)) {
      const permission = this.getPermissionState();
      if (permission !== 'granted') {
        return {
          success: false,
          error: `Notification permission not granted: ${permission}`,
          retryable: false,
          errorCode: ErrorType.PERMISSION_DENIED,
        };
      }

      return {
        success: false,
        error: 'Invalid notification payload',
        retryable: false,
        errorCode: ErrorType.INVALID_PAYLOAD,
      };
    }

    try {
      const notification = await this.showNotification(payload);
      
      logger.info('Local notification sent successfully', {
        title: payload.title,
        tag: payload.tag,
      });

      return {
        success: true,
        messageId: notification?.tag || undefined,
      };
    } catch (error) {
      const errorType = errorHandler.handle(error);
      const retryable = errorHandler.isRetryable(error);

      logger.error('Failed to send local notification', { error, payload });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable,
        errorCode: errorType,
      };
    }
  }

  private async showNotification(payload: NotificationPayload): Promise<Notification | null> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/logo.png',
      badge: payload.badge || '/logo.png',
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      data: payload.data,
    };

    return new Notification(payload.title, options);
  }

  reset(): void {
    this.permissionState = null;
  }
}

export const localProvider = new LocalNotificationProvider();

