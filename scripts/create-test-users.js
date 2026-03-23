/**
 * Opprett / synk test-brukere i Supabase (Admin API)
 *
 * Bruk:
 *   node scripts/create-test-users.js                    # alle forhåndsdefinerte brukere
 *   node scripts/create-test-users.js --primary-only   # kun tom@klarpakke.no (rask lokal)
 *   node scripts/create-test-users.js --from-env       # E2E_USER_* + automatisk copy-leader (se deriveE2eCopyLeaderEmail)
 *
 * Krever (etter env-lasting, se under):
 *   NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Miljø lastes fra repo-root i rekkefølge (kun nøkler som ikke allerede er satt i shell/CI):
 *   .env → .env.local → .env.development.local → .env.production.local
 * (samme praksis som Next / playwright.config.ts)
 */
import dotenv from "dotenv";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { deriveE2eCopyLeaderEmail } from "./e2e-derive-copy-leader-email.mjs";

const REPO_ROOT = process.cwd();
const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
];

function loadRepositoryEnv() {
  for (const name of ENV_FILES) {
    const full = resolve(REPO_ROOT, name);
    if (!existsSync(full)) continue;
    try {
      const parsed = dotenv.parse(readFileSync(full, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        const cur = process.env[key];
        if (cur === undefined || cur === "") {
          process.env[key] = value;
        }
      }
    } catch (e) {
      console.warn(`⚠️  Kunne ikke parse ${name}:`, e?.message ?? e);
    }
  }
}

loadRepositoryEnv();

const args = new Set(process.argv.slice(2));
const FROM_ENV = args.has("--from-env");
const PRIMARY_ONLY = args.has("--primary-only");
const CHECK_ENV = args.has("--check-env");

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (CHECK_ENV) {
  const mask = (s) =>
    !s || s.length < 12 ? "(tom)" : `${s.slice(0, 6)}…${s.slice(-4)}`;
  console.log("E2E / provision — env-sjekk (masket):");
  console.log(
    `  NEXT_PUBLIC_SUPABASE_URL: ${mask(process.env.NEXT_PUBLIC_SUPABASE_URL || "")}`,
  );
  console.log(`  SUPABASE_URL: ${mask(process.env.SUPABASE_URL || "")}`);
  console.log(`  valgt URL: ${mask(SUPABASE_URL)}`);
  console.log(
    `  SUPABASE_SERVICE_ROLE_KEY: ${mask(process.env.SUPABASE_SERVICE_ROLE_KEY || "")}`,
  );
  console.log(
    `  E2E_USER_EMAIL: ${process.env.E2E_USER_EMAIL || "(ikke satt)"}`,
  );
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log(
      "\n❌ Mangler URL eller service role — se melding under ved provision.",
    );
    process.exit(1);
  }
  console.log("\n✅ Nok til create-test-users.js / Admin API");
  process.exit(0);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  const found = ENV_FILES.filter((n) => existsSync(resolve(REPO_ROOT, n)));
  console.error("❌ Mangler Supabase-URL eller SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error("   Forventet (etter lasting fra .env-filer):");
  console.error("   • NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_URL");
  console.error("   • SUPABASE_SERVICE_ROLE_KEY");
  console.error("");
  console.error(
    `   Fant env-filer: ${found.length ? found.join(", ") : "(ingen av .env / .env.local / …)"}`,
  );
  console.error("");
  console.error("   Gjør dette:");
  console.error("   1. cp .env.local.example .env.local");
  console.error(
    "   2. Lim inn URL + service_role fra Supabase → Project Settings → API",
  );
  console.error("   3. npm run test:e2e:provision:primary");
  console.error("");
  console.error(
    "   Tips: E2E_USER_EMAIL må stå i .env.local eller brukes som én linje:",
  );
  console.error(
    "   E2E_USER_EMAIL=tom@klarpakke.no E2E_USER_PASSWORD='…' npm run test:e2e:with-user",
  );
  process.exit(1);
}

const TEST_USERS = [
  {
    email: "tom@klarpakke.no",
    password: "TestPassword123!",
    options: {
      data: { display_name: "E2E Test User" },
      email_confirm: true,
    },
  },
  {
    email: "klarpakke.test+playwright@gmail.com",
    password: "bilglass123",
    options: {
      data: { display_name: "Test User A" },
      email_confirm: true,
    },
  },
  {
    email: "klarpakke.test+b@gmail.com",
    password: "bilglass123",
    options: {
      data: { display_name: "Test User B" },
      email_confirm: true,
    },
  },
];

async function createUser(user) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      ...user.options,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data.msg || data.message || JSON.stringify(data);
    if (
      typeof msg === "string" &&
      (msg.includes("already been registered") ||
        msg.includes("already exists"))
    ) {
      return { exists: true };
    }
    throw new Error(msg);
  }

  return data;
}

async function updateUserPassword(userId, password) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.msg || data.message || response.statusText);
  }
  return response.json();
}

/**
 * Sikrer én aktiv rad i leaderboard_bots for gitt auth user (discover / copy-trading E2E).
 */
