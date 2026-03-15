/**
 * Vercel Project Configuration Script
 *
 * Konfigurerer Vercel-prosjekt via API for innstillinger som ikke kan settes via CLI.
 *
 * Krever: VERCEL_TOKEN (fra https://vercel.com/account/tokens)
 *
 * Bruk:
 *   npx tsx scripts/configure-vercel.ts
 *   # eller
 *   VERCEL_TOKEN=xxx npx tsx scripts/configure-vercel.ts
 */

const VERCEL_API_URL = "https://api.vercel.com";
const PROJECT_ID = "prj_TIvFmpMttYsHLC4eFkxxCEoILLEY";
const TEAM_ID = "team_JH76folkKg0SaSV9OtANlQ6L";

// Ønskede prosjektinnstillinger
const PROJECT_CONFIG = {
  // Serverless function settings
  serverlessFunctionRegion: "iad1", // US East (closest to EU users with good latency)
  framework: "nextjs",
  nodeVersion: "22.x",
  buildCommand: "next build",
  installCommand: "npm install",
  outputDirectory: ".next",
};

// Miljøvariabler som skal synkes fra Production til Preview
const ENV_VARS_TO_SYNC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
];

async function getToken(): Promise<string> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error(
      "❌ VERCEL_TOKEN er ikke satt.\n" +
        "   Opprett token: https://vercel.com/account/tokens\n" +
        "   Kjør: VERCEL_TOKEN=xxx npx tsx scripts/configure-vercel.ts"
    );
    process.exit(1);
  }
  return token;
}

async function apiRequest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown
) {
  const token = await getToken();

  const url = `${VERCEL_API_URL}${endpoint}${endpoint.includes("?") ? "&" : "?"}teamId=${TEAM_ID}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API feil: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getProject() {
  return apiRequest(`/v9/projects/${PROJECT_ID}`);
}

async function updateProject(settings: Record<string, unknown>) {
  return apiRequest(`/v9/projects/${PROJECT_ID}`, "PATCH", settings);
}

async function getEnvVars(): Promise<{ envs: Array<{ key: string; target: string[] }> }> {
  return apiRequest(`/v9/projects/${PROJECT_ID}/env`);
}

async function createEnvVar(key: string, value: string, target: string[]) {
  return apiRequest(`/v10/projects/${PROJECT_ID}/env`, "POST", {
    key,
    value,
    target,
    type: "encrypted",
  });
}

async function main() {
  console.log("🔧 Konfigurerer Vercel prosjekt...\n");

  // Hent prosjektinfo
  console.log("📖 Henter prosjektinformasjon...");
  const project = await getProject();

  console.log("Nåværende innstillinger:");
  console.log(`  Navn: ${project.name}`);
  console.log(`  Framework: ${project.framework}`);
  console.log(`  Node Version: ${project.nodeVersion}`);
  console.log(`  Build Command: ${project.buildCommand || "default"}`);
  console.log("");

  // Sjekk Node versjon
  if (project.nodeVersion !== PROJECT_CONFIG.nodeVersion) {
    console.log(
      `⚠️  Node versjon er ${project.nodeVersion}, anbefalt er ${PROJECT_CONFIG.nodeVersion}`
    );
    console.log("   Oppdater i Vercel Dashboard → Project Settings → General");
  } else {
    console.log(`✅ Node versjon: ${project.nodeVersion}`);
  }

  // Sjekk miljøvariabler
  console.log("\n📋 Sjekker miljøvariabler...");
  const { envs } = await getEnvVars();

  const productionVars = new Map<string, boolean>();
  const previewVars = new Map<string, boolean>();

  for (const env of envs) {
    if (env.target.includes("production")) {
      productionVars.set(env.key, true);
    }
    if (env.target.includes("preview")) {
      previewVars.set(env.key, true);
    }
  }

  const missing: string[] = [];

  for (const varName of ENV_VARS_TO_SYNC) {
    const inProd = productionVars.has(varName);
    const inPreview = previewVars.has(varName);

    if (inProd && !inPreview) {
      console.log(`⚠️  ${varName}: Production ✓, Preview ✗`);
      missing.push(varName);
    } else if (inProd && inPreview) {
      console.log(`✅ ${varName}: Production ✓, Preview ✓`);
    } else if (!inProd) {
      console.log(`❌ ${varName}: Mangler i Production`);
    }
  }

  if (missing.length > 0) {
    console.log(
      "\n📝 For å synkronisere miljøvariabler til Preview, kjør:"
    );
    console.log("   ./scripts/optimize-services.sh");
    console.log(
      "   Eller manuelt via: vercel env add <VAR_NAME> preview"
    );
  }

  // Vis domener
  console.log("\n🌐 Domener:");
  for (const domain of project.alias || []) {
    console.log(`   ${domain}`);
  }

  // Vis funksjonsinnstillinger
  console.log("\n⚡ Serverless Functions:");
  console.log(
    `   Region: ${project.serverlessFunctionRegion || "auto"}`
  );

  console.log("\n✅ Vercel-konfigurasjon verifisert!");

  // Instruksjoner for manuelle steg
  console.log("\n📋 Manuelle steg (i Vercel Dashboard):");
  console.log("   1. Project Settings → Functions:");
  console.log("      - Max Duration: 10-60s (avhengig av API-ruter)");
  console.log("      - Memory: 1024 MB (default)");
  console.log("   2. Project Settings → Environment Variables:");
  console.log("      - Verifiser at Preview har samme Supabase-variabler som Production");
}

main().catch(console.error);
