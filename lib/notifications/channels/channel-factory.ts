import { INotificationChannel } from './channel.interface';
import { Platform } from '../platform/platform-detector';
import { logger } from '../utils/logger';

export class ChannelFactory {
  private channels: Map<string, INotificationChannel> = new Map();

  register(name: string, channel: INotificationChannel): void {
    if (this.channels.has(name)) {
      logger.warn(`Channel ${name} is already registered, overwriting`);
    }
    this.channels.set(name, channel);
    logger.debug(`Registered notification channel: ${name}`);
  }

  get(name: string): INotificationChannel | null {
    const channel = this.channels.get(name);
    if (!channel) {
      logger.warn(`Channel ${name} not found`);
    }
    return channel || null;
  }

  getForPlatform(platform: Platform): INotificationChannel[] {
    const availableChannels: INotificationChannel[] = [];
    
    for (const channel of this.channels.values()) {
      if (channel.platform.includes(platform)) {
        availableChannels.push(channel);
      }
    }

    return availableChannels;
  }

  getAll(): INotificationChannel[] {
    return Array.from(this.channels.values());
  }

  has(name: string): boolean {
    return this.channels.has(name);
  }

  unregister(name: string): void {
    if (this.channels.delete(name)) {
      logger.debug(`Unregistered notification channel: ${name}`);
    }
  }

  clear(): void {
    this.channels.clear();
    logger.debug('Cleared all notification channels');
  }
}

export const channelFactory = new ChannelFactory();

