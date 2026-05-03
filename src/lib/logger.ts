/**
 * Logger for Klarpakke
 * Håndholder logging med environment-support
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.debug('[Klarpakke DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]) => {
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
      // eslint-disable-next-line no-console
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  },

  time: (label: string) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment) {
      // eslint-disable-next-line no-console
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
