/**
 * Client-side monitoring for Klarpakke
 * Minimal error tracking and performance observation uten Sentry-spesifikke features.
 */

import * as Sentry from '@/lib/sentry';

export function initSentry(): void {
  if (typeof window === 'undefined') return;
  // GlitchTip/Sentry SDK init er nå håndtert av @/lib/sentry-wrapper.
  // Ingen Sentry-spesifikke integrasjoner (browserTracingIntegration, replay) aktiveres lenger.
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

  // Send til GlitchTip-wrapper i produksjon (i stedet for død /api/monitoring-endepunkt)
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(
      new Error(report.message || 'Unhandled monitoring error'),
      { extra: { ...(report as unknown as Record<string, unknown>) } },
    );
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
 * Flush all queued reports.
 * Tidligere sendt til /api/monitoring; nå logges kun lokalt / til GlitchTip.
 */
async function flushReports(): Promise<void> {
  if (reportQueue.length === 0) return;

  const reports = [...reportQueue];
  reportQueue.length = 0;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[Monitoring] Flush:', reports);
  }

  // GlitchTip-rapportering håndteres per-event i reportError for å unngå dobbelt-logging.
  void reports;
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
        const layoutShiftEntry = entry as unknown as { hadRecentInput?: boolean; value: number };
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
