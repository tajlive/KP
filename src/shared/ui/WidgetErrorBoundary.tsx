"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  message?: string;
  retryLabel?: string;
  onReset?: () => void;
  resetKeys?: Array<string | number | undefined>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Compact error boundary for individual dashboard widgets.
 *
 * Catches render errors in a single widget so a failure in one chart/card
 * does not break the whole page. Shows a friendly, non-technical card with
 * a retry button.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  State
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[WidgetErrorBoundary] Widget crashed:", error, errorInfo);
  }

  componentDidUpdate(prevProps: WidgetErrorBoundaryProps) {
    const { resetKeys } = this.props;
    if (
      this.state.hasError &&
      resetKeys &&
      prevProps.resetKeys &&
      resetKeys.length === prevProps.resetKeys.length &&
      resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])
    ) {
      this.setState({ hasError: false, error: null });
      this.props.onReset?.();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                {this.props.title ?? "Noe gikk galt"}
              </h4>
              <p className="text-xs text-red-600 dark:text-red-300/80 mt-1 leading-relaxed">
                {this.props.message ??
                  "Vi kunne ikke vise denne widgeten akkurat nå. Prøv på nytt, eller last siden på nytt hvis problemet vedvarer."}
              </p>
              <button
                onClick={this.handleReset}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-800/40 hover:bg-red-200 dark:hover:bg-red-800/60 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {this.props.retryLabel ?? "Prøv igjen"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;
