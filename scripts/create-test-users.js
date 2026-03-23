/**
 * Opprett / synk test-brukere i Supabase (Admin API)
 *
 * Bruk:
 *   node scripts/create-test-users.js                    # alle forhåndsdefinerte brukere
 *   node scripts/create-test-users.js --primary-only   # kun tom@klarpakke.no (rask lokal)
 *   node scripts/create-test-users.js --from-env       # E2E_USER_* + automatisk copy-leader (se deriveE2eCopyLeaderEmail)
 *   node scripts/create-test-users.js --report         # Auth vs user_profiles (exit 1 ved hull) — mer kontroll
 *   node scripts/create-test-users.js --profiles-only # Kun user_profiles, ingen passord-endring
 *   node scripts/create-test-users.js --help
 *
 * Krever (etter env-lasting, se under):
 *   NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Miljø lastes som Next.js `next dev` / playwright.config: siste fil vinner.
 * Rekkefølge: .env.production.local (kun hull) → .env → .env.development →
 *   .env.local → .env.development.local
 */
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { deriveE2eCopyLeaderEmail } from "./e2e-derive-copy-leader-email.mjs";

const REPO_ROOT = process.cwd();

/** Samme prioritering som playwright.config.ts (unngår at .env «låser» nyere .env.local). */
function loadRepositoryEnv() {
  const fillMissingOnly = [".env.production.local"];
  const overwriteChain = [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
  ];

  for (const name of fillMissingOnly) {
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

  for (const name of overwriteChain) {
    const full = resolve(REPO_ROOT, name);
    if (!existsSync(full)) continue;
    try {
      const parsed = dotenv.parse(readFileSync(full, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        process.env[key] = value;
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
const REPORT = args.has("--report") || args.has("--status");
const PROFILES_ONLY = args.has("--profiles-only");
const HELP = args.has("--help") || args.has("-h");

if (HELP) {
  console.log(`
create-test-users.js — E2E-brukere i Supabase (service role)

Standard (Auth + passord + user_profiles-rad):
  node scripts/create-test-users.js
  node scripts/create-test-users.js --primary-only

Miljø (én bruker + valgfri copy-leader):
  node scripts/create-test-users.js --from-env

Kontroll / uten passord-synk:
  node scripts/create-test-users.js --report           # tabell + exit 1 hvis auth eller profil mangler
  node scripts/create-test-users.js --report --primary-only
  node scripts/create-test-users.js --profiles-only    # bare fyll inn manglende user_profiles

Annet:
  node scripts/create-test-users.js --check-env
  npm run test:e2e:users:report
  npm run test:e2e:users:profiles-only

Merk: Klarpakke Admin → Brukere leser user_profiles. Auth-dashboard er egen liste.
`);
  process.exit(0);
}

function maskKey(s) {
  return !s || s.length < 12 ? "(tom)" : `${s.slice(0, 6)}…${s.slice(-4)}`;
}

/** Supabase JWT (anon/service_role) har `ref` = prosjekt-ref i URL, `role` = anon | service_role. */
function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  try {
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function decodeJwtRef(token) {
  const p = decodeJwtPayload(token);
  return typeof p?.ref === "string" ? p.ref.toLowerCase() : null;
}

function refFromSupabaseUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.trim().match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return m ? m[1].toLowerCase() : null;
}

async function runCheckEnv() {
  const SUPABASE_URL = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
  const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  console.log("E2E / provision — env-sjekk (masket):");
  console.log(
    `  NEXT_PUBLIC_SUPABASE_URL: ${maskKey(process.env.NEXT_PUBLIC_SUPABASE_URL || "")}`,
  );
  console.log(`  SUPABASE_URL: ${maskKey(process.env.SUPABASE_URL || "")}`);
  console.log(`  valgt URL: ${maskKey(SUPABASE_URL)}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${maskKey(anon)}`);
  console.log(
    `  SUPABASE_SERVICE_ROLE_KEY: ${maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY || "")}`,
  );
  console.log(
    `  E2E_USER_EMAIL: ${process.env.E2E_USER_EMAIL || "(ikke satt)"}`,
  );

  const urlRef = refFromSupabaseUrl(SUPABASE_URL);
  const anonRef = decodeJwtRef(anon);
  const srRef = decodeJwtRef(SERVICE_ROLE_KEY);
  const anonPayload = anon ? decodeJwtPayload(anon) : null;
  const srPayload = SERVICE_ROLE_KEY
    ? decodeJwtPayload(SERVICE_ROLE_KEY)
    : null;

  if (anon) {
    console.log(
      `  anon JWT-lengde: ${anon.length} tegn (typisk ~200–450; for kort/lang → feilkopi)`,
    );
    const ar = anonPayload?.role;
    if (ar && ar !== "anon") {
      console.log(
        `\n❌ NEXT_PUBLIC_SUPABASE_ANON_KEY har JWT role="${ar}" (forventet "anon").`,
      );
      if (ar === "service_role") {
        console.log(
          "   Du har sannsynligvis limt inn service_role-nøkkelen i anon-feltet. Bytt plass eller kopier «anon public» fra Dashboard → Settings → API.",
        );
      }
      process.exit(1);
    }
  }
  if (SERVICE_ROLE_KEY) {
    const rr = srPayload?.role;
    if (rr && rr !== "service_role") {
      console.log(
        `\n❌ SUPABASE_SERVICE_ROLE_KEY har JWT role="${rr}" (forventet "service_role"). Sjekk at du ikke har byttet om med anon.`,
      );
      process.exit(1);
    }
  }

  if (urlRef) {
    console.log(`  prosjekt-ref fra URL: ${urlRef}`);
    if (anonRef && anonRef !== urlRef) {
      console.log(
        "\n❌ Anon-nøkkel (JWT ref) og URL peker på ulike Supabase-prosjekter.",
      );
      console.log(`   JWT ref: ${anonRef}  —  URL ref: ${urlRef}`);
      console.log(
        "   Lim inn anon + URL fra samme prosjekt: Dashboard → Project Settings → API.",
      );
      process.exit(1);
    }
    if (srRef && srRef !== urlRef) {
      console.log(
        "\n❌ Service role (JWT ref) og URL peker på ulike Supabase-prosjekter.",
      );
      console.log(`   JWT ref: ${srRef}  —  URL ref: ${urlRef}`);
      process.exit(1);
    }
    if (anon && !anonRef) {
      console.log(
        "\n⚠️  Kunne ikke lese `ref` fra anon-nøkkel (ikke standard JWT?) — hopper over ref-sjekk.",
      );
    }
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.log(
      "\n❌ Mangler URL eller service role — se melding under ved provision.",
    );
    process.exit(1);
  }

  async function restProbe(key) {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 12_000);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        signal: ac.signal,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      });
      return r.status;
    } finally {
      clearTimeout(to);
    }
  }

  if (anon) {
    try {
      const srStatus = await restProbe(SERVICE_ROLE_KEY);
      console.log(`  PostgREST med service_role: HTTP ${srStatus}`);

      const anonStatus = await restProbe(anon);
      console.log(`  PostgREST med anon: HTTP ${anonStatus}`);

      if (anonStatus === 401) {
        console.log("\n❌ PostgREST avviser anon-nøkkel (401).");
        if (srStatus !== 401 && srStatus < 500) {
          console.log(
            "   Service role fungerer mot samme URL → prosjektet er riktig; anon-strengen er sannsynligvis avkortet, utdatert eller feilkopiert.",
          );
          console.log(
            "   Manuelt: kopier «anon public» på nytt fra Supabase → Project Settings → API (én sammenhengende linje, ingen mellomrom/linjeskift).",
          );
          console.log(
            "   Automatisk (anbefalt hvis du har PAT): legg SUPABASE_ACCESS_TOKEN i .env.local, deretter:",
          );
          console.log("     npm run env:sync:supabase:verify");
          console.log(
            "   (skriver URL + anon + service_role fra Management API inn i .env.local — se scripts/sync-supabase-env.mjs)",
          );
        } else {
          console.log(
            "   Sjekk også URL og at prosjektet ikke er pauset; verifiser nøkler i samme Dashboard-prosjekt.",
          );
        }
        console.log(
          "   Etter du retter .env.local: stopp og start `npm run dev` på nytt (NEXT_PUBLIC_* leses ved oppstart).",
        );
        process.exit(1);
      }
      console.log(
        `\n  PostgREST anon: OK (HTTP ${anonStatus}, forventet ikke 401)`,
      );
    } catch (e) {
      console.log(
        "\n⚠️  Kunne ikke nå PostgREST (nettverk/URL):",
        e instanceof Error ? e.message : e,
      );
    }
  } else {
    console.log(
      "\n⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY mangler — nødvendig for innlogging i nettleser og Playwright.",
    );
  }

  console.log(
    "\n✅ Nok til create-test-users.js / Admin API (og anon ser gyldig ut)",
  );
  process.exit(0);
}

if (CHECK_ENV) {
  await runCheckEnv();
}

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  const envCandidates = [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
    ".env.production.local",
  ];
  const found = envCandidates.filter((n) => existsSync(resolve(REPO_ROOT, n)));
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

/**
 * True når PostgREST eksponerer `user_id` (standard-API ignorerer ukjente JSON-felt → NOT NULL på user_id).
 * @returns {Promise<{ visible: boolean, bodySnippet: string }>}
 */
async function postgrestUserProfilesUserIdSelectable(headers) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?select=user_id&limit=1`,
    { headers },
  );
  const text = await r.text();
  return { visible: r.ok, bodySnippet: text.slice(0, 220) };
}

/**
 * Noen databaser bruker kun `id` (= auth.users.id). Andre har egen rad-PK `id` + NOT NULL `user_id` → auth.users.
 */
async function userProfileRowExists(userId, headers) {
  const base = `${SUPABASE_URL}/rest/v1/user_profiles`;
  const byId = await fetch(`${base}?id=eq.${userId}&select=id`, { headers });
  if (!byId.ok) return { ok: false, status: byId.status };
  const rowsId = await byId.json();
  if (Array.isArray(rowsId) && rowsId.length > 0) {
    return { ok: true, exists: true };
  }
  const byUserId = await fetch(`${base}?user_id=eq.${userId}&select=id`, {
    headers,
  });
  if (!byUserId.ok) {
    if (byUserId.status === 400) return { ok: true, exists: false };
    return { ok: false, status: byUserId.status };
  }
  const rowsUid = await byUserId.json();
  return {
    ok: true,
    exists: Array.isArray(rowsUid) && rowsUid.length > 0,
  };
}

/**
 * Klarpakke Admin → Brukere leser `user_profiles` (RLS), ikke bare auth.users.
 * Sikrer rad slik at testbrukere vises etter provision.
 *
 * Remote skjema varierer: subscription_status, user_id, full_name vs display_name, tier vs subscription_tier.
 */
async function ensureUserProfileRow(userId, user) {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };
  const check = await userProfileRowExists(userId, headers);
  if (!check.ok) {
    console.warn("⚠️  user_profiles-oppslag feilet:", check.status);
    return;
  }
  if (check.exists) {
    return;
  }

  const uidPostgrest = await postgrestUserProfilesUserIdSelectable(headers);
  const userIdInPostgrest = uidPostgrest.visible;

  const display = user.options?.data?.display_name || user.email.split("@")[0];
  const now = new Date().toISOString();
  const profilePk = randomUUID();

  /** @type {Array<Record<string, unknown>>} */
  const attemptsWithUserId = [
    {
      id: userId,
      user_id: userId,
      email: user.email,
      full_name: display,
      role: "user",
      subscription_tier: "student",
      subscription_status: "inactive",
      created_at: now,
      updated_at: now,
    },
    {
      id: userId,
      user_id: userId,
      email: user.email,
      full_name: display,
      role: "user",
      subscription_tier: "student",
      created_at: now,
      updated_at: now,
    },
    {
      id: userId,
      user_id: userId,
      email: user.email,
      full_name: display,
      role: "user",
      created_at: now,
      updated_at: now,
    },
    {
      id: userId,
      user_id: userId,
      display_name: display,
      tier: "free",
      created_at: now,
      updated_at: now,
    },
    {
      id: userId,
      user_id: userId,
      display_name: display,
    },
    {
      id: profilePk,
      user_id: userId,
      display_name: display,
      tier: "free",
      created_at: now,
      updated_at: now,
    },
  ];

  /** Eldre tabell: kun `id` (= auth), ingen `user_id`-kolonne i API */
  const attemptsLegacy = [{ id: userId, display_name: display }];

  const attempts = userIdInPostgrest ? attemptsWithUserId : attemptsLegacy;

  if (!userIdInPostgrest) {
    console.warn(
      `⚠️  GET user_profiles?select=user_id feilet — PostgREST har sannsynligvis ikke user_id i cache. ` +
        `INSERT uten synlig user_id gir ofte 23502. Kjør mot DB: NOTIFY pgrst, 'reload schema'; ` +
        `eller ./scripts/sql.sh file supabase/migrations/20260323140000_reconcile_user_profiles_schema.sql ` +
        `(DATABASE_URL / DATABASE_URL_MIGRATION i .env.local). Svar: ${uidPostgrest.bodySnippet}`,
    );
  }

  for (let i = 0; i < attempts.length; i++) {
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Prefer: "handling=strict,return=minimal",
      },
      body: JSON.stringify(attempts[i]),
    });
    if (ins.ok) {
      console.log(
        `✅ user_profiles-rad opprettet for ${user.email} (Admin-liste, variant ${i + 1})`,
      );
      return;
    }
    const t = await ins.text();
    const isLast = i === attempts.length - 1;
    const pgrstUnknown =
      ins.status === 400 &&
      typeof t === "string" &&
      t.includes("schema cache") &&
      t.includes("Could not find");
    const userIdViolatesNn =
      ins.status === 400 &&
      typeof t === "string" &&
      t.includes('"code":"23502"') &&
      t.includes("user_id");
    if (!isLast && (pgrstUnknown || userIdViolatesNn)) {
      continue;
    }
    if (isLast) {
      console.warn(
        `⚠️  user_profiles INSERT for ${user.email} feilet:`,
        ins.status,
        t,
      );
    }
  }
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

function restHeaders() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };
}

/** @returns {Promise<{ ok: true, exists: boolean } | { ok: false, status: number }>} */
async function hasUserProfileRow(userId) {
  return userProfileRowExists(userId, restHeaders());
}

/**
 * Skriv oversiktlig tabell; returner antall avvik (for exit code).
 * @param {Array<{ email: string, options?: { data?: { display_name?: string } } }>} userList
 */
async function runUserReport(userList) {
  console.log(
    "\n📊 Rapport: Supabase Auth vs public.user_profiles\n" +
      "   • Dashboard → Authentication → Users  = auth.users\n" +
      "   • Klarpakke Admin → Brukere            = user_profiles (må finnes for hver auth-id)\n",
  );
  const rows = [];
  let problems = 0;
  for (const u of userList) {
    const email = u.email;
    let uid;
    try {
      uid = await findUserByEmail(email);
    } catch (e) {
      rows.push({
        email,
        auth: "FEIL",
        profile: "—",
        note: e?.message ?? String(e),
      });
      problems++;
      continue;
    }
    if (!uid) {
      rows.push({ email, auth: "NEI", profile: "—", note: "mangler i Auth" });
      problems++;
      continue;
    }
    const pr = await hasUserProfileRow(uid);
    if (!pr.ok) {
      rows.push({
        email,
        auth: `${uid.slice(0, 8)}…`,
        profile: "?",
        note: `user_profiles REST ${pr.status}`,
      });
      problems++;
      continue;
    }
    if (!pr.exists) {
      rows.push({
        email,
        auth: `${uid.slice(0, 8)}…`,
        profile: "NEI",
        note: "mangler profil → ikke i Admin-brukerliste",
      });
      problems++;
    } else {
      rows.push({
        email,
        auth: `${uid.slice(0, 8)}…`,
        profile: "JA",
        note: "",
      });
    }
  }

  const cw = { e: 40, a: 12, p: 8, n: 42 };
  console.log(
    `${"e-post".padEnd(cw.e)} | ${"auth id".padEnd(cw.a)} | ${"profil".padEnd(cw.p)} | merknad`,
  );
  console.log("-".repeat(cw.e + cw.a + cw.p + cw.n + 12));
  for (const r of rows) {
    console.log(
      `${r.email.slice(0, cw.e).padEnd(cw.e)} | ${String(r.auth).padEnd(cw.a)} | ${String(r.profile).padEnd(cw.p)} | ${r.note}`,
    );
  }
  console.log("");
  if (problems > 0) {
    console.log(
      "🔧 Fiks:\n" +
        "   node scripts/create-test-users.js              # full (passord + profiler)\n" +
        "   node scripts/create-test-users.js --profiles-only   # kun user_profiles\n" +
        "   Eller i app: Admin → Brukere → «Synk brukere fra Auth»\n",
    );
  } else {
    console.log(
      "✅ Alle listede e-poster har Auth-rad og user_profiles-rad.\n",
    );
  }
  return problems;
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
        await ensureUserProfileRow(uid, user);
      } else {
        console.warn(
          `⚠️  ${user.email} rapporteres som finnes, men ikke funnet i liste`,
        );
        return { ok: false, error: "User exists but not found in list" };
      }
    } else {
      const newId = result.id;
      console.log(`✅ Opprettet: ${user.email}`);
      console.log(`   ID: ${newId}`);
      if (newId) {
        await ensureUserProfileRow(newId, user);
      }
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

  if (REPORT && PROFILES_ONLY) {
    console.error("❌ Bruk kun én av --report og --profiles-only");
    process.exit(1);
  }

  if (REPORT) {
    let list;
    if (FROM_ENV) {
      const email =
        process.env.E2E_USER_EMAIL?.trim() ||
        process.env.TEST_USER_EMAIL?.trim();
      if (!email) {
        console.error(
          "❌ --report --from-env krever E2E_USER_EMAIL eller TEST_USER_EMAIL",
        );
        process.exit(1);
      }
      const display =
        process.env.E2E_USER_DISPLAY_NAME?.trim() || email.split("@")[0];
      list = [{ email, options: { data: { display_name: display } } }];
    } else {
      list = PRIMARY_ONLY ? [TEST_USERS[0]] : TEST_USERS;
    }
    const problems = await runUserReport(list);
    process.exit(problems > 0 ? 1 : 0);
  }

  if (PROFILES_ONLY) {
    let list;
    if (FROM_ENV) {
      const email =
        process.env.E2E_USER_EMAIL?.trim() ||
        process.env.TEST_USER_EMAIL?.trim();
      if (!email) {
        console.error(
          "❌ --profiles-only --from-env krever E2E_USER_EMAIL eller TEST_USER_EMAIL",
        );
        process.exit(1);
      }
      const display =
        process.env.E2E_USER_DISPLAY_NAME?.trim() || email.split("@")[0];
      list = [
        {
          email,
          password: process.env.E2E_USER_PASSWORD || "unused",
          options: { data: { display_name: display }, email_confirm: true },
        },
      ];
    } else {
      list = PRIMARY_ONLY ? [TEST_USERS[0]] : TEST_USERS;
    }
    console.log(
      `🔄 profiles-only: sikrer user_profiles for ${list.length} bruker(e) (ingen passord-endring)…\n`,
    );
    for (const user of list) {
      const uid = await findUserByEmail(user.email);
      if (!uid) {
        console.warn(
          `⚠️  ${user.email} finnes ikke i Auth — kjør først: node scripts/create-test-users.js` +
            (PRIMARY_ONLY ? " --primary-only" : ""),
        );
        continue;
      }
      await ensureUserProfileRow(uid, user);
    }
    console.log("\n✅ profiles-only fullført.\n");
    return;
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
  console.log("\n   Auth (alle brukere): Supabase → Authentication → Users");
  console.log(
    "   Klarpakke Admin → Brukere: tabellen user_profiles (ikke bare Auth).",
  );
  console.log(
    "   Mangler du rader i Admin: knapp «Synk brukere fra Auth» på brukersiden, eller kjør dette scriptet på nytt.",
  );
  console.log(
    "\n   Lokalt: legg i .env.local → E2E_USER_EMAIL / E2E_USER_PASSWORD (samme som over)",
  );

  if (PRIMARY_ONLY && failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
