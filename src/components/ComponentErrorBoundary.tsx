"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `ComponentErrorBoundary [${this.props.name || "Component"}] caught error:`,
      error,
      errorInfo,
    );
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-xl border-2 border-dashed border-red-500/30 bg-red-500/5 flex flex-col items-center justify-center text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="font-bold text-red-500">Komponenten feilet</h3>
            <p className="text-sm text-red-400/80">
              Det oppstod en feil i {this.props.name || "denne modulen"}.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="border-red-500/50 hover:bg-red-500/10 text-red-500"
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Prøv igjen
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
