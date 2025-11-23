import type { NotificationPreferences } from '../core/types';
import { Platform } from '../platform/platform-detector';
import { Timestamp } from 'firebase/firestore';

export interface NotificationSubscription {
  userId: string;
  channels: {
    local?: { enabled: boolean; token?: string };
    fcm?: { enabled: boolean; token: string; platform: Platform };
  };
  preferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  userId: string;
  enabled: boolean;
  reminderEnabled: boolean;
  matchAvailable: boolean;
  scoreUpdates: boolean;
  leaderboardUpdates: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  userId: string;
  notificationId: string;
  type: string;
  channel: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt?: Date;
  error?: string;
  retryCount: number;
  createdAt: Date;
}

export interface INotificationStorage {
  saveSubscription(subscription: NotificationSubscription): Promise<void>;
  getSubscription(userId: string): Promise<NotificationSubscription | null>;
  deleteSubscription(userId: string): Promise<void>;
  getAllSubscriptions(): Promise<NotificationSubscription[]>;
  savePreference(preference: NotificationPreference): Promise<void>;
  getPreference(userId: string): Promise<NotificationPreference | null>;
  saveNotificationLog(log: NotificationLog): Promise<void>;
  getNotificationLogs(userId: string, limit: number): Promise<NotificationLog[]>;
}

