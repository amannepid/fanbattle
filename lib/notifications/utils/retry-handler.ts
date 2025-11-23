import { logger } from './logger';
import { LogLevel } from './logger';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryable?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

export class RetryHandler {
  async execute<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;
    let delay = opts.initialDelay;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 0) {
          logger.info(`Operation succeeded after ${attempt} retries`);
        }
        return result;
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (opts.retryable && !opts.retryable(error)) {
          logger.debug('Error is not retryable, stopping retries', { error });
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === opts.maxRetries) {
          logger.error(`Operation failed after ${attempt + 1} attempts`, { error });
          throw error;
        }

        // Calculate delay with exponential backoff
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);

        logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`,
          { error }
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const retryHandler = new RetryHandler();

