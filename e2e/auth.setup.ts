import {
  expect,
  test as setup,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";
import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { waitForInnloggingPageReady } from "./helpers/wait-for-dev-health";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, "../.auth/user.json");

const EMPTY_STORAGE_STATE = JSON.stringify({ cookies: [], origins: [] });

function writeEmptyAuthFile() {
  const authDir = dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  fs.writeFileSync(authFile, EMPTY_STORAGE_STATE, "utf8");
}

async function persistStorageStateSafe(context: {
  storageState: (o: { path: string }) => Promise<void>;
}) {
  try {
    await context.storageState({ path: authFile });
  } catch (e) {
    console.log(
      "⚠️ storageState feilet (kontekst lukket / timeout) — skriver tom auth-fil:",
      e instanceof Error ? e.message : String(e),
    );
    writeEmptyAuthFile();
  }
}

function appBaseUrl(): string {
  const b =
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000";
  return b.replace(/\/$/, "");
}

/** Pause uten page.waitForTimeout — unngår «Target closed» ved avbrudd (Ctrl+C) mens siden er lukket. */
function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * InnloggingClient bruker kontrollert state (value + onChange). Playwright `fill()` kan oppdatere DOM
 * uten at React state følger med → submitEmailLogin ser tom streng og isValidEmail feiler
 * («Vennligst skriv inn en gyldig e-postadresse»).
 */
async function typeIntoControlledInput(locator: Locator, value: string) {
  await locator.click({ timeout: 15_000 });
  await locator.clear();
  if (value.length === 0) return;
  await locator.pressSequentially(value, { delay: 12 });
}

/**
 * Controlled `<Input value={email} onChange=…>`: verken pressSequentially (@ korrupt) eller fill()
 * garanterer at React state oppdateres. Sett value + bubbles input (samme som brukertasting).
 */
