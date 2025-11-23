import { Timestamp } from 'firebase/firestore';

export enum NotificationType {
  CUTOFF_REMINDER = 'cutoff_reminder',
  MATCH_AVAILABLE = 'match_available', // Future
  SCORE_UPDATE = 'score_update', // Future
  LEADERBOARD_UPDATE = 'leaderboard_update', // Future
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Notification {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  data: Record<string, any>;
  priority: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  createdAt?: Date;
}

export interface NotificationPreferences {
  cutoffReminders: boolean;
  matchAvailable: boolean; // Future
  scoreUpdates: boolean; // Future
  leaderboardUpdates: boolean; // Future
}

export interface NotificationStatus {
  enabled: boolean;
  permissionGranted: boolean;
  channels: {
    local?: { enabled: boolean; available: boolean };
    fcm?: { enabled: boolean; available: boolean; subscribed: boolean };
  };
  preferences: NotificationPreferences;
}

export interface NotificationContext {
  userId: string;
  matchId?: string;
  matchNumber?: number;
  tournamentId?: string;
  [key: string]: any;
}

