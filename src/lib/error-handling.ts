/**
 * Comprehensive Error Handling System
 * Handles API errors, form validation, and user feedback
 */

import { z } from 'zod';

// ============================================================
// ERROR TYPES
// ============================================================

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super('VALIDATION_ERROR', message, 400, errors);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT', message, 429);
    this.name = 'RateLimitError';
  }
}

// ============================================================
// ERROR MESSAGES
// ============================================================

const ERROR_MESSAGES: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input and try again',
  'AUTH_ERROR': 'You need to log in to continue',
  'NOT_FOUND': 'The resource you are looking for was not found',
  'RATE_LIMIT': 'Too many requests. Please try again later',
  'NETWORK_ERROR': 'Network connection failed. Please check your internet',
  'SERVER_ERROR': 'Something went wrong. Please try again later',
  'DATABASE_ERROR': 'Database operation failed. Please try again',
  'PAYMENT_ERROR': 'Payment processing failed. Please try again',
  'UNKNOWN_ERROR': 'An unexpected error occurred',
};

// ============================================================
// ERROR UTILS
// ============================================================

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return ERROR_MESSAGES[error.code] || error.message;
  }

  if (error instanceof z.ZodError) {
    const fieldError = error.issues[0];
    return `${fieldError.path.join('.')}: ${fieldError.message}`;
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return ERROR_MESSAGES['NETWORK_ERROR'];
    }
    return error.message;
  }

  return ERROR_MESSAGES['UNKNOWN_ERROR'];
}

export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code;
  }
  if (error instanceof z.ZodError) {
    return 'VALIDATION_ERROR';
  }
  if (error instanceof Error) {
    return error.name;
  }
  return 'UNKNOWN_ERROR';
}

export function formatValidationErrors(
  error: z.ZodError
): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });
  return formatted;
}

// ============================================================
// ASYNC WRAPPER WITH ERROR HANDLING
// ============================================================

export async function tryCatch<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<[T | undefined, AppError | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const appError = error instanceof AppError ? error : parseError(error);
    if (fallback) {
      return [fallback, appError];
    }
    return [undefined, appError];
  }
}

export function parseError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof z.ZodError) {
    return new ValidationError(
      'Validation failed',
      formatValidationErrors(error)
    );
  }
  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new AppError(
        'NETWORK_ERROR',
        'Network connection failed',
        0,
        { originalError: error.message }
      );
    }
    return new AppError('SERVER_ERROR', error.message, 500, {
      originalError: error.message,
    });
  }
  return new AppError('UNKNOWN_ERROR', 'An unknown error occurred', 500);
}

// ============================================================
// SUPABASE ERROR HANDLER
// ============================================================

export function handleSupabaseError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const errorStr = String(error);

  if (errorStr.includes('JWT expired')) {
    return new AuthError('Your session has expired. Please log in again');
  }

  if (errorStr.includes('User not found')) {
    return new NotFoundError('User not found');
  }

  if (errorStr.includes('constraint')) {
    return new ValidationError('This record already exists');
  }

  if (errorStr.includes('FOREIGN KEY')) {
    return new AppError(
      'REFERENCE_ERROR',
      'Referenced record does not exist',
      400
    );
  }

  return parseError(error);
}

// ============================================================
// API ERROR HANDLER
// ============================================================

export async function handleApiError(response: Response): Promise<AppError> {
  try {
    const data = await response.json();

    if (response.status === 401) {
      return new AuthError(data.message || 'Authentication required');
    }

    if (response.status === 404) {
      return new NotFoundError(data.message || 'Resource not found');
    }

    if (response.status === 429) {
      return new RateLimitError(data.message || 'Too many requests');
    }

    if (response.status === 400 && data.errors) {
      return new ValidationError(
        data.message || 'Validation failed',
        data.errors
      );
    }

    if (response.status >= 500) {
      return new AppError(
        'SERVER_ERROR',
        data.message || 'Server error',
        response.status
      );
    }

    return new AppError(
      'API_ERROR',
      data.message || 'API request failed',
      response.status
    );
  } catch {
    return new AppError(
      'API_ERROR',
      `HTTP ${response.status}: ${response.statusText}`,
      response.status
    );
  }
}

// ============================================================
// LOGGER
// ============================================================

export const logger = {
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    console.error(message, { error, context });
    // Here you would integrate with Sentry
    if (typeof window !== 'undefined') {
      // Client-side error logging
    }
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(message, context);
  },
  info: (message: string, context?: Record<string, unknown>) => {
    console.info(message, context);
  },
};

export default {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  RateLimitError,
  getErrorMessage,
  getErrorCode,
  formatValidationErrors,
  tryCatch,
  parseError,
  handleSupabaseError,
  handleApiError,
  logger,
};
