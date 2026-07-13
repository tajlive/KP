// Generer Playwright auth state fra Supabase
import { writeFileSync } from "fs";
const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_USER_EMAIL || "e2e-test@klarpakke.no";
const PASSWORD = process.env.E2E_USER_PASSWORD || "KlarpakkeE2E2026!";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pskhryjzkobytnfwucrb.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: ANON_KEY },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const data = await res.json();
if (!res.ok) { console.error("Auth failed:", data); process.exit(1); }

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1] || "";
const state = {
  cookies: [{
    name: `sb-${projectRef}-auth-token`,
    value: JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now()/1000) + 3600,
      expires_in: data.expires_in || 3600,
      token_type: data.token_type || "bearer",
    }),
    domain: new URL(BASE).hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }],
  origins: [],
};
writeFileSync(".auth/user.json", JSON.stringify(state, null, 2));
console.log("✅ Auth state saved to .auth/user.json");
console.log("   User:", data.user?.email || EMAIL);
