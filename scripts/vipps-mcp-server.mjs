#!/usr/bin/env node
/**
 * Vipps MCP server – henter konfigurasjon, bytter auth-kode mot token, henter userinfo.
 *
 * Krever i .env.local (eller miljø):
 *   VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET
 *   VIPPS_MERCHANT_SERIAL_NUMBER (MSN)
 *   VIPPS_SUBSCRIPTION_KEY (Ocp-Apim-Subscription-Key for Login API)
 *   VIPPS_BASE_URL (valgfri, default: https://api.vipps.no; test: https://apitest.vipps.no)
 *
 * Bruk: node scripts/vipps-mcp-server.mjs
 * Cursor: .cursor/mcp.json peker på scripts/run-vipps-mcp.mjs som laster env og starter denne.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

const SYSTEM_HEADERS = {
  "Vipps-System-Name": "klarpakke",
  "Vipps-System-Version": "1.0",
  "Vipps-System-Plugin-Name": "vipps-mcp",
  "Vipps-System-Plugin-Version": "1.0",
};

function loadEnvLocal() {
  const env = { ...process.env };
  if (!existsSync(envPath)) return env;
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let value = trimmed.slice(eq + 1).trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replace(/\\'/g, "'");
          if (key.startsWith("VIPPS_")) env[key] = value;
        }
      }
    }
  } catch (_) {}
  return env;
}

const env = loadEnvLocal();
const VIPPS_BASE_URL = (env.VIPPS_BASE_URL || "https://api.vipps.no").replace(/\/$/, "");
const VIPPS_CLIENT_ID = env.VIPPS_CLIENT_ID;
const VIPPS_CLIENT_SECRET = env.VIPPS_CLIENT_SECRET;
const VIPPS_MSN = env.VIPPS_MERCHANT_SERIAL_NUMBER;
const VIPPS_SUBSCRIPTION_KEY = env.VIPPS_SUBSCRIPTION_KEY;

function vippsHeaders(extra = {}) {
  const h = {
    "Content-Type": "application/json",
    ...SYSTEM_HEADERS,
    ...extra,
  };
  if (VIPPS_MSN) h["Merchant-Serial-Number"] = VIPPS_MSN;
  if (VIPPS_SUBSCRIPTION_KEY) h["Ocp-Apim-Subscription-Key"] = VIPPS_SUBSCRIPTION_KEY;
  return h;
}

async function vippsFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${VIPPS_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...vippsHeaders(options.headers), ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Vipps API ${res.status}: ${text || res.statusText}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const server = new McpServer(
  {
    name: "vipps",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// --- OpenID discovery: henter alle Vipps Login-endepunkter og config
server.tool(
  "vipps_openid_config",
  "Henter Vipps Login OpenID Connect discovery (.well-known/openid-configuration). Returnerer authorization_endpoint, token_endpoint, userinfo_endpoint, jwks_uri, scopes_supported osv. Bruk dette for å få alle Vipps-URL-er og støttede scopes.",
  z.object({
    use_test: z.boolean().optional().describe("Bruk test-miljø (apitest.vipps.no) i stedet for prod"),
  }),
  async ({ use_test }) => {
    const base = use_test ? "https://apitest.vipps.no" : VIPPS_BASE_URL;
    const url = `${base}/access-management-1.0/access/.well-known/openid-configuration`;
    const data = await vippsFetch(url, { headers: { "Content-Type": undefined } });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Bytt autorisasjonskode mot access_token og optional refresh_token
server.tool(
  "vipps_exchange_code",
  "Bytter OAuth2 autorisasjonskode (fra redirect etter Vipps-innlogging) mot access_token og id_token. Pass code og redirect_uri som brukeren ble sendt tilbake med.",
  z.object({
    code: z.string().describe("authorization code fra redirect query (?code=...)"),
    redirect_uri: z.string().describe("Nøyaktig samme redirect_uri som brukt i auth-request, f.eks. https://www.klarpakke.no/no/auth/callback"),
  }),
  async ({ code, redirect_uri }) => {
    if (!VIPPS_CLIENT_ID || !VIPPS_CLIENT_SECRET) {
      throw new Error("VIPPS_CLIENT_ID og VIPPS_CLIENT_SECRET må være satt i .env.local");
    }
    const basic = Buffer.from(`${VIPPS_CLIENT_ID}:${VIPPS_CLIENT_SECRET}`, "utf8").toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
    });
    const url = `${VIPPS_BASE_URL}/access-management-1.0/access/oauth2/token`;
    const data = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
        ...vippsHeaders(),
      },
      body: body.toString(),
    }).then((r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(new Error(`${r.status}: ${t}`)))));
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Hent userinfo med access_token
server.tool(
  "vipps_userinfo",
  "Henter brukerprofil fra Vipps Login userinfo-endepunktet. Krever access_token fra vipps_exchange_code eller annen OAuth2-flyt.",
  z.object({
    access_token: z.string().describe("OAuth2 access_token fra Vipps (f.eks. fra vipps_exchange_code)"),
  }),
  async ({ access_token }) => {
    const url = `${VIPPS_BASE_URL}/vipps-userinfo-api/userinfo/`;
    const data = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        ...vippsHeaders(),
      },
    }).then((r) => (r.ok ? r.json() : r.text().then((t) => Promise.reject(new Error(`${r.status}: ${t}`)))));
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// --- Samle alt: config + (valgfritt) bytt code og hent userinfo
server.tool(
  "vipps_full_login_data",
  "Henter alt fra Vipps: 1) OpenID config (endpoints, scopes), 2) Hvis code og redirect_uri oppgis, byttes koden mot token og userinfo hentes. Gir én samlet JSON med config, tokens og userinfo.",
  z.object({
    code: z.string().optional().describe("Autorisasjonskode fra redirect – hvis satt, byttes mot token og userinfo hentes"),
    redirect_uri: z.string().optional().describe("redirect_uri som ble brukt i innlogging (påkrevd hvis code er satt)"),
    use_test: z.boolean().optional().describe("Bruk apitest.vipps.no"),
  }),
  async ({ code, redirect_uri, use_test }) => {
    const base = use_test ? "https://apitest.vipps.no" : VIPPS_BASE_URL;
    const configUrl = `${base}/access-management-1.0/access/.well-known/openid-configuration`;
    const config = await fetch(configUrl, { headers: vippsHeaders() }).then((r) => r.json());
    const out = { openid_config: config };

    if (code && redirect_uri && VIPPS_CLIENT_ID && VIPPS_CLIENT_SECRET) {
      const basic = Buffer.from(`${VIPPS_CLIENT_ID}:${VIPPS_CLIENT_SECRET}`, "utf8").toString("base64");
      const tokenRes = await fetch(`${base}/access-management-1.0/access/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
          ...vippsHeaders(),
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri }).toString(),
      });
      if (!tokenRes.ok) {
        out.token_error = await tokenRes.text();
      } else {
        const tokens = await tokenRes.json();
        out.tokens = tokens;
        if (tokens.access_token) {
          const userRes = await fetch(`${base}/vipps-userinfo-api/userinfo/`, {
            headers: { Authorization: `Bearer ${tokens.access_token}`, ...vippsHeaders() },
          });
          out.userinfo = userRes.ok ? await userRes.json() : { error: await userRes.text() };
        }
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("[vipps-mcp] Ready (VIPPS_* from .env.local)\n");
