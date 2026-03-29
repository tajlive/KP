"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0b0d",
            padding: "24px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <AlertTriangle
              size={48}
              color="#ef4444"
              style={{ margin: "0 auto 24px" }}
            />
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "white",
                marginBottom: "12px",
              }}
            >
              Noe gikk galt
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Vi er varslet og jobber med det. Prøv å laste siden på nytt.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }}
              >
                Last inn på nytt
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  color: "#9ca3af",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#9ca3af";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                }}
              >
                Gå til forsiden
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
