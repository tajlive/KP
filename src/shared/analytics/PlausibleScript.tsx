"use client";

import Script from "next/script";

const PLAUSIBLE_DOMAIN = "klarpakke.no";

/**
 * Loads Plausible Analytics via official script (no deprecated npm package).
 * Pageviews and outbound links are tracked automatically.
 * Custom events via window.plausible() from src/lib/analytics.ts.
 */
export function PlausibleScript() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <Script
      defer
      data-domain={PLAUSIBLE_DOMAIN}
      src="https://plausible.io/js/script.js"
      strategy="lazyOnload"
    />
  );
}
