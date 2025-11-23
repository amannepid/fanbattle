import { LogLevel } from '../utils/logger';

export interface NotificationConfig {
  channels: {
    local: { enabled: boolean; priority: number };
    fcm: { enabled: boolean; priority: number };
  };
  scheduling: {
    checkInterval: number; // milliseconds
    cutoffReminderHours: number;
  };
  retry: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  logging: {
    level: LogLevel;
    enabled: boolean;
  };
}

const DEFAULT_CONFIG: NotificationConfig = {
  channels: {
    local: { enabled: true, priority: 1 },
    fcm: { enabled: true, priority: 2 },
  },
  scheduling: {
    checkInterval: 15 * 60 * 1000, // 15 minutes
    cutoffReminderHours: 2,
  },
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  logging: {
    level: LogLevel.INFO,
    enabled: true,
  },
};

export class NotificationConfigManager {
  private config: NotificationConfig;

  constructor(initialConfig?: Partial<NotificationConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...initialConfig,
      channels: {
        ...DEFAULT_CONFIG.channels,
        ...initialConfig?.channels,
      },
      scheduling: {
        ...DEFAULT_CONFIG.scheduling,
        ...initialConfig?.scheduling,
      },
      retry: {
        ...DEFAULT_CONFIG.retry,
        ...initialConfig?.retry,
      },
      logging: {
        ...DEFAULT_CONFIG.logging,
        ...initialConfig?.logging,
      },
    };
  }

  get(): NotificationConfig {
    return { ...this.config };
  }

  update(updates: Partial<NotificationConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      channels: {
        ...this.config.channels,
        ...updates.channels,
      },
      scheduling: {
        ...this.config.scheduling,
        ...updates.scheduling,
      },
      retry: {
        ...this.config.retry,
        ...updates.retry,
      },
      logging: {
        ...this.config.logging,
        ...updates.logging,
      },
    };
  }

  validate(): boolean {
    try {
      // Validate channels
      if (this.config.channels.local.priority < 0 || this.config.channels.fcm.priority < 0) {
        return false;
      }

      // Validate scheduling
      if (this.config.scheduling.checkInterval < 0 || this.config.scheduling.cutoffReminderHours < 0) {
        return false;
      }

      // Validate retry
      if (
        this.config.retry.maxRetries < 0 ||
        this.config.retry.initialDelay < 0 ||
        this.config.retry.maxDelay < 0 ||
        this.config.retry.backoffMultiplier < 1
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Get config from environment variables
  static fromEnvironment(): NotificationConfig {
    const config: Partial<NotificationConfig> = {};

    // Parse environment variables if needed
    if (process.env.NEXT_PUBLIC_NOTIFICATION_CHECK_INTERVAL) {
      config.scheduling = {
        ...DEFAULT_CONFIG.scheduling,
        checkInterval: parseInt(process.env.NEXT_PUBLIC_NOTIFICATION_CHECK_INTERVAL, 10),
      };
    }

    if (process.env.NEXT_PUBLIC_NOTIFICATION_CUTOFF_HOURS) {
      config.scheduling = {
        ...(config.scheduling || DEFAULT_CONFIG.scheduling),
        cutoffReminderHours: parseInt(process.env.NEXT_PUBLIC_NOTIFICATION_CUTOFF_HOURS, 10),
      };
    }

    return new NotificationConfigManager(config).get();
  }
}

// Singleton instance
export const configManager = new NotificationConfigManager(
  typeof window !== 'undefined' 
    ? NotificationConfigManager.fromEnvironment()
    : undefined
);

