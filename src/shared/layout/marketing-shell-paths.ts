/**
 * Single source of truth for routes that render the full app chrome
 * (sidebar, dashboard, trading, checkout, etc.) instead of the marketing shell.
 *
 * Used by:
 * - src/app/[locale]/layout.tsx  – to decide isMarketing for provider tree
 * - src/shared/layout/MarketingShellClient.tsx – to hide marketing nav/footer
 */
export const APP_SHELL_PATHS: readonly string[] = [
  "/dashboard",
  "/copy-trading",
  "/marketplace",
  "/admin",
  "/checkout",
  "/onboarding",
  "/akademi",
  "/konto",
  "/handel",
  "/handelshistorikk",
  "/varsler",
  "/leagues",
  "/profile",
  "/quiz",
  "/innstillinger",
  "/callback",
  "/paper-trading",
  "/live-trading",
  "/auto-trading",
];

/** Returns true when `strippedPath` is (or lives under) an app-shell route. */
export function isAppShellPath(strippedPath: string): boolean {
  return APP_SHELL_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(`${p}/`),
  );
}
