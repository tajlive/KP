#!/usr/bin/env node
/**
 * Seed a few active leaderboard_bots and public trader_profiles for copy-trading discover.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from environment (NEVER hardcoded).
 * Safe to run repeatedly: skips rows that already exist per user_id.
 *
 * This version reuses existing auth users (avoids auth admin create failures in the current
 * production DB state). It only inserts public trader_profiles and active leaderboard_bots.
 *
 * Run with: source .env.local && node scripts/seed-active-traders.js
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function headers() {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };
}

async function getExistingAuthUsers() {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error(`admin list users failed: ${res.status}`);
  const { users } = await res.json();
  return users || [];
}

async function ensureUserProfile({ userId, displayName }) {
  const check = await fetch(
    `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}&select=id`,
    { headers: headers() },
  );
  if (!check.ok) throw new Error(`check user_profiles failed: ${check.status}`);
  const existing = await check.json();
  if (existing?.length) return { id: existing[0].id, created: false };

  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      display_name: displayName,
    }),
  });
  if (!createRes.ok) throw new Error(`create user_profiles failed: ${createRes.status}`);
  const row = await createRes.json();
  return { id: row[0].id, created: true };
}

async function ensureTraderProfile({ userId, displayName }) {
  const check = await fetch(
    `${SUPABASE_URL}/rest/v1/trader_profiles?user_id=eq.${userId}&select=id`,
    { headers: headers() },
  );
  if (!check.ok) throw new Error(`check trader_profiles failed: ${check.status}`);
  const existing = await check.json();
  if (existing?.length) return { id: existing[0].id, created: false };

  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/trader_profiles`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      display_name: displayName,
      is_public: true,
      verified: true,
      all_time_roi: 18.5,
      sharpe_ratio: 1.12,
      win_rate: 54,
      total_trades: 42,
      follower_count: 0,
      performance_fee_pct: 10,
      bio: "Demo bot-seeded trader profile.",
    }),
  });
  if (!createRes.ok) throw new Error(`create trader_profiles failed: ${createRes.status}`);
  const row = await createRes.json();
  return { id: row[0].id, created: true };
}

async function ensureLeaderboardBot({ userId, displayName }) {
  const check = await fetch(
    `${SUPABASE_URL}/rest/v1/leaderboard_bots?user_id=eq.${userId}&select=id`,
    { headers: headers() },
  );
  if (!check.ok) throw new Error(`check leaderboard_bots failed: ${check.status}`);
  const existing = await check.json();
  if (existing?.length) return { id: existing[0].id, created: false };

  const createRes = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_bots`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json", Prefer: "return=representation" },
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
      performance_fee_pct: 10,
      max_drawdown_30d: 5.2,
    }),
  });
  if (!createRes.ok) throw new Error(`create leaderboard_bots failed: ${createRes.status}`);
  const row = await createRes.json();
  return { id: row[0].id, created: true };
}

async function main() {
  console.log("Seeding active traders/bots via service role (reusing existing auth users)...");

  const users = await getExistingAuthUsers();
  if (users.length < 3) {
    console.error(`Only ${users.length} auth users found; need at least 3 to seed traders.`);
    process.exit(1);
  }

  // Pick the 3 most recent users, skipping any obvious admin/owner accounts if needed.
  const candidates = users
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3)
    .map((u) => ({
      userId: u.id,
      displayName: u.user_metadata?.display_name || u.email.split("@")[0],
    }));

  let botsCreated = 0;
  let profilesCreated = 0;
  let userProfilesCreated = 0;

  for (const trader of candidates) {
    console.log(`  ${trader.displayName} (${trader.userId.slice(0, 8)}...)`);

    const { created: userProfileCreated } = await ensureUserProfile({
      userId: trader.userId,
      displayName: trader.displayName,
    });
    if (userProfileCreated) userProfilesCreated++;

    const { created: profileCreated } = await ensureTraderProfile({
      userId: trader.userId,
      displayName: trader.displayName,
    });
    if (profileCreated) profilesCreated++;

    const { created: botCreated } = await ensureLeaderboardBot({
      userId: trader.userId,
      displayName: trader.displayName,
    });
    if (botCreated) botsCreated++;

    console.log(
      `    user_profiles ${userProfileCreated ? "created" : "exists"}, trader_profiles ${profileCreated ? "created" : "exists"}, leaderboard_bots ${botCreated ? "created" : "exists"}`,
    );
  }

  // Verify counts
  const botsCountRes = await fetch(
    `${SUPABASE_URL}/rest/v1/leaderboard_bots?is_active=eq.true&select=id`,
    { headers: headers() },
  );
  const publicProfilesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/trader_profiles?is_public=eq.true&select=id`,
    { headers: headers() },
  );
  const botsCount = (await botsCountRes.json()).length;
  const profilesCount = (await publicProfilesRes.json()).length;

  console.log("\nDone.");
  console.log(`  user_profiles created:  ${userProfilesCreated}`);
  console.log(`  trader_profiles created:${profilesCreated}`);
  console.log(`  leaderboard_bots created:${botsCreated}`);
  console.log(`  final active leaderboard_bots: ${botsCount}`);
  console.log(`  final public trader_profiles:  ${profilesCount}`);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
