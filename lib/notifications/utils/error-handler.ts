export enum ErrorType {
  PERMISSION_DENIED = 'permission_denied',
  NETWORK_ERROR = 'network_error',
  INVALID_TOKEN = 'invalid_token',
  RATE_LIMITED = 'rate_limited',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  INVALID_PAYLOAD = 'invalid_payload',
  UNKNOWN = 'unknown',
}

export type RecoveryStrategy = 
  | 'retry'
  | 'fallback_channel'
  | 'skip'
  | 'notify_user';

export class NotificationError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public retryable: boolean = false,
    public recoveryStrategy: RecoveryStrategy = 'skip',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export class NotificationErrorHandler {
  private errorPatterns: Map<RegExp, ErrorType> = new Map([
    [/permission/i, ErrorType.PERMISSION_DENIED],
    [/network|fetch|connection/i, ErrorType.NETWORK_ERROR],
    [/token|auth|unauthorized/i, ErrorType.INVALID_TOKEN],
    [/rate.?limit|429/i, ErrorType.RATE_LIMITED],
    [/service.?unavailable|503/i, ErrorType.SERVICE_UNAVAILABLE],
  ]);

  handle(error: Error | unknown): ErrorType {
    if (error instanceof NotificationError) {
      return error.type;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    
    for (const [pattern, errorType] of this.errorPatterns) {
      if (pattern.test(errorMessage)) {
        return errorType;
      }
    }

    return ErrorType.UNKNOWN;
  }

  isRetryable(error: Error | unknown): boolean {
    if (error instanceof NotificationError) {
      return error.retryable;
    }

    const errorType = this.handle(error);
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.RATE_LIMITED,
    ].includes(errorType);
  }

  getRecoveryStrategy(error: Error | unknown): RecoveryStrategy {
    if (error instanceof NotificationError) {
      return error.recoveryStrategy;
    }

    const errorType = this.handle(error);
    
    switch (errorType) {
      case ErrorType.PERMISSION_DENIED:
        return 'notify_user';
      case ErrorType.NETWORK_ERROR:
      case ErrorType.SERVICE_UNAVAILABLE:
        return 'retry';
      case ErrorType.INVALID_TOKEN:
        return 'fallback_channel';
      case ErrorType.RATE_LIMITED:
        return 'skip';
      default:
        return 'skip';
    }
  }

  createError(
    message: string,
    type: ErrorType,
    retryable: boolean = false,
    recoveryStrategy: RecoveryStrategy = 'skip',
    originalError?: Error
  ): NotificationError {
    return new NotificationError(message, type, retryable, recoveryStrategy, originalError);
  }
}

export const errorHandler = new NotificationErrorHandler();

