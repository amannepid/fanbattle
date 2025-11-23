export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface ProviderResult {
  success: true;
  messageId?: string;
} | {
  success: false;
  error: string;
  retryable: boolean;
  errorCode?: string;
}

export interface INotificationProvider {
  send(payload: NotificationPayload): Promise<ProviderResult>;
  validate(payload: NotificationPayload): boolean;
}

