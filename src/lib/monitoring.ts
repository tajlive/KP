/**
 * Client-side monitoring for Klarpakke
 * Integrates with Sentry for error tracking and custom monitoring
 */

import * as Sentry from '@sentry/nextjs';

export function initSentry(): void {
  if (typeof window === 'undefined') return;

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    
    // Low sample rate in production to avoid quota issues
    tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter out noise
    beforeSend(event) {
      // Ignore Safari ResizeObserver noise
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
        return null;
      }
      
      // Ignore network errors from Supabase Realtime reconnects
      if (event.exception?.values?.[0]?.type === 'NetworkError' ||
          event.exception?.values?.[0]?.value?.includes('aborted') ||
          event.exception?.values?.[0]?.value?.includes('fetch')) {
        return null;
      }
      
      // Ignore expected auth errors
      if (event.exception?.values?.[0]?.value?.includes('JWT expired') ||
          event.exception?.values?.[0]?.value?.includes('Invalid Refresh Token')) {
        return null;
      }
      
      return event;
    },
    
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    
    // Replay only on errors, not constantly
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}

export function captureError(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

interface ErrorReport {
  type: 'unhandled_error' | 'unhandled_rejection' | 'console_error' | 'fetch_error';
  message?: string;
  stack?: string;
  filename?: string;
  line?: number;
  column?: number;
  reason?: unknown;
  url: string;
  userAgent: string;
  timestamp: string;
}

interface MetricReport {
  type: 'navigation' | 'web_vital' | 'custom';
  name?: string;
  value?: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  url: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Queue for batching reports
const reportQueue: (ErrorReport | MetricReport)[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize monitoring on the client side
 */
export function initMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Track unhandled errors
  window.addEventListener('error', (event) => {
    reportError({
      type: 'unhandled_error',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
    });
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      type: 'unhandled_rejection',
      reason: event.reason,
    });
  });

  // Track performance metrics
  initPerformanceObserver();

  // Track Web Vitals (if available)
  initWebVitals();

  // Flush reports before page unload
  window.addEventListener('beforeunload', () => {
    flushReports();
  });
}

/**
 * Report an error
 */
function reportError(error: Omit<ErrorReport, 'url' | 'userAgent' | 'timestamp'>): void {
  const report: ErrorReport = {
    ...error,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Monitoring] Error:', report);
  }

  queueReport(report);
}

/**
 * Report a metric
 */
function reportMetric(metric: Omit<MetricReport, 'url' | 'timestamp'>): void {
  const report: MetricReport = {
    ...metric,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };

  queueReport(report);
}

/**
 * Queue a report for batch sending
 */
function queueReport(report: ErrorReport | MetricReport): void {
  reportQueue.push(report);

  // Debounce flush
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  flushTimeout = setTimeout(flushReports, 5000);

  // Flush immediately if queue is large
  if (reportQueue.length >= 10) {
    flushReports();
  }
}

/**
 * Flush all queued reports to the server
 */
async function flushReports(): Promise<void> {
  if (reportQueue.length === 0) return;

  const reports = [...reportQueue];
  reportQueue.length = 0;

  try {
    // Use sendBeacon for reliability during page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ reports })], {
        type: 'application/json',
      });
      navigator.sendBeacon('/api/monitoring', blob);
    } else {
      await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
        keepalive: true,
      });
    }
  } catch (e) {
    // Silent fail - don't cause infinite error loops
    if (process.env.NODE_ENV === 'development') {
      console.error('[Monitoring] Failed to flush reports:', e);
    }
  }
}

/**
 * Initialize Performance Observer for navigation and metrics
 */
function initPerformanceObserver(): void {
  if (!('PerformanceObserver' in window)) return;

  // Observe navigation timing
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;
          reportMetric({
            type: 'navigation',
            name: 'page_load',
            value: nav.loadEventEnd - nav.startTime,
            metadata: {
              ttfb: nav.responseStart - nav.requestStart,
              domLoad: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
              fcp: nav.responseEnd - nav.startTime,
            },
          });
        }
      }
    });
    observer.observe({ entryTypes: ['navigation'] });
  } catch (e) {
    // Navigation timing not supported
  }

  // Observe LCP (Largest Contentful Paint)
  try {
    let lcpValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcpValue = lastEntry.startTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Report LCP when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && lcpValue > 0) {
        reportMetric({
          type: 'web_vital',
          name: 'LCP',
          value: lcpValue,
          rating: lcpValue < 2500 ? 'good' : lcpValue < 4000 ? 'needs-improvement' : 'poor',
        });
      }
    });
  } catch (e) {
    // LCP not supported
  }

  // Observe CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as any as { hadRecentInput?: boolean; value: number };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Report CLS when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && clsValue > 0) {
        reportMetric({
          type: 'web_vital',
          name: 'CLS',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
        });
      }
    });
  } catch (e) {
    // CLS not supported
  }
}

/**
 * Initialize Web Vitals reporting (if web-vitals library is available)
 */
function initWebVitals(): void {
  // This will be populated if you add the web-vitals library
  // For now, we rely on the PerformanceObserver above
}

/**
 * Track a custom event
 */
export function trackEvent(
  name: string,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  reportMetric({
    type: 'custom',
    name,
    metadata,
  });
}

/**
 * Track an error manually
 */
export function trackError(
  message: string,
  stack?: string,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  reportError({
    type: 'console_error',
    message,
    stack,
    ...metadata,
  });
}
