import type { Notification } from '../core/types';
import { logger } from '../utils/logger';

export class NotificationClickHandler {
  handle(notification: Notification): void {
    try {
      const data = notification.data;
      
      if (data?.url) {
        this.navigateToUrl(data.url);
      } else if (data?.matchId) {
        this.navigateToMatch(data.matchId);
      } else {
        this.openApp();
      }

      logger.info('Notification clicked', {
        notificationId: notification.id,
        type: notification.type,
        url: data?.url,
      });
    } catch (error) {
      logger.error('Error handling notification click', { error, notification });
    }
  }

  private navigateToMatch(matchId: string): void {
    if (typeof window !== 'undefined') {
      window.location.href = `/predict/${matchId}`;
    }
  }

  private navigateToUrl(url: string): void {
    if (typeof window !== 'undefined') {
      // If URL is relative, use current origin
      if (url.startsWith('/')) {
        window.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    }
  }

  private openApp(): void {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}

export const clickHandler = new NotificationClickHandler();

