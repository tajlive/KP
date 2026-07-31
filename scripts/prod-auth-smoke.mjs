#!/usr/bin/env node
/**
 * prod-auth-smoke.mjs — Syntetisk auth-smoketest mot produksjon.
 *
 * Formål: Fang opp at NEXT_PUBLIC_SUPABASE_* mangler i prod-bundle
 * (tilfelle 2026-07-17: auth 100% nede, usynlig for innloggede brukere).
 *
 * Exit 0 = OK (stille). Exit 1 = ALARM (print grunn til stdout).
 * Designet for auto-monitor-cron: kjør hver time.
 */

const BASE = process.env.SMOKE_BASE_URL ?? "https://www.klarpakke.no";
const SUPABASE_HOST = "pskhryjzkobytnfwucrb.supabase.co";

const failures = [];

async function check(label, fn) {
  try {
    await fn();
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

await check("login-html", async () => {
  const r = await fetch(`${BASE}/no/login`, { redirect: "follow" });
  assert(r.status === 200, `HTTP ${r.status}`);
  const html = await r.text();
  assert(
    html.includes("pskhryjzkobytnfwucrb") || html.includes("supabase"),
    "Supabase-referanse mangler i login-HTML",
  );
});

await check("js-bundle-inlining", async () => {
  const r = await fetch(`${BASE}/no/login`);
  const html = await r.text();
  // Sjekk ALLE unike chunks (2026-07-31: .slice(0,12) ga falsk alarm —
  // Supabase-URL lå i chunk nr. ~20 av 28 på login-siden)
  const chunks = [...new Set(
    [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1])
  )];
  assert(chunks.length > 0, "Fant ingen JS-chunks på login-siden");
  let found = false;
  for (const c of chunks) {
    const js = await (await fetch(`${BASE}${c}`)).text();
    if (js.includes(SUPABASE_HOST)) {
      found = true;
      break;
    }
  }
  assert(found, `Ingen av ${chunks.length} chunks inneholder ${SUPABASE_HOST} — NEXT_PUBLIC_* ikke inlined ved build`);
});

await check("register-page", async () => {
  const r = await fetch(`${BASE}/no/register`);
  const html = await r.text();
  assert(
    !html.includes("Supabase er ikke konfigurert"),
    "Register-siden viser config-feil til brukere",
  );
});

await check("kurs-page", async () => {
  const r = await fetch(`${BASE}/no/kurs`);
  const html = await r.text();
  assert(r.status === 200, `HTTP ${r.status}`);
  // Fjern script-tags først — i18n-meldinger ("Noe gikk galt", "Prøv igjen")
  // ligger i JSON-payload og skal ikke tolkes som synlig error boundary.
  const visible = html.replace(/<script[^>]*>.*?<\/script>/gis, "");
  assert(!visible.includes("Noe gikk galt"), "Kurs-siden viser error boundary");
});

if (failures.length > 0) {
  console.log(`ALARM prod-auth-smoke: ${failures.join(" | ")}`);
  process.exit(1);
}
// Stille ved suksess
