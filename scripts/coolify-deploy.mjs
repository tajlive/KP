#!/usr/bin/env node
/**
 * Trigger Coolify deploy via webhook.
 *
 * Environment:
 *   COOLIFY_DEPLOY_WEBHOOK  - Coolify deployment webhook URL
 *   COOLIFY_TOKEN           - Coolify API token (if required by webhook)
 */

const webhook = process.env.COOLIFY_DEPLOY_WEBHOOK;
const token = process.env.COOLIFY_TOKEN;

if (!webhook) {
  console.error("❌ COOLIFY_DEPLOY_WEBHOOK is not set");
  process.exit(1);
}

const headers = { "Content-Type": "application/json" };
if (token) {
  headers["Authorization"] = `Bearer ${token}`;
}

console.log("🚀 Triggering Coolify deploy...");

try {
  const response = await fetch(webhook, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    console.error(`❌ Coolify deploy trigger failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const body = await response.text();
  console.log(`✅ Coolify deploy triggered: ${body || "OK"}`);
} catch (error) {
  console.error("❌ Failed to trigger Coolify deploy:", error);
  process.exit(1);
}
