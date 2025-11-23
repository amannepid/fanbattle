import { INotificationChannel } from './channel.interface';
import type { Notification } from '../core/types';
import { Platform, platformDetector } from '../platform/platform-detector';
import { channelFactory } from './channel-factory';
import { configManager } from '../config/config';
import { logger } from '../utils/logger';

export class ChannelSelector {
  select(
    notification: Notification,
    platform: Platform,
    availableChannels: INotificationChannel[]
  ): INotificationChannel | null {
    if (availableChannels.length === 0) {
      logger.warn('No available channels for platform', { platform });
      return null;
    }

    // Get channel priorities from config
    const config = configManager.get();
    
    // Sort channels by priority (lower number = higher priority)
    const sortedChannels = availableChannels
      .filter(channel => channel.canSend(notification))
      .sort((a, b) => {
        const priorityA = config.channels[a.name as keyof typeof config.channels]?.priority || 999;
        const priorityB = config.channels[b.name as keyof typeof config.channels]?.priority || 999;
        return priorityA - priorityB;
      });

    if (sortedChannels.length === 0) {
      logger.warn('No channels can send this notification', { notificationId: notification.id });
      return null;
    }

    const selected = sortedChannels[0];
    logger.debug(`Selected channel: ${selected.name}`, { 
      notificationId: notification.id,
      platform,
      availableChannels: sortedChannels.map(c => c.name)
    });

    return selected;
  }

  async selectWithFallback(
    notification: Notification,
    platform: Platform
  ): Promise<INotificationChannel[]> {
    const availableChannels = channelFactory.getForPlatform(platform);
    
    if (availableChannels.length === 0) {
      logger.warn('No channels available for platform', { platform });
      return [];
    }

    // Filter channels that can send this notification
    const capableChannels = availableChannels.filter(channel => 
      channel.canSend(notification)
    );

    if (capableChannels.length === 0) {
      logger.warn('No channels can send this notification', { notificationId: notification.id });
      return [];
    }

    // Get channel priorities from config
    const config = configManager.get();
    
    // Sort by priority (lower number = higher priority)
    const sortedChannels = capableChannels.sort((a, b) => {
      const priorityA = config.channels[a.name as keyof typeof config.channels]?.priority || 999;
      const priorityB = config.channels[b.name as keyof typeof config.channels]?.priority || 999;
      return priorityA - priorityB;
    });

    logger.debug(`Selected channels with fallback`, {
      notificationId: notification.id,
      platform,
      channels: sortedChannels.map(c => c.name),
      order: sortedChannels.map(c => ({
        name: c.name,
        priority: config.channels[c.name as keyof typeof config.channels]?.priority
      }))
    });

    return sortedChannels;
  }
}

export const channelSelector = new ChannelSelector();

