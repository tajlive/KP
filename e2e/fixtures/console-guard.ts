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
        const allowedPatterns = [
          /401|403|Unauthorized|Forbidden/i, // Auth errors (håndtert av UI)
          /JWT expired|Invalid Refresh Token|Auth session missing/i, // Supabase auth
          /hydrat|Hydration/i, // Next.js hydration (ofte tredjeparts)
          /ResizeObserver loop/i, // Browser quirk
          /fetch failed|NetworkError/i, // Nettverk (håndtert av retry)
          /[Klarpakke WARN]/, // Våre egne warnings (strukturert)
        ];

        if (allowedPatterns.some((p) => p.test(text))) return;

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
          `Console guard caught ${errors.length} unexpected error(s):\n  ${summary}`
        );
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
