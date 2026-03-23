import type { Playwright } from "@playwright/test";

const base = (baseURL: string | undefined) =>
  (baseURL ?? "http://localhost:3000").replace(/\/$/, "");

/** Vent til Next dev svarer (mot flakiness ved minne-restart / ECONNREFUSED). */
export async function waitForDevHealth(
  playwright: Playwright,
  baseURL: string | undefined,
) {
  const ctx = await playwright.request.newContext({
    baseURL: base(baseURL),
    storageState: { cookies: [], origins: [] },
  });
  try {
    let lastErr: string | undefined;
    for (let i = 0; i < 12; i++) {
      try {
        const r = await ctx.get("/api/health", { timeout: 12_000 });
        if (r.ok()) return;
        lastErr = `HTTP ${r.status()}`;
      } catch (e) {
        lastErr = String(e);
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new Error(
      `Next dev svarer ikke på /api/health etter venting (${lastErr ?? "ukjent"}). ` +
        "Ofte: minne-restart midt i kjøring — bruk KP_TEST_FULL_RESTART_DEV=1 npm run test:full.",
    );
  } finally {
    await ctx.dispose();
  }
}

/**
 * Auth-setup / full-e2e: /api/health kan være 503 mens Next likevel serverer innlogging.
 * Vent til innloggingssiden svarer 200 (samme bar som full-e2e.sh app_is_ready_strict).
 */
export async function waitForInnloggingPageReady(
  playwright: Playwright,
  baseURL: string | undefined,
) {
  const root = base(baseURL);
  const ctx = await playwright.request.newContext({
    baseURL: root,
    storageState: { cookies: [], origins: [] },
  });
  try {
    let lastErr: string | undefined;
    for (let i = 0; i < 24; i++) {
      for (const path of ["/innlogging", "/no/innlogging"] as const) {
        try {
          const r = await ctx.get(path, { timeout: 15_000 });
          if (r.status() === 200) return;
          lastErr = `${path} HTTP ${r.status()}`;
        } catch (e) {
          lastErr = String(e);
        }
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new Error(
      `Innloggingsside svarer ikke 200 etter venting (${lastErr ?? "ukjent"}). ` +
        "Sjekk at next dev lytter på samme BASE_URL som Playwright.",
    );
  } finally {
    await ctx.dispose();
  }
}

/**
 * Gjest-side uten session: vent til signup-ruter svarer 200 (unngår ECONNREFUSED når next dev restarter).
 */
export async function waitForSignupPageReady(
  playwright: Playwright,
  baseURL: string | undefined,
) {
  const root = base(baseURL);
  const ctx = await playwright.request.newContext({
    baseURL: root,
    storageState: { cookies: [], origins: [] },
  });
  try {
    let lastErr: string | undefined;
    for (let i = 0; i < 24; i++) {
      for (const path of ["/no/signup", "/en/signup", "/signup"] as const) {
        try {
          const r = await ctx.get(path, { timeout: 15_000 });
          if (r.status() === 200) return;
          lastErr = `${path} HTTP ${r.status()}`;
        } catch (e) {
          lastErr = String(e);
        }
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new Error(
      `Signup-side svarer ikke 200 etter venting (${lastErr ?? "ukjent"}).`,
    );
  } finally {
    await ctx.dispose();
  }
}
