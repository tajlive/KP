/**
 * Logger for Klarpakke
 * Håndholder logging med environment-support
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug('[Klarpakke DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]) => {
    console.info('[Klarpakke INFO]', ...args);
  },

  warn: (...args: unknown[]) => {
    console.warn('[Klarpakke WARN]', ...args);
  },

  error: (...args: unknown[]) => {
    console.error('[Klarpakke ERROR]', ...args);

    // Send to error tracking service if configured
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Can integrate Sentry here
    }
  },

  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },

  // Log auth events
  auth: (event: string, details?: unknown) => {
    logger.info(`[Auth] ${event}`, details || '');
  },

  // Log API calls
  api: (method: string, endpoint: string, status?: number) => {
    logger.debug(
      `[API] ${method} ${endpoint}${status ? ` (${status})` : ''}`
    );
  },

  // Log Webflow events
  webflow: (event: string, details?: unknown) => {
    logger.info(`[Webflow] ${event}`, details || '');
  },
};
