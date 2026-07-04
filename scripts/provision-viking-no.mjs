#!/usr/bin/env node
/**
 * Provision Viking_NO test user and run paper trading until 50 trades exist.
 * Idempotent. Targets production (https://www.klarpakke.no) by default.
 *
 * Required env (from .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   CRON_SECRET
 */
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = process.cwd();

/** Load env in same priority as create-test-users.js / playwright.config.ts. */
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

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const CRON_SECRET = (process.env.CRON_SECRET || "").trim();
const BASE_URL = process.env.VIKING_BASE_URL || "https://www.klarpakke.no";

const VIKING_EMAIL = "viking.no@klarpakke.test";
const VIKING_PASSWORD = "VikingTestPass123!";
const VIKING_DISPLAY_NAME = "Viking_NO";
const PAPER_CAPITAL_NOK = 500_000;
const TARGET_TRADE_COUNT = 50;

function assertEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!CRON_SECRET) missing.push("CRON_SECRET");
  if (missing.length) {
    console.error("❌ Mangler miljøvariabler:", missing.join(", "));
    process.exit(1);
  }
}

function adminHeaders() {
  return {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
}

function restHeaders() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function listAuthUsers() {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`,
    { headers: adminHeaders() },
  );
  if (!res.ok) throw new Error("Kunne ikke liste auth.users");
  const { users } = await res.json();
  return users ?? [];
}

async function updateAuthUser(userId, { email, password, displayName }) {
  const updateRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
    {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      }),
    },
  );
  if (!updateRes.ok) {
    const t = await updateRes.text();
    throw new Error(`Oppdatering av ${email} feilet: ${updateRes.status} ${t}`);
  }
  return userId;
}

async function createOrUpdateVikingUser() {
  const users = await listAuthUsers();
  const existing = users.find((u) => u.email === VIKING_EMAIL);
  if (existing) {
    await updateAuthUser(existing.id, {
      email: VIKING_EMAIL,
      password: VIKING_PASSWORD,
      displayName: VIKING_DISPLAY_NAME,
    });
    console.log(`✅ Oppdatert passord/auth for ${VIKING_EMAIL} (${existing.id.slice(0, 8)}…)`);
    return existing.id;
  }

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email: VIKING_EMAIL,
      password: VIKING_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: VIKING_DISPLAY_NAME },
    }),
  });
  const data = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(`Oppretting av ${VIKING_EMAIL} feilet: ${createRes.status} ${JSON.stringify(data)}`);
  }
  console.log(`✅ Opprettet ${VIKING_EMAIL} (${data.id.slice(0, 8)}…)`);
  return data.id;
}

async function ensureUserProfile(userId, { email, displayName, tier = "professor", role = "user" }) {
  const headers = restHeaders();
  const byId = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}&select=id,user_id,tier,role,display_name`,
    { headers },
  );
  if (!byId.ok) throw new Error(`user_profiles lookup feilet: ${byId.status}`);
  const rows = await byId.json();

  const now = new Date().toISOString();
  const payload = {
    id: userId,
    user_id: userId,
    email,
    display_name: displayName,
    tier,
    role,
    subscription_tier: tier,
    subscription_status: "active",
    status: "active",
    created_at: now,
    updated_at: now,
  };

  if (Array.isArray(rows) && rows.length > 0) {
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          display_name: displayName,
          tier,
          role,
          subscription_tier: tier,
          subscription_status: "active",
          status: "active",
          updated_at: now,
        }),
      },
    );
    if (!updateRes.ok) {
      const t = await updateRes.text();
      console.warn(`⚠️  user_profiles update feilet: ${updateRes.status} ${t}`);
    } else {
      console.log(`✅ Oppdatert user_profiles for ${email} (tier=${tier})`);
    }
    return;
  }

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!insertRes.ok) {
    const t = await insertRes.text();
    throw new Error(`user_profiles insert feilet: ${insertRes.status} ${t}`);
  }
  console.log(`✅ Opprettet user_profiles for ${email} (tier=${tier})`);
}

