import { logger } from '../utils/logger';

export type NotificationEvent = 
  | 'permission_granted'
  | 'permission_denied'
  | 'token_refreshed'
  | 'notification_clicked'
  | 'notification_sent'
  | 'notification_failed'
  | 'subscription_success'
  | 'subscription_failed'
  | 'unsubscription_success';

export interface NotificationEventHandler {
  handle(event: NotificationEvent, data: any): Promise<void>;
}

export class NotificationEventBus {
  private handlers: Map<NotificationEvent, NotificationEventHandler[]> = new Map();

  on(event: NotificationEvent, handler: NotificationEventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    logger.debug(`Registered event handler for ${event}`);
  }

  off(event: NotificationEvent, handler: NotificationEventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
        logger.debug(`Unregistered event handler for ${event}`);
      }
    }
  }

  async emit(event: NotificationEvent, data: any): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    
    if (handlers.length === 0) {
      logger.debug(`No handlers for event ${event}`);
      return;
    }

    logger.debug(`Emitting event ${event}`, { data, handlerCount: handlers.length });

    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler.handle(event, data);
        } catch (error) {
          logger.error(`Error in event handler for ${event}`, { error, data });
        }
      })
    );
  }

  clear(event?: NotificationEvent): void {
    if (event) {
      this.handlers.delete(event);
      logger.debug(`Cleared handlers for event ${event}`);
    } else {
      this.handlers.clear();
      logger.debug('Cleared all event handlers');
    }
  }
}

export const eventBus = new NotificationEventBus();

