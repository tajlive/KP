// MCP-style System Audit
// Comparing configured project vs live project

const CONFIGURED_PROJECT = "vuxbjlykgmzskxbclquf";
const LIVE_PROJECT = "oysfdzutvezqhainaxba";

async function testProject(ref: string, name: string) {
  console.log(`\n--- Testing ${name} (${ref}) ---`);

  // 1. Auth Endpoint
  try {
    const authUrl = `https://${ref}.supabase.co/auth/v1/authorize?provider=google`;
    const resp = await fetch(authUrl);
    console.log(`Auth Provider Check: ${resp.status} ${resp.statusText}`);
    const body = await resp.text();
    if (body.includes("provider is not enabled")) {
      console.log("❌ GOOGLE AUTH IS DISABLED on this project");
    } else if (resp.status === 200 || resp.status === 302) {
      console.log("✅ OAuth initialized (or redirecting)");
    } else {
      console.log(`⚠️ Status ${resp.status}: ${body.slice(0, 100)}`);
    }
  } catch (e) {
    console.log(`❌ Auth check failed: ${e.message}`);
  }

  // 2. API Gateway
  try {
    const gatewayUrl = `https://${ref}.functions.supabase.co/api-gateway/health`;
    const resp = await fetch(gatewayUrl, {
      headers: { Authorization: "Bearer klarpakke-dev-token" },
    });
    console.log(`API Gateway Health: ${resp.status} ${resp.statusText}`);
  } catch (e) {
    console.log(`❌ Gateway check failed: ${e.message}`);
  }
}

console.log("🚀 KLARPAKKE MCP - COMPREHENSIVE SYSTEM AUDIT");
await testProject(CONFIGURED_PROJECT, "Configured Project (from Code)");
await testProject(LIVE_PROJECT, "Live Project (from Browser)");