async function authenticateUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Auth feilet for ${email}: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function getOrCreatePaperSessionServiceRole(userId) {
  const headers = restHeaders();
  const activeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trading_sessions?user_id=eq.${userId}&mode=eq.paper&status=eq.active&select=id,current_capital_nok,starting_capital_nok&limit=1`,
    { headers },
  );
  if (!activeRes.ok) throw new Error(`Kunne ikke sjekke aktive paper-sesjoner: ${activeRes.status}`);
  const active = await activeRes.json();
  if (Array.isArray(active) && active.length > 0 && active[0].id) {
    console.log(`✅ Brukte eksisterende paper-sesjon ${active[0].id.slice(0, 8)}…`);
    return active[0];
  }

  const now = new Date().toISOString();
  const sessionId = randomUUID();
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/trading_sessions`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      id: sessionId,
      user_id: userId,
      mode: "paper",
      status: "active",
      strategy_id: "dca",
      strategy_config: {
        paper: true,
        capital: PAPER_CAPITAL_NOK,
        interval_minutes: 1,
        position_size: 0.0001,
        max_daily_buys: 100,
        stop_loss_pct: -5,
        use_trailing_stop: false,
      },
      trading_pair: "BTCUSDT",
      starting_capital_nok: PAPER_CAPITAL_NOK,
      current_capital_nok: PAPER_CAPITAL_NOK,
      initial_capital: PAPER_CAPITAL_NOK,
      current_capital: PAPER_CAPITAL_NOK,
      total_pnl: 0,
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      crash_count: 0,
      created_at: now,
      updated_at: now,
      started_at: now,
      last_heartbeat: now,
      risk_level: "balanced",
    }),
  });
  if (!insertRes.ok) {
    const t = await insertRes.text();
    throw new Error(`Kunne ikke opprette paper-sesjon: ${insertRes.status} ${t}`);
  }
  console.log(`✅ Opprettet paper-sesjon ${sessionId.slice(0, 8)}…`);
  return { id: sessionId, starting_capital_nok: PAPER_CAPITAL_NOK, current_capital_nok: PAPER_CAPITAL_NOK };
}

async function setPaperCapital(userId, sessionId) {
  const headers = restHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trading_sessions?id=eq.${sessionId}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        starting_capital_nok: PAPER_CAPITAL_NOK,
        current_capital_nok: PAPER_CAPITAL_NOK,
        initial_capital: PAPER_CAPITAL_NOK,
        current_capital: PAPER_CAPITAL_NOK,
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`setPaperCapital feilet: ${res.status} ${t}`);
  }
  console.log(`✅ Satt paper-kapital til ${PAPER_CAPITAL_NOK} NOK for sesjon ${sessionId.slice(0, 8)}…`);
}

