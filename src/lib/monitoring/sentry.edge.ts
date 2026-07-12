/**
 * Sentry edge — optimalisert for minimal kostnad
 * 
 * Edge kjører på CF Workers — veldig lav sample rate
 */

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN && process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "production",
    release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
    tracesSampleRate: 0.01, // Edge: 1% (kostnadskontroll)

    // Ikke injiser <meta name="sentry-trace"> i HTML
    tracePropagationTargets: [],

    ignoreErrors: [
      "NetworkError",
      "fetch failed",
      "Unexpected end of JSON input",
    ],
    
    beforeSend(event) {
      // Edge: kun send exceptions, ikke transactions
      if (event.type === "transaction") return null;
      return event;
    },
  });
}

// Edge middleware — wrap for auto-error capture
// Bruk sentry.edge.init + auto-instrumentering

