/**
 * Staging Supabase Auth URL Configuration Script
 * 
 * Legger til staging redirect URLs via Management API.
 * Bruker SUPABASE_ACCESS_TOKEN fra .env.local
 * 
 * Bruk:
 *   npx tsx scripts/configure-staging-auth-urls.ts
 */

const STAGING_PROJECT_REF = "ooguscwohyyadkpmefrj";
const SUPABASE_API_URL = "https://api.supabase.com";

const AUTH_CONFIG = {
  SITE_URL: "https://staging.klarpakke.no",
  URI_ALLOW_LIST: [
    "https://staging.klarpakke.no/**",
    "https://www.klarpakke.no/**",
    "https://klarpakke.no/**",
  ].join(","),
  JWT_EXPIRY: 3600,
  REFRESH_TOKEN_ROTATION_ENABLED: true,
};

async function getAccessToken(): Promise<string> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "❌ SUPABASE_ACCESS_TOKEN er ikke satt.\n" +
        "   Hent fra .env.local\n" +
        "   Kjør: SUPABASE_ACCESS_TOKEN=xxx npx tsx scripts/configure-staging-auth-urls.ts"
    );
    process.exit(1);
  }
  return token;
}

async function main() {
  console.log("🔧 Konfigurerer Supabase Auth URLs for staging...\n");

  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Hent nåværende konfigurasjon
  console.log("📖 Henter nåværende konfigurasjon...");
  const getRes = await fetch(
    `${SUPABASE_API_URL}/v1/projects/${STAGING_PROJECT_REF}/config/auth`,
    { headers }
  );

  if (!getRes.ok) {
    const error = await getRes.text();
    throw new Error(`Kunne ikke hente config: ${getRes.status} - ${error}`);
  }

  const currentConfig = await getRes.json();
  console.log("Nåværende innstillinger:");
  console.log(`  Site URL: ${currentConfig.SITE_URL || "(ikke satt)"}`);
  console.log(`  Redirect URLs: ${currentConfig.URI_ALLOW_LIST || "(ikke satt)"}`);
  console.log("");

  // Sjekk om oppdatering er nødvendig
  const needsUpdate =
    currentConfig.SITE_URL !== AUTH_CONFIG.SITE_URL ||
    currentConfig.URI_ALLOW_LIST !== AUTH_CONFIG.URI_ALLOW_LIST;

  if (!needsUpdate) {
    console.log("✅ Auth URLs er allerede korrekt konfigurert!\n");
    return;
  }

  // Oppdater konfigurasjon
  console.log("📝 Oppdaterer konfigurasjon...");
  console.log("Nye innstillinger:");
  console.log(`  Site URL: ${AUTH_CONFIG.SITE_URL}`);
  console.log(`  Redirect URLs: ${AUTH_CONFIG.URI_ALLOW_LIST}`);
  console.log(`  JWT Expiry: ${AUTH_CONFIG.JWT_EXPIRY}s`);
  console.log(`  Refresh Token Rotation: ${AUTH_CONFIG.REFRESH_TOKEN_ROTATION_ENABLED}`);
  console.log("");

  const updateRes = await fetch(
    `${SUPABASE_API_URL}/v1/projects/${STAGING_PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        SITE_URL: AUTH_CONFIG.SITE_URL,
        URI_ALLOW_LIST: AUTH_CONFIG.URI_ALLOW_LIST,
        JWT_EXPIRY: AUTH_CONFIG.JWT_EXPIRY,
        REFRESH_TOKEN_ROTATION_ENABLED: AUTH_CONFIG.REFRESH_TOKEN_ROTATION_ENABLED,
      }),
    }
  );

  if (!updateRes.ok) {
    const error = await updateRes.text();
    throw new Error(`Kunne ikke oppdatere config: ${updateRes.status} - ${error}`);
  }

  console.log("✅ Auth URLs oppdatert!\n");

  // Verifiser endringer
  console.log("🔍 Verifiserer endringer...");
  const verifyRes = await fetch(
    `${SUPABASE_API_URL}/v1/projects/${STAGING_PROJECT_REF}/config/auth`,
    { headers }
  );
  const newConfig = await verifyRes.json();
  console.log(`  Site URL: ${newConfig.SITE_URL}`);
  console.log(`  Redirect URLs: ${newConfig.URI_ALLOW_LIST}`);
  console.log("\n✅ Konfigurasjon fullført!");
}

main().catch((err) => {
  console.error("❌ Feil:", err.message);
  process.exit(1);
});