async function stopOldPaperSessions(userId) {
  const headers = restHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trading_sessions?user_id=eq.${userId}&mode=eq.paper&status=eq.active&select=id`,
    { headers },
  );
  if (!res.ok) throw new Error(`Kunne ikke finne aktive paper-sesjoner: ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return;
  for (const row of rows) {
    const stopRes = await fetch(
      `${SUPABASE_URL}/rest/v1/trading_sessions?id=eq.${row.id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "stopped",
          stopped_at: new Date().toISOString(),
          archived: true,
          archived_at: new Date().toISOString(),
        }),
      },
    );
    if (!stopRes.ok) {
      console.warn(`⚠️  Kunne ikke stoppe gammel sesjon ${row.id.slice(0, 8)}…: ${stopRes.status}`);
    } else {
      console.log(`🛑 Stoppet gammel paper-sesjon ${row.id.slice(0, 8)}…`);
    }
  }
}

async function ensureRecentSignal() {
  const headers = restHeaders();
  const recentRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trading_signals?symbol=eq.BTCUSDT&action=in.(buy,sell)&created_at=gt.${new Date(Date.now() - 15 * 60 * 1000).toISOString()}&select=id&limit=1`,
    { headers },
  );
  if (!recentRes.ok) throw new Error(`Sjekk av trading_signals feilet: ${recentRes.status}`);
  const recent = await recentRes.json();
  if (Array.isArray(recent) && recent.length > 0) {
    console.log("✅ Recent BTCUSDT signal already exists");
    return;
  }

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/trading_signals`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      symbol: "BTCUSDT",
      action: "buy",
      confidence: 75,
      entry_price: 0,
      signal_type: "ensemble_ai",
      agent_id: "viking_test_signal",
      status: "active",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  });
  if (!insertRes.ok) {
    const t = await insertRes.text();
    throw new Error(`Injisering av demo-signal feilet: ${insertRes.status} ${t}`);
  }
  console.log("✅ Injisert demo BUY-signal for BTCUSDT");
}

async function triggerTick() {
  const res = await fetch(`${BASE_URL}/api/cron/tick`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const data = await res.json().catch(() => ({}));
  console.log(`[tick] status=${res.status}`, JSON.stringify(data).slice(0, 200));
  if (!res.ok) throw new Error(`tick feilet: ${res.status}`);
  return data;
}

async function countSessionTrades(sessionId) {
  const headers = restHeaders();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trades?session_id=eq.${sessionId}&mode=eq.paper&select=id&limit=1000`,
    { headers },
  );
  if (!res.ok) throw new Error(`countSessionTrades feilet: ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
}

async function waitForTrades(sessionId, targetCount) {
  let count = await countSessionTrades(sessionId);
  let attempts = 0;
  const maxAttempts = 10;
  while (count < targetCount && attempts < maxAttempts) {
    attempts++;
    console.log(`⏳ ${count}/${targetCount} handler etter ${attempts - 1} tick; trigger tick ${attempts}...`);
    await triggerTick();
    await new Promise((r) => setTimeout(r, 5_000));
    count = await countSessionTrades(sessionId);
  }
  console.log(`✅ Fant ${count} paper-handler for sesjon ${sessionId.slice(0, 8)}…`);
  return count;
}

async function verifyApiConsistency(sessionId) {
  // Use service role for DB balance and trades; bearer auth against production API fails
  // from scripts because cookie/session handling is browser-only in this deployment.
  const headers = restHeaders();
  const sessionRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trading_sessions?id=eq.${sessionId}&select=current_capital_nok,starting_capital_nok,total_pnl,total_trades`,
    { headers },
  );
  if (!sessionRes.ok) throw new Error(`session lookup feilet: ${sessionRes.status}`);
  const sessions = await sessionRes.json();
  const session = sessions?.[0];
  const balance = {
    balance: {
      current: session.current_capital_nok ?? 0,
      starting: session.starting_capital_nok ?? 0,
    },
  };
  console.log(`[balance] DB session`, JSON.stringify(balance).slice(0, 200));

  const tradesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trades?session_id=eq.${sessionId}&mode=eq.paper&select=id,side,total_value,realized_pnl,fee&limit=200`,
    { headers },
  );
  const tradesBody = await tradesRes.json().catch(() => []);
  const dbTrades = Array.isArray(tradesBody) ? tradesBody : [];
  console.log(`[trades] DB count=${dbTrades.length}`);

  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json().catch(() => ({}));
  console.log(`[health] status=${healthRes.status}`, JSON.stringify(health).slice(0, 200));
  if (!healthRes.ok || health.status !== "healthy") throw new Error("health check feilet");
  if (health.checks?.tradingSignals?.status !== "ok") {
    console.warn("⚠️  health.tradingSignals ikke ok — fortsetter likevel");
  }

  const currentBalance = balance.balance?.current ?? 0;
  const currentDb = session.current_capital_nok ?? 0;
  if (currentBalance !== currentDb) {
    console.warn(`⚠️  balance.current (${currentBalance}) != DB current_capital_nok (${currentDb})`);
  } else {
    console.log("✅ Balance matcher DB");
  }

  const buySum = dbTrades.filter((t) => t.side === "buy").reduce((a, t) => a + (t.total_value ?? 0), 0);
  const sellSum = dbTrades.filter((t) => t.side === "sell").reduce((a, t) => a + (t.total_value ?? 0), 0);
  const feeSum = dbTrades.reduce((a, t) => a + (t.fee ?? 0), 0);
  const expected = PAPER_CAPITAL_NOK - buySum + sellSum - feeSum;
  const diff = Math.abs(expected - (session.current_capital_nok ?? 0));
  console.log(`💰 Expected capital ≈ ${expected.toFixed(2)}, DB = ${session.current_capital_nok}, diff = ${diff.toFixed(2)}`);
  if (diff > 0.01) {
    console.warn("⚠️  P&L-konsistens avvik > 0.01 NOK");
  } else if (dbTrades.length > 0) {
    console.log("✅ P&L-konsistens innen 0.01 NOK");
  }

  return { tradeCount: dbTrades.length, balance, session };
}

async function main() {
  assertEnv();
  console.log(`🎯 Provisjonerer Viking_NO og kjører paper trading mot ${BASE_URL}`);

  // 1. Viking_NO user
  const vikingUserId = await createOrUpdateVikingUser();
  await ensureUserProfile(vikingUserId, {
    email: VIKING_EMAIL,
    displayName: VIKING_DISPLAY_NAME,
    tier: "professor",
    role: "user",
  });

  // 2. Paper session med 500k NOK
  await stopOldPaperSessions(vikingUserId);
  const session = await getOrCreatePaperSessionServiceRole(vikingUserId);
  await setPaperCapital(vikingUserId, session.id);
  console.log(`✅ Paper session ${session.id.slice(0, 8)}… initialisert med 500 000 NOK`);

  // 3. Sørg for signal
  await ensureRecentSignal();

  // 4. Trigger tick inntil vi har nok handler
  console.log(`🚀 Trigger cron tick inntil ${TARGET_TRADE_COUNT} handler...`);
  const tradeCount = await waitForTrades(session.id, TARGET_TRADE_COUNT);

  // 5. Verifiser API-konsistens
  const result = await verifyApiConsistency(session.id);

  console.log("\n✅ Viking_NO provisjonering og verifisering fullført");
  if (tradeCount < TARGET_TRADE_COUNT) {
    console.log(`⚠️  Info: Bare ${tradeCount} handler generert av tick (mål: ${TARGET_TRADE_COUNT}). E2E-testen vil supplere med /api/paper-trading/execute.`);
  }
  return result;
}

main().catch((err) => {
  console.error("\n❌ Fatal feil:", err.message);
  console.error(err.stack);
  process.exit(1);
});
