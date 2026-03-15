/**
 * Supabase Auth URL Configuration Script
 *
 * Dette scriptet konfigurerer Supabase Auth URLs via Management API.
 * Krever: SUPABASE_ACCESS_TOKEN (fra https://supabase.com/dashboard/account/tokens)
 *
 * Bruk:
 *   npx tsx scripts/configure-auth-urls.ts
 *   # eller
 *   SUPABASE_ACCESS_TOKEN=xxx npx tsx scripts/configure-auth-urls.ts
 */

const SUPABASE_PROJECT_REF = "vuxbjlykgmzskxbclquf";
const SUPABASE_API_URL = "https://api.supabase.com";

// Auth URL konfigurasjon
const AUTH_CONFIG = {
  site_url: "https://www.klarpakke.no",
  redirect_urls: [
    "https://www.klarpakke.no/**",
    "https://klarpakke.no/**",
    "https://*.vercel.app/**", // Preview deployments
  ],
  // JWT og session innstillinger
  jwt_expiry: 3600, // 1 time
  // Refresh token rotation
  refresh_token_rotation_enabled: true,
};

async function getAccessToken(): Promise<string> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "❌ SUPABASE_ACCESS_TOKEN er ikke satt.\n" +
        "   Opprett token: https://supabase.com/dashboard/account/tokens\n" +
        "   Kjør: SUPABASE_ACCESS_TOKEN=xxx npx tsx scripts/configure-auth-urls.ts"
    );
    process.exit(1);
  }
  return token;
}

async function getProjectConfig(token: string) {
  const response = await fetch(
    `${SUPABASE_API_URL}/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kunne ikke hente config: ${response.status} - ${error}`);
  }

  return response.json();
}

async function updateProjectConfig(
  token: string,
  config: Record<string, unknown>
) {
  const response = await fetch(
    `${SUPABASE_API_URL}/v1/projects/${SUPABASE_PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Kunne ikke oppdatere config: ${response.status} - ${error}`
    );
  }

  return response.json();
}

async function main() {
  console.log("🔧 Konfigurerer Supabase Auth URLs...\n");

  const token = await getAccessToken();

  // Hent nåværende konfigurasjon
  console.log("📖 Henter nåværende konfigurasjon...");
  const currentConfig = await getProjectConfig(token);

  console.log("Nåværende innstillinger:");
  console.log(`  Site URL: ${currentConfig.SITE_URL || "(ikke satt)"}`);
  console.log(
    `  Redirect URLs: ${currentConfig.URI_ALLOW_LIST || "(ikke satt)"}`
  );
  console.log("");

  // Sjekk om oppdatering er nødvendig
  const needsUpdate =
    currentConfig.SITE_URL !== AUTH_CONFIG.site_url ||
    currentConfig.URI_ALLOW_LIST !== AUTH_CONFIG.redirect_urls.join(",");

  if (!needsUpdate) {
    console.log("✅ Auth URLs er allerede korrekt konfigurert!\n");
    return;
  }

  // Oppdater konfigurasjon
  console.log("📝 Oppdaterer konfigurasjon...");
  const updatePayload = {
    SITE_URL: AUTH_CONFIG.site_url,
    URI_ALLOW_LIST: AUTH_CONFIG.redirect_urls.join(","),
    JWT_EXPIRY: AUTH_CONFIG.jwt_expiry,
    REFRESH_TOKEN_ROTATION_ENABLED: AUTH_CONFIG.refresh_token_rotation_enabled,
  };

  console.log("Nye innstillinger:");
  console.log(`  Site URL: ${updatePayload.SITE_URL}`);
  console.log(`  Redirect URLs: ${updatePayload.URI_ALLOW_LIST}`);
  console.log(`  JWT Expiry: ${updatePayload.JWT_EXPIRY}s`);
  console.log(
    `  Refresh Token Rotation: ${updatePayload.REFRESH_TOKEN_ROTATION_ENABLED}`
  );
  console.log("");

  try {
    await updateProjectConfig(token, updatePayload);
    console.log("✅ Auth URLs oppdatert!\n");
  } catch (error) {
    console.error("❌ Feil ved oppdatering:", error);
    process.exit(1);
  }

  // Verifiser endringer
  console.log("🔍 Verifiserer endringer...");
  const newConfig = await getProjectConfig(token);
  console.log(`  Site URL: ${newConfig.SITE_URL}`);
  console.log(`  Redirect URLs: ${newConfig.URI_ALLOW_LIST}`);
  console.log("\n✅ Konfigurasjon fullført!");
}

main().catch(console.error);
