import type { Notification, NotificationContext } from '../core/types';
import { logger } from '../utils/logger';

export interface NotificationRule {
  name: string;
  evaluate(context: NotificationContext): Promise<boolean>;
  getNotification(context: NotificationContext): Promise<Notification | null>;
}

export class RuleEngine {
  private rules: NotificationRule[] = [];

  register(rule: NotificationRule): void {
    if (this.rules.find(r => r.name === rule.name)) {
      logger.warn(`Rule ${rule.name} is already registered, overwriting`);
    }
    this.rules.push(rule);
    logger.debug(`Registered notification rule: ${rule.name}`);
  }

  unregister(ruleName: string): void {
    const index = this.rules.findIndex(r => r.name === ruleName);
    if (index >= 0) {
      this.rules.splice(index, 1);
      logger.debug(`Unregistered notification rule: ${ruleName}`);
    }
  }

  async evaluate(context: NotificationContext): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const rule of this.rules) {
      try {
        const shouldNotify = await rule.evaluate(context);
        if (shouldNotify) {
          const notification = await rule.getNotification(context);
          if (notification) {
            notifications.push(notification);
            logger.debug(`Rule ${rule.name} generated notification`, {
              notificationId: notification.id,
              userId: context.userId,
            });
          }
        }
      } catch (error) {
        logger.error(`Error evaluating rule ${rule.name}`, { error, context });
      }
    }

    return notifications;
  }

  getRules(): NotificationRule[] {
    return [...this.rules];
  }

  clear(): void {
    this.rules = [];
    logger.debug('Cleared all notification rules');
  }
}

export const ruleEngine = new RuleEngine();

