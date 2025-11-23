import type { Notification } from '../core/types';
import type { NotificationResult, SubscriptionResult } from '../core/result';
import { Platform } from '../platform/platform-detector';

export interface INotificationChannel {
  name: string;
  platform: Platform[];
  send(notification: Notification): Promise<NotificationResult>;
  isAvailable(): Promise<boolean>;
  subscribe(userId: string): Promise<SubscriptionResult>;
  unsubscribe(userId: string): Promise<void>;
  canSend(notification: Notification): boolean;
}

