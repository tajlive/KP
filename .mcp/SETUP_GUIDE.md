# Klarpakke MCP Setup — Fullstendig Arkitekt-tilgang

Denne guiden gir Perplexity (AI-arkitekt) full tilgang til hele Klarpakke-stacken.

---

## Steg 1 — Generer tokens

### Supabase Access Token
1. Gå til [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Klikk **Generate new token**
3. Navn: `klarpakke-mcp-architect`
4. Kopier token og lim inn i `mcp_config.json` der det står `<SUPABASE_ACCESS_TOKEN>`

### Vercel Token
1. Gå til [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Klikk **Create Token**
3. Navn: `klarpakke-mcp`, Scope: `klarpakke` project
4. Kopier og lim inn der det står `<VERCEL_TOKEN>`

### Stripe Restricted Key
1. Gå til [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Klikk **Create restricted key**
3. Navn: `klarpakke-mcp-architect`
4. Gi disse tilgangene:
   - Products: **Read + Write**
   - Prices: **Read + Write**
   - Webhooks: **Read + Write**
   - Customers: **Read**
   - Subscriptions: **Read**
   - **IKKE** gi: Charges, Payouts, Balance (sikkerhet!)
5. Kopier `rk_live_...` og lim inn der det står `<STRIPE_RESTRICTED_KEY_rk_live_...>`

### Sentry Auth Token
1. Gå til [sentry.io/settings/account/api/auth-tokens](https://sentry.io/settings/account/api/auth-tokens/)
2. Klikk **Create New Token**
3. Navn: `klarpakke-mcp`
4. Scopes: `project:read`, `project:write`, `org:read`, `event:read`
5. Kopier og lim inn der det står `<SENTRY_AUTH_TOKEN>`

---

## Steg 2 — Oppdater din MCP-klient

### Cursor
Fil: `~/.cursor/mcp.json`

Legg til innholdet fra `mcp_config.json` i `mcpServers`-objektet (fjern kommentarene først).

### Claude Desktop
Fil: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)
Fil: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

Samme fremgangsmåte som Cursor.

---

## Steg 3 — Restart MCP-klienten

Etter du har lagt til tokens:
1. Lukk Cursor / Claude Desktop helt
2. Åpne på nytt
3. Verifiser at nye MCP-servere vises i verktøylisten

---

## Hva jeg kan gjøre med full tilgang

| Platform | Handlinger |
|----------|------------|
| **Supabase** | Kjøre migrasjoner, opprette tabeller, oppdatere RLS-policies, administrere Edge Functions, rotere API-nøkler |
| **Vercel** | Trigge deploys, oppdatere env vars, konfigurere domains, lese build-logger |
| **Stripe** | Opprette/oppdatere produkter og priser, konfigurere webhooks |
| **Sentry** | Lese feil og alerts, markere issues som løst, konfigurere alerting |
| **Playwright** | Kjøre E2E-tester automatisk, ta skjermbilder av produksjon |

---

## Sikkerhet

- **Aldri** commit `mcp_config.json` med faktiske tokens til git
- Filen er lagt til i `.gitignore` automatisk
- Bruk alltid restricted keys for Stripe
- Roter tokens jevnlig (anbefalt: hver 90 dag)
