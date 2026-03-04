// Client-side error reporting to admin dashboard
// ⚠️ TEMPORARILY DISABLED - potential infinite loop issue with database failures

interface ErrorReport {
  errorType: 'javascript' | 'network' | 'api' | 'react' | 'other';
  errorMessage: string;
  errorStack?: string;
  componentName?: string;
  severity?: 'warning' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
}

let userId: string | null = null;

// Set user ID for error reports
export function setErrorReportingUser(id: string | null) {
  userId = id;
}

// Report error to admin dashboard
// ⚠️ TEMPORARILY DISABLED - all errors logged to console only
export async function reportError(error: ErrorReport): Promise<void> {
  // Disabled to prevent infinite loop when database is down
  console.error('[Error Report - DISABLED]:', error);
  return;
}

// Global error handler for uncaught JS errors
// ⚠️ TEMPORARILY DISABLED - potential infinite loop with fetch wrapper
export function initGlobalErrorHandling() {
  // DISABLED: This function caused infinite API call loops when database was unavailable
  // The fetch wrapper would report API errors, but if error-report API also failed,
  // it would create cascading failures.
  
  console.info('[Global Error Handling] DISABLED to prevent infinite loops');
  return;
  
  /*
  if (typeof window === 'undefined') return;

  // Uncaught JS errors
  window.addEventListener('error', (event) => {
    reportError({
      errorType: 'javascript',
      errorMessage: event.message || 'Unknown error',
      errorStack: event.error?.stack,
      severity: 'error',
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    reportError({
      errorType: 'javascript',
      errorMessage: error?.message || 'Unhandled Promise Rejection',
      errorStack: error?.stack,
      severity: 'warning',
    });
  });

  // Network error detection
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      
      // Log API errors (4xx, 5xx)
      if (!response.ok && args[0]?.toString().includes('/api/')) {
        reportError({
          errorType: 'api',
          errorMessage: `API Error ${response.status}: ${response.statusText}`,
          severity: response.status >= 500 ? 'error' : 'warning',
          metadata: {
            endpoint: args[0],
            method: args[1]?.method || 'GET',
            status: response.status,
          },
        });
      }
      
      return response;
    } catch (error: any) {
      // Network errors (offline, DNS, etc.)
      reportError({
        errorType: 'network',
        errorMessage: error?.message || 'Network request failed',
        severity: 'warning',
        metadata: {
          endpoint: args[0],
          method: args[1]?.method || 'GET',
        },
      });
      throw error;
    }
  };
  */
}
