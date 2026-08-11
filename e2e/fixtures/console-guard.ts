import { test as base } from "@playwright/test";

/**
 * Console Guard Fixture — feiler testen hvis uventede console.error/warn logges.
 *
 * Bruk: `import { test } from "../fixtures/console-guard";`
 *
 * Unntak (forventede feil som skal ignoreres):
 * - 401/403 auth-feil (bruker ikke logget inn)
 * - Next.js hydration warnings
 * - Supabase auth session mangler
 */
export const test = base.extend<{
  consoleGuard: void;
}>({
  consoleGuard: [
    async ({ page }, use) => {
      const errors: { type: string; text: string; location: string }[] = [];

      page.on("console", (msg) => {
        const type = msg.type();
        if (type !== "error" && type !== "warning") return;

        const text = msg.text();

        // Allow-list: forventede feil som ikke indikerer bugs
        // KRITISK: "Supabase er ikke konfigurert" er IKKE i allow-list — skal faile testen
        const allowedPatterns = [
          /401|403|Unauthorized|Forbidden/i, // Auth errors (håndtert av UI)
          /JWT expired|Invalid Refresh Token|Auth session missing|Using the user object as returned from supabase\.auth\.getSession/i, // Supabase auth
          // 404 fra /api/paper-trading/balance = bevisst API-kontrakt for
          // «bruker uten aktiv paper-sesjon» (NO_SESSION) — ny bruker er
          // legitim tilstand; klienten håndterer 404 eksplisitt (useHasTraded).
          // MERK: resource-load-feil har URL-en i msg.location().url, IKKE i
          // msg.text() — URL-basert regex (03a7adbb) matchet aldri → gate rød.
          /hydrat|Hydration/i, // Next.js hydration (ofte tredjeparts)
          /ResizeObserver loop/i, // Browser quirk
          /fetch failed|NetworkError|Failed to fetch/i, // Nettverk (håndtert av retry)
          /\[Klarpakke WARN\]/, // Våre egne warnings (strukturert)
          /preloaded using link preload but not used/i, // Chrome preload warnings (non-blocking)
          /WebSocket is closed before the connection is established/i, // Supabase realtime close race on test teardown
          /Avregistrerte gammel service worker|service worker/i, // Service worker lifecycle
          // Next.js image aspect-ratio warning for known payment SVGs rendered with CSS sizing.
          // Exact observed messages (dev-only, no runtime impact; components unchanged by recent work):
          //   Image with src ".../images/payments/stripe.svg" has either width or height modified...
          //   Image with src ".../images/payments/apple-pay.svg" has either width or height modified...
          //   Image with src ".../images/payments/paypal.svg" has either width or height modified...
          //   Image with src ".../brand/payments/paypal.svg" has either width or height modified...
          /Image with src ".*\/(?:images|brand)\/payments\/(?:stripe|apple-pay|paypal)\.svg" has either width or height modified.*to maintain the aspect ratio/i,
        ];

        // Location-aware unntak: resource-load-feil («Failed to load resource»)
        // har URL-en i msg.location().url, ikke i msg.text(). 404 fra
        // /api/paper-trading/balance er bevisst API-kontrakt (NO_SESSION).
        const locationUrl = msg.location()?.url ?? "";
        const isAllowed =
          allowedPatterns.some((p) => p.test(text)) ||
          (/Failed to load resource: the server responded with a status of 404/i.test(
            text,
          ) &&
            locationUrl.includes("/api/paper-trading/balance"));

        if (isAllowed) return;

        const location = msg.location()
          ? `${msg.location().url}:${msg.location().lineNumber}`
          : "unknown";

        errors.push({ type, text, location });
      });

      await use();

      // After test: fail if any unexpected console errors were captured
      if (errors.length > 0) {
        const summary = errors
          .map((e) => `[${e.type.toUpperCase()}] ${e.text} at ${e.location}`)
          .join("\n  ");
        throw new Error(
          `Console guard caught ${errors.length} unexpected error(s):\n  ${summary}`,
        );
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
