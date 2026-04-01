'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '@/lib/error-reporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Report to admin dashboard
    reportError({
      errorType: 'react',
      errorMessage: error.message,
      errorStack: `${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}`,
      componentName: errorInfo.componentStack?.split('\n')[0]?.trim() || 'Unknown',
      severity: 'error',
    }).catch(console.error);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl p-6 border border-red-500/30 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Noe gikk galt
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Vi har logget feilen og vil fikse den så snart som mulig.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Last siden på nytt
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
