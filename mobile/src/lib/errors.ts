/**
 * Error Handling Utilities
 * Common error handling patterns and helpers
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', details?: any) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'PERMISSION_ERROR', 403, details);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof NetworkError ||
    error?.code === 'NETWORK_ERROR' ||
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch') ||
    error?.message?.toLowerCase().includes('timeout')
  );
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: any): boolean {
  return (
    error instanceof AuthError ||
    error?.code === 'AUTH_ERROR' ||
    error?.statusCode === 401 ||
    error?.message?.toLowerCase().includes('unauthorized') ||
    error?.message?.toLowerCase().includes('authentication')
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.error?.message) {
    return error.error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Log error to console (and external service in production)
 */
export function logError(error: any, context?: string) {
  const errorInfo = {
    message: getErrorMessage(error),
    context,
    stack: error?.stack,
    code: error?.code,
    statusCode: error?.statusCode,
    details: error?.details,
    timestamp: new Date().toISOString(),
  };

  console.error('[Error]', errorInfo);

  // TODO: Send to error tracking service (Sentry, etc.) in production
  if (!__DEV__) {
    // Example: Sentry.captureException(error, { contexts: { custom: errorInfo } });
  }
}

/**
 * Async error handler wrapper
 * Catches errors and provides fallback behavior
 */
export async function handleAsync<T>(
  promise: Promise<T>,
  errorHandler?: (error: any) => void,
): Promise<[T | null, any]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      logError(error);
    }
    return [null, error];
  }
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = isNetworkError,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, any>, requiredFields: string[]): void {
  const missing = requiredFields.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, { missing });
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
