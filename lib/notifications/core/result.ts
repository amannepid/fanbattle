export type NotificationResult = 
  | { success: true; channel: string; sentAt: Date; notificationId?: string }
  | { success: false; error: string; retryable: boolean; channel?: string; errorCode?: string };

export type SubscriptionResult = 
  | { success: true; token?: string; subscriptionId?: string }
  | { success: false; error: string; retryable: boolean };

export type ProviderResult = 
  | { success: true; messageId?: string }
  | { success: false; error: string; retryable: boolean; errorCode?: string };

export function createSuccessResult(channel: string, notificationId?: string): NotificationResult {
  return {
    success: true,
    channel,
    sentAt: new Date(),
    notificationId,
  };
}

export function createErrorResult(
  error: string,
  retryable: boolean = false,
  channel?: string,
  errorCode?: string
): NotificationResult {
  return {
    success: false,
    error,
    retryable,
    channel,
    errorCode,
  };
}