async function fillEmailControlledInput(locator: Locator, value: string) {
  await locator.click({ timeout: 15_000 });
  await locator.clear();
  if (value.length === 0) return;
  await locator.evaluate((el, v: string) => {
    const input = el as HTMLInputElement;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

/** GoTrue passord-innlogging: POST mot …/auth/v1/token (uavhengig av query / host). */
function isGoTruePasswordTokenResponse(res: Response): boolean {
  if (res.request().method() !== "POST") return false;
  try {
    const p = new URL(res.url()).pathname.toLowerCase();
    if (p.includes("/auth/v1/token")) return true;
  } catch {
    /* ignore */
  }
  const ul = res.url().toLowerCase();
  const base = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (base && res.url().startsWith(base) && ul.includes("token")) return true;
  if (ul.includes("grant_type=password") && ul.includes("token")) return true;
  return false;
}

async function logVisibleLoginError(page: Page) {
  try {
    if (page.isClosed()) return;
    const box = page.getByTestId("auth-error");
    if ((await box.count()) === 0) return;
    const txt = (
      await box
        .first()
        .innerText()
        .catch(() => "")
    ).trim();
    if (txt)
      console.log("   Innloggingsside (feilmelding):", txt.slice(0, 400));
  } catch {
    // Side/kontekst lukket (avbrudd / teardown) — ignorer
  }
}

/** True when URL looks like an authenticated dashboard (any locale). */
function isDashboardAuthedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const p = u.pathname;
    return (
      p.includes("dashboard") &&
      !p.includes("innlogging") &&
      !p.includes("login")
    );
  } catch {
    return false;
  }
}

setup("authenticate via login", async ({ page, context, playwright }) => {
  // Job-timeout er 12 min (inkl. ~4 min install). Test-budsjett 7 min slik at
  // en fremtidig heng FEILER ærlig i stedet for å bli kansellert av jobben.
  setup.setTimeout(420_000);

  const authDir = dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = (
    process.env.E2E_USER_EMAIL ||
    process.env.TEST_USER_EMAIL ||
    ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");
  const password = (
    process.env.E2E_USER_PASSWORD ||
    process.env.TEST_USER_PASSWORD ||
    ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!email || !password) {
    await persistStorageStateSafe(context);
    throw new Error(
      "Playwright setup: sett E2E_USER_EMAIL og E2E_USER_PASSWORD (f.eks. i .env.local i repo-roten). " +
        "Uten dem lagres tom .auth/user.json og @auth-tester skipper eller feiler uklart. " +
        "Sjekk miljø: npm run test:e2e:check-env — kjør Next på port 3000 før setup.",
    );
  }

  const base = appBaseUrl();
  /** Kanonisk for localePrefix as-needed (no): /dashboard — matcher sanitizeClientRedirect + middleware. */
  const nextPath = "/dashboard";
  const loginUrl = `${base}/no/login?next=${encodeURIComponent(nextPath)}`;

  let authed = false;

  try {
    const maxUiAttempts = 3;
    for (let attempt = 1; attempt <= maxUiAttempts && !authed; attempt++) {
      if (attempt > 1) {
        console.log(
          `🔐 UI login retry ${attempt}/${maxUiAttempts} (venter 3s, laster innlogging på nytt)…`,
        );
        await delayMs(3000);
        if (page.isClosed()) break;
      }
      console.log("🔐 Signing in via login form (SSR cookies)…");
      try {
        // full-e2e: unngå goto mens next dev ikke lytter (net::ERR_CONNECTION_REFUSED).
        // /api/health kan være 503 — innlogging 200 er sterkere signal (matcher full-e2e.sh).
        await waitForInnloggingPageReady(playwright, base);

        // KRITISK (2026-08-10): domcontentloaded er for tidlig i prod — React
        // hydration har ikke bundet onSubmit ennå, og skjemaet (uten method="post")
        // faller tilbake til native GET-submit med passord i URL. Vent på
        // networkidle + verifiser at React faktisk har hydrert (fiber på form)
        // før vi fyller inn og klikker.
        await page.goto(loginUrl, {
          waitUntil: "networkidle",
          timeout: 90_000,
        });

        const emailInput = page.locator('input[name="email"]').first();
        await emailInput.waitFor({ state: "visible", timeout: 45_000 });

        // Vent til React-hydration er ferdig: form må ha reactProps med onSubmit.
        // Uten dette blir klikket en native GET-submit (credentials i URL).
        await page
          .waitForFunction(
            () => {
              const form = document.querySelector("form");
              if (!form) return false;
              const propsKey = Object.keys(form).find((k) =>
                k.startsWith("__reactProps"),
              );
              const props = propsKey
                ? (form as unknown as Record<string, { onSubmit?: unknown }>)[
                    propsKey
                  ]
                : null;
              return Boolean(props && typeof props.onSubmit === "function");
            },
            { timeout: 30_000 },
          )
          .catch(() => {
            console.log(
              "⚠️ React-hydration ikke verifisert innen 30s — fortsetter likevel (fallback håndterer)",
            );
          });

        await fillEmailControlledInput(emailInput, email);
        await expect(emailInput).toHaveValue(email, { timeout: 10_000 });

        const passwordInput = page.locator('input[name="password"]').first();
        await typeIntoControlledInput(passwordInput, password);
        await expect(passwordInput).toHaveValue(password, { timeout: 10_000 });
        await delayMs(200);

        // method="post" on the form prevents accidental GET submit (credentials in query string).
        const submitBtn = page.locator('button[type="submit"]').first();

        const responsePromise = page.waitForResponse(
          (res) => isGoTruePasswordTokenResponse(res),
          { timeout: 90_000 },
        );
        await submitBtn.click();

        let tokenRes: Response | null = null;
        try {
          tokenRes = await responsePromise;
        } catch {
          tokenRes = null;
        }

        if (!tokenRes) {
          await delayMs(2500);
          await logVisibleLoginError(page);
        }

        if (tokenRes) {
          const st = tokenRes.status();
          console.log(`🔐 Supabase token response: HTTP ${st}`);
          if (!tokenRes.ok()) {
            const snippet = (await tokenRes.text().catch(() => "")).slice(
              0,
              200,
            );
            if (snippet) console.log("   Body (trim):", snippet);
            if (
              st === 401 ||
              snippet.toLowerCase().includes("invalid api key")
            ) {
              console.log(
                "   → Kjør `npm run test:e2e:check-env` (anon + URL + service_role må være samme Supabase-prosjekt). Restart `npm run dev` etter du endrer NEXT_PUBLIC_*.",
              );
            }
          }
        } else {
          console.log(
            "⚠️ Did not observe Supabase token POST (feil port 3000 vs Next på 3001? full-e2e frigjør nå port og bruker --port. Eller gammel .env / restart dev — se trace).",
          );
        }

        // 2026-08-10 (CI-fiks): Verifiser sesjon via /api/auth/me i stedet
        // for å vente på UI-redirect til dashboard. Reprodusert heng både i
        // CI og lokalt: token 200 → evig venting på waitForURL (jobben ble
        // kansellert ved 12-min timeout, aldri en ærlig feilmelding).
        // goto har hard timeout, og auth-sjekken er det vi faktisk skal bevise.
        await page.goto(`${base}/no/dashboard`, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });

        const meStatus = await page.evaluate(async () => {
          try {
            const r = await fetch("/api/auth/me", { credentials: "include" });
            return r.status;
          } catch {
            return 0;
          }
        });
        authed = meStatus === 200;
        console.log(
          `✅ Login form complete (forsøk ${attempt}/${maxUiAttempts}, authenticated: ${authed}), URL: ${page.url()}`,
        );
      } catch (e) {
        console.log(
          `⚠️ UI login failed (forsøk ${attempt}/${maxUiAttempts}):`,
          e instanceof Error ? e.message : String(e),
        );
        await logVisibleLoginError(page);
      }
    }

    if (!authed) {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY;
      const serviceRoleKey = (
        process.env.SUPABASE_SERVICE_ROLE_KEY || ""
      ).trim();

      if (supabaseUrl && (supabaseAnonKey || serviceRoleKey)) {
        console.log("🔐 Fallback: password grant + localStorage seed...");
        try {
          const tokenKeys = [supabaseAnonKey, serviceRoleKey].filter(
            (k): k is string => Boolean(k && k.length > 0),
          );
          let grantText: string | null = null;
          let grantOk = false;
          let grantStatus = 0;
          for (const key of tokenKeys) {
            const attempt = await fetch(
              `${supabaseUrl}/auth/v1/token?grant_type=password`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: key,
                  Authorization: `Bearer ${key}`,
                },
                body: JSON.stringify({ email, password }),
              },
            );
            const bodyText = await attempt.text();
            grantStatus = attempt.status;
            if (attempt.ok) {
              grantText = bodyText;
              grantOk = true;
              break;
            }
            const invalidKey =
              attempt.status === 401 &&
              bodyText.includes("Invalid API key") &&
              key === supabaseAnonKey &&
              Boolean(serviceRoleKey);
            if (invalidKey) {
              console.log(
                "⚠️ Anon key rejected for password grant — prøver service_role (kun E2E-node, ikke nettleser)",
              );
              continue;
            }
            grantText = bodyText;
            break;
          }

          if (grantOk && grantText) {
            const data = JSON.parse(grantText) as {
              access_token: string;
              refresh_token: string;
              expires_at?: number;
              expires_in?: number;
              token_type?: string;
              user?: unknown;
            };
            const projectRef =
              supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || "";

            await page.goto(`${base}/no/login`, {
              waitUntil: "domcontentloaded",
            });

            const storageKey = `sb-${projectRef}-auth-token`;
            await page.evaluate(
              ({ key, session }) => {
                localStorage.setItem(key, JSON.stringify(session));
              },
              {
                key: storageKey,
                session: {
                  access_token: data.access_token,
                  refresh_token: data.refresh_token,
                  expires_at: data.expires_at,
                  expires_in: data.expires_in,
                  token_type: data.token_type,
                  user: data.user,
                },
              },
            );

            await page.reload({ waitUntil: "networkidle" });
            await page.goto(`${base}/no/dashboard`, {
              waitUntil: "networkidle",
              timeout: 45_000,
            });
            await delayMs(2000);
            authed = isDashboardAuthedUrl(page.url());
            console.log(
              `✅ Fallback complete (authenticated: ${authed}), URL: ${page.url()}`,
            );
          } else {
            const errText = grantText ?? "";
            console.log(
              "⚠️ Password grant failed:",
              grantStatus,
              errText ? errText.slice(0, 180) : "",
            );
            if (errText.includes("Invalid API key")) {
              console.log(
                "   Hint: `npm run test:e2e:check-env` — anon/service_role og URL må være fra samme prosjekt (Dashboard → Settings → API). Playwright og Next leser .env-filer med samme prioritering. Restart `npm run dev` etter du endrer NEXT_PUBLIC_*.",
              );
            }
          }
        } catch (err) {
          console.log(
            "⚠️ Fallback error:",
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  } finally {
    await persistStorageStateSafe(context);
    // Verifiser at auth-filen faktisk ble skrevet — uten den feiler
    // alle etterfølgende @auth-tester med kryptisk ENOENT.
    if (!fs.existsSync(authFile)) {
      console.error(
        `❌ auth.setup.ts fullførte uten å skrive ${authFile}. ` +
          `Dette betyr at context.storageState() feilet stille. ` +
          `Sjekk at E2E_USER_EMAIL/E2E_USER_PASSWORD er korrekte og at ` +
          `innlogging faktisk lyktes (se logg over).`,
      );
      process.exitCode = 1;
    } else {
      console.log(`✅ Auth state persisted to ${authFile}`);
    }
  }
});
