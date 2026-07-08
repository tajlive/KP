"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
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

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: 40, textAlign: "center", fontFamily: "system-ui",
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12,
          margin: 24,
        }}>
          <p style={{ color: "#991b1b", fontWeight: 600, fontSize: 16 }}>Noe gikk galt med denne seksjonen</p>
          <p style={{ color: "#7f1d1d", fontSize: 14, marginTop: 8 }}>
            Vi har fått beskjed og jobber med saken. Resten av siden fungerer som normalt.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
