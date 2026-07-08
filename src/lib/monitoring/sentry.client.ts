import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance: sample 10% of transactions (gratis tier)
    tracesSampleRate: 0.1,
    
    // Session replay: sample 10% (se hva brukeren gjorde før feil)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // Alltid replay ved feil
    
    // Miljø
    environment: process.env.NODE_ENV || "development",
    
    // Ignorer kjente støy-feil
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection",
    ],
    
    // Grupper feil fra samme release
    release: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    
    // Før feil sendes — legg til bruker-info hvis tilgjengelig
    beforeSend(event) {
      // Ikke send i dev
      if (process.env.NODE_ENV === "development") return null;
      
      // Ikke send hvis DSN mangler
      if (!SENTRY_DSN) return null;
      
      return event;
    },
  });
}
