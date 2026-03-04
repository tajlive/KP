/**
 * Error Boundary Components
 * Catch React errors and display user-friendly messages
 */

'use client';

import { ReactNode, Component, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/error-handling';

// ============================================================
// ERROR BOUNDARY CLASS COMPONENT
// ============================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: this.state.errorCount + 1,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.retry} />;
    }

    return this.props.children;
  }
}

// ============================================================
// DEFAULT ERROR FALLBACK UI
// ============================================================

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

export function DefaultErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-lg border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h1 className="text-lg font-semibold text-slate-900">
            Oops! Something went wrong
          </h1>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          We encountered an unexpected error. Our team has been notified.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-slate-100 rounded border border-slate-300">
            <p className="text-xs font-mono text-slate-700 break-all">
              {error.message}
            </p>
          </div>
        )}

        <Button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>

        <Button
          variant="ghost"
          onClick={() => window.location.href = '/'}
          className="w-full mt-2"
        >
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ASYNC ERROR BOUNDARY (FOR ASYNC COMPONENTS)
// ============================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, retry: () => void) => ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
