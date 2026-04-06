#!/usr/bin/env node
/**
 * Exit 1 når prod (eller annen HEALTH_URL) ikke er OK for drift — egnet for CI/cron + webhook.
 *
 * Env:
 *   HEALTH_URL — default https://www.klarpakke.no/api/health
 *   ALERT_STALE_SIGNALS — default "1": tradingSignals.warning (tomme / gamle signaler) teller som feil
 *   FAIL_ON_DEGRADED — default "0": sett "1" for å feile på ethvert "degraded" (inkl. kun KV-varsel)
 */
const url = process.env.HEALTH_URL || "https://www.klarpakke.no/api/health";
const alertStale = process.env.ALERT_STALE_SIGNALS !== "0";
const failOnDegraded = process.env.FAIL_ON_DEGRADED === "1";

const problems = [];

let res;
try {
  res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e?.message || e) }, null, 2));
  process.exit(1);
}

let body;
try {
  body = await res.json();
} catch {
  problems.push(`non-json response HTTP ${res.status}`);
  console.error(JSON.stringify({ problems, status: res.status }, null, 2));
  process.exit(1);
}

if (res.status === 503 || body.status === "unhealthy") {
  problems.push(`overall:${body.status || res.status} HTTP ${res.status}`);
}

const db = body.checks?.database;
if (db?.status === "error") {
  problems.push(`database:${db.message || "error"}`);
}

const ts = body.checks?.tradingSignals;
if (ts?.status === "error") {
  problems.push(`tradingSignals:${ts.message || "error"}`);
}
if (alertStale && ts?.status === "warning") {
  problems.push(`tradingSignals:${ts.message || "warning"}`);
}

if (failOnDegraded && body.status === "degraded" && problems.length === 0) {
  problems.push(`degraded:${JSON.stringify(body.checks || {})}`);
}

if (problems.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        url,
        problems,
        timestamp: body.timestamp,
        checks: body.checks,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      status: body.status,
      tradingSignals: ts?.status,
      timestamp: body.timestamp,
    },
    null,
    2,
  ),
);
