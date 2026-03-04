'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error tracking service
    console.error('ErrorBoundary caught error:', error, errorInfo)
    
    // Send to Sentry if available
    const win = window as typeof window & { Sentry?: { captureException: (error: Error, options: { extra: Record<string, unknown> }) => void } };
    if (typeof window !== 'undefined' && win.Sentry) {
      win.Sentry.captureException(error, {
        extra: { 
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    // Class component can't use hooks; extract locale from URL path
    const localeMatch = window.location.pathname.match(/^\/(no|en|th|zh)\//);
    window.location.href = `/${localeMatch ? localeMatch[1] : 'no'}/`
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <svg 
                className="w-20 h-20 mx-auto text-red-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Noe gikk galt
            </h1>
            <p className="text-slate-400 mb-8">
              Vi beklager, men det oppstod en feil. Vårt team har blitt varslet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Last siden på nytt
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
              >
                Gå til forsiden
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-slate-900 rounded-lg text-left overflow-auto">
                <p className="text-red-400 font-mono text-sm">
                  {this.state.error.message}
                </p>
                <pre className="text-slate-500 font-mono text-xs mt-2">
                  {this.state.error.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
