"use client";

import { captureException } from "@/lib/sentry";
import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName = this.props.name || "Unknown";

    // Log to console for dev debugging
    if (process.env.NODE_ENV === "development") {
      console.error(
        `ErrorBoundary [${componentName}] caught error:`,
        error,
        errorInfo,
      );
    }

    // Report to GlitchTip
    captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        componentName,
      },
      tags: {
        component: componentName,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback (e.g. for component-level boundaries)
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Full-page error fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
          <div className="text-center max-w-sm">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-6" />
            <h1 className="text-lg font-bold text-white mb-3">Noe gikk galt</h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Vi er varslet og jobber med det. Prøv å laste siden på nytt.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Last inn på nytt
              </button>
              <a
                href="/"
                className="px-6 py-3 bg-transparent text-gray-400 hover:text-white border border-white/20 hover:border-white/40 rounded-lg text-sm font-medium transition-all"
              >
                Gå til forsiden
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
