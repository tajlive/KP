import { test as setup } from "@playwright/test";
import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const authFile = join(__dirname, "../.auth/user.json");

function appBaseUrl(): string {
  const b =
    process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.BASE_URL ||
    "http://localhost:3000";
  return b.replace(/\/$/, "");
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

setup("authenticate via login", async ({ page, context }) => {
  const authDir = dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.E2E_USER_EMAIL || process.env.TEST_USER_EMAIL;
  const password =
    process.env.E2E_USER_PASSWORD || process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.log("⚠️ Missing E2E credentials, saving empty auth state");
    await context.storageState({ path: authFile });
    return;
  }

  const base = appBaseUrl();
  const nextPath = "/no/dashboard";
  const loginUrl = `${base}/no/innlogging?next=${encodeURIComponent(nextPath)}`;

  let authed = false;

  console.log("🔐 Signing in via login form (SSR cookies)...");
  try {
    await page.goto(loginUrl, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });

    await page
      .locator("#innlogging-email")
      .waitFor({ state: "visible", timeout: 45_000 });

    await page.locator("#innlogging-email").fill(email);
    await page.locator("#innlogging-password").fill(password);

    await Promise.all([
      page.waitForURL((u) => isDashboardAuthedUrl(u.toString()), {
        timeout: 90_000,
      }),
      page.locator("form:has(#innlogging-email) button[type='submit']").click(),
    ]);

    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);

    authed = isDashboardAuthedUrl(page.url());
    console.log(
      `✅ Login form complete (authenticated: ${authed}), URL: ${page.url()}`,
    );
  } catch (e) {
    console.log(
      "⚠️ UI login failed:",
      e instanceof Error ? e.message : String(e),
    );
  }

  if (!authed) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      console.log("🔐 Fallback: password grant + localStorage seed...");
      try {
        const res = await fetch(
          `${supabaseUrl}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
            },
            body: JSON.stringify({ email, password }),
          },
        );

        if (res.ok) {
          const data = await res.json();
          const projectRef =
            supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || "";

          await page.goto(`${base}/no/innlogging`, {
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
          await page.waitForTimeout(2000);
          authed = isDashboardAuthedUrl(page.url());
          console.log(
            `✅ Fallback complete (authenticated: ${authed}), URL: ${page.url()}`,
          );
        } else {
          console.log("⚠️ Password grant failed:", res.status);
        }
      } catch (err) {
        console.log(
          "⚠️ Fallback error:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  await context.storageState({ path: authFile });
});