async function ensureLeaderboardBotForUser(userId, displayName) {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };
  const check = await fetch(
    `${SUPABASE_URL}/rest/v1/leaderboard_bots?user_id=eq.${userId}&select=id`,
    { headers },
  );
  if (!check.ok) {
    console.warn("⚠️  Kunne ikke sjekke leaderboard_bots:", check.status);
    return;
  }
  const existing = await check.json();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(
      `✅ leaderboard_bots finnes allerede for ${userId.slice(0, 8)}…`,
    );
    return;
  }
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_bots`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      display_name: displayName,
      is_active: true,
      featured: true,
      sort_order: 1,
      pnl_30d: 10.5,
      pnl_90d: 14.2,
      pnl_all_time: 38,
      win_rate: 54,
      sharpe_ratio: 1.05,
      strategy_type: "Paper / demo",
      rank: 1,
      follower_count: 0,
    }),
  });
  if (!ins.ok) {
    const t = await ins.text();
    console.warn("⚠️  leaderboard_bots insert feilet:", ins.status, t);
    return;
  }
  console.log(
    `✅ Opprettet leaderboard_bots for «${displayName}» (${userId.slice(0, 8)}…)`,
  );
}

async function findUserByEmail(email) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
    },
  );
  if (!response.ok) throw new Error("Kunne ikke liste brukere");
  const { users } = await response.json();
  return users?.find((u) => u.email === email)?.id ?? null;
}

/**
 * Opprett eller synk én bruker (passord alltid satt til forventet verdi).
 * @returns {{ ok: boolean, error?: string }}
 */
async function upsertTestUser(user) {
  try {
    const result = await createUser(user);
    if (result.exists) {
      const uid = await findUserByEmail(user.email);
      if (uid) {
        await updateUserPassword(uid, user.password);
        console.log(`✅ Passord oppdatert for ${user.email}`);
      } else {
        console.warn(
          `⚠️  ${user.email} rapporteres som finnes, men ikke funnet i liste`,
        );
        return { ok: false, error: "User exists but not found in list" };
      }
    } else {
      console.log(`✅ Opprettet: ${user.email}`);
      console.log(`   ID: ${result.id}`);
    }
    return { ok: true };
  } catch (err) {
    console.error(`❌ Feil for ${user.email}:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function main() {
  if (FROM_ENV && PRIMARY_ONLY) {
    console.error("❌ Bruk enten --from-env eller --primary-only, ikke begge");
    process.exit(1);
  }

  if (FROM_ENV) {
    const email =
      process.env.E2E_USER_EMAIL?.trim() || process.env.TEST_USER_EMAIL?.trim();
    const password =
      process.env.E2E_USER_PASSWORD || process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      console.error(
        "❌ --from-env krever E2E_USER_EMAIL og E2E_USER_PASSWORD (eller TEST_USER_*)",
      );
      process.exit(1);
    }
    const display =
      process.env.E2E_USER_DISPLAY_NAME?.trim() || "E2E automation user";
    console.log("🔄 Provisjonering fra miljø (én bruker)…\n");
    const { ok, error } = await upsertTestUser({
      email,
      password,
      options: {
        data: { display_name: display },
        email_confirm: true,
      },
    });
    if (!ok) {
      console.error(error || "Ukjent feil");
      process.exit(1);
    }

    const autoLeaderOff =
      process.env.E2E_AUTO_COPY_LEADER === "0" ||
      process.env.E2E_AUTO_COPY_LEADER === "false";

    let leaderEmail = process.env.E2E_LEADER_EMAIL?.trim();
    let leaderPassword = process.env.E2E_LEADER_PASSWORD || password;

    if (!leaderEmail && !autoLeaderOff) {
      leaderEmail = deriveE2eCopyLeaderEmail(email) ?? undefined;
      if (leaderEmail) {
        console.log(
          `\n📎 Auto copy-leader e-post (ingen ekstra secret): ${leaderEmail}`,
        );
      }
    } else if (leaderEmail) {
      console.log("\n🔄 E2E copy-leader (E2E_LEADER_* / TEST_USER_B) …");
    }

    if (leaderEmail && leaderPassword) {
      if (leaderEmail.toLowerCase() === email.trim().toLowerCase()) {
        console.warn(
          "⚠️  Leder-e-post er lik E2E-bruker — hopper over leaderboard_bots-seed (kan ikke følge seg selv).",
        );
      } else {
        const leaderDisplay =
          process.env.E2E_LEADER_DISPLAY_NAME?.trim() || "E2E paper leader";
        const lr = await upsertTestUser({
          email: leaderEmail,
          password: leaderPassword,
          options: {
            data: { display_name: leaderDisplay },
            email_confirm: true,
          },
        });
        if (lr.ok) {
          const lid = await findUserByEmail(leaderEmail);
          if (lid) {
            await ensureLeaderboardBotForUser(lid, leaderDisplay);
          }
        } else {
          console.warn("⚠️  E2E-leader upsert feilet:", lr.error);
        }
      }
    } else if (!autoLeaderOff) {
      console.warn(
        "⚠️  Kunne ikke avlede copy-leader e-post (ugyldig E2E-e-post?). Sett E2E_LEADER_EMAIL eller bruk adresse med @ og local-part.",
      );
    }

    console.log(
      "\n📋 Klar for Playwright: sett samme e-post/passord i E2E_USER_* / GitHub secrets.",
    );
    return;
  }

  const list = PRIMARY_ONLY ? [TEST_USERS[0]] : TEST_USERS;
  console.log(
    `🔄 Oppretter / oppdaterer test-brukere i Supabase (${list.length} stk)…\n`,
  );

  let failed = 0;
  for (const user of list) {
    const { ok } = await upsertTestUser(user);
    if (!ok) failed += 1;
  }

  console.log("\n📋 Oppsummering (standard E2E):");
  console.log("   tom@klarpakke.no / TestPassword123!");
  console.log("   Bruker A: klarpakke.test+playwright@gmail.com / bilglass123");
  console.log("   Bruker B: klarpakke.test+b@gmail.com / bilglass123");
  console.log("\n   Verifiser: Supabase Dashboard → Authentication → Users");
  console.log(
    "\n   Lokalt: legg i .env.local → E2E_USER_EMAIL / E2E_USER_PASSWORD (samme som over)",
  );

  if (PRIMARY_ONLY && failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
