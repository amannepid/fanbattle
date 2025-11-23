import type { Notification } from '../core/types';

export interface INotificationScheduler {
  schedule(notification: Notification, when: Date): Promise<string>;
  cancel(scheduleId: string): Promise<void>;
  getScheduled(): Promise<Notification[]>;
  checkAndTrigger(): Promise<void>;
}

