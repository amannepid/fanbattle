import { INotificationScheduler } from './scheduler.interface';
import type { Notification } from '../core/types';
import { ruleEngine } from './rule-engine';
import { configManager } from '../config/config';
import { logger } from '../utils/logger';
import { NotificationManager } from '../core/notification-manager';

export class ClientNotificationScheduler implements INotificationScheduler {
  private intervalId?: NodeJS.Timeout;
  private scheduled: Map<string, Notification> = new Map();
  private isRunning: boolean = false;
  private manager?: NotificationManager;

  constructor(manager?: NotificationManager) {
    this.manager = manager;
  }

  start(intervalMs?: number): void {
    if (this.isRunning) {
      logger.warn('Client scheduler is already running');
      return;
    }

    const config = configManager.get();
    const interval = intervalMs || config.scheduling.checkInterval;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAndTrigger().catch(error => {
        logger.error('Error in scheduled check', { error });
      });
    }, interval);

    logger.info('Client notification scheduler started', { interval });
    
    // Run initial check
    this.checkAndTrigger().catch(error => {
      logger.error('Error in initial check', { error });
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    logger.info('Client notification scheduler stopped');
  }

  async schedule(notification: Notification, when: Date): Promise<string> {
    const now = new Date();
    const delay = when.getTime() - now.getTime();

    if (delay <= 0) {
      // Send immediately
      if (this.manager) {
        await this.manager.send(notification);
      }
      return notification.id;
    }

    this.scheduled.set(notification.id, notification);

    setTimeout(async () => {
      if (this.manager) {
        await this.manager.send(notification);
      }
      this.scheduled.delete(notification.id);
    }, delay);

    logger.debug('Scheduled notification', {
      notificationId: notification.id,
      scheduledFor: when.toISOString(),
      delayMs: delay,
    });

    return notification.id;
  }

  async cancel(scheduleId: string): Promise<void> {
    if (this.scheduled.delete(scheduleId)) {
      logger.debug('Cancelled scheduled notification', { scheduleId });
    }
  }

  async getScheduled(): Promise<Notification[]> {
    return Array.from(this.scheduled.values());
  }

  async checkAndTrigger(): Promise<void> {
    if (!this.manager) {
      logger.warn('Notification manager not set, cannot trigger notifications');
      return;
    }

    try {
      // Get context from manager (this should be provided by the manager)
      const context = await this.manager.getNotificationContext();
      if (!context) {
        return;
      }

      // Evaluate rules
      const notifications = await ruleEngine.evaluate(context);

      // Send notifications
      for (const notification of notifications) {
        try {
          await this.manager.send(notification);
          logger.info('Triggered scheduled notification', {
            notificationId: notification.id,
            type: notification.type,
          });
        } catch (error) {
          logger.error('Error sending scheduled notification', {
            error,
            notificationId: notification.id,
          });
        }
      }
    } catch (error) {
      logger.error('Error in checkAndTrigger', { error });
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  setManager(manager: NotificationManager): void {
    this.manager = manager;
  }
}

