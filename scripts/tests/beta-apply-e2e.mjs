#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.BASE_URL || "https://www.klarpakke.no").replace(/\/$/, "");
const path = process.env.BETA_APPLY_PATH || "/api/beta-signup";
const endpoint = `${baseUrl}${path}`;

const email = `e2e+${Date.now()}@klarpakke.no`;
const payload = {
  email,
  fullName: "E2E Test",
  locale: "no",
  source: "ci-e2e"
};

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload)
});

if (!res.ok) {
  const txt = await res.text().catch(() => "");
  console.error("Beta apply feilet:", res.status, txt);
  process.exit(1);
}

console.log("OK: beta-signup 2xx for", endpoint);
