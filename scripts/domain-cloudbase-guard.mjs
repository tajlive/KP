#!/usr/bin/env node
import dns from "node:dns/promises";

const domain = process.env.APP_DOMAIN || "www.klarpakke.no";
const healthUrl = process.env.HEALTH_URL || `https://${domain}/api/health`;

const addresses = await dns.lookup(domain, { all: true });
if (!addresses || addresses.length === 0) {
  console.error(
    JSON.stringify({ ok: false, reason: "dns_lookup_failed", domain }, null, 2),
  );
  process.exit(1);
}

const response = await fetch(healthUrl, {
  headers: { Accept: "application/json" },
  signal: AbortSignal.timeout(20000),
});

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        reason: "health_http_failed",
        status: response.status,
        domain,
        addresses,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const body = await response.json();
if (!body?.status) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        reason: "health_json_missing_status",
        domain,
        addresses,
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
      domain,
      addresses,
      healthStatus: body.status,
      healthTimestamp: body.timestamp ?? null,
    },
    null,
    2,
  ),
);

