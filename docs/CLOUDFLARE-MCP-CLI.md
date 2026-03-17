# Cloudflare MCP og CLI – full kontroll

Oversikt over MCP (Cursor/AI), CLI (scripting/CI) og tilgang til Cloudflare (DNS, zones, Pages, Workers, R2, D1, osv.).

---

## 1. MCP (Cursor)

### Offisiell Cloudflare MCP (remote)

Cloudflare tilbyr **remote MCP** med OAuth – tilgang til hele Cloudflare API via to verktøy: `search()` og `execute()` (Codemode).

| Konfigurasjon | Verdier |
|---------------|---------|
| **Cursor** | `.cursor/mcp.json` → `"cloudflare": { "url": "https://mcp.cloudflare.com/mcp" }` |
| **Første gang** | Cursor sender deg til Cloudflare for OAuth – velg konto og tillatelser |

**Hva du får tilgang til (via Cloudflare API):**

- DNS, zones, Workers, R2, D1, KV, Queues, Durable Objects
- Pages-prosjekter, Builds, Observability (logger)
- Zero Trust, WAF, og øvrige Cloudflare-tjenester

Kilde: [Cloudflare MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/).

### Flere Cloudflare MCP-servere (valgfritt)

Du kan legge til produktspesifikke MCP-er i tillegg:

| Server | URL | Bruk |
|--------|-----|------|
| Docs | `https://docs.mcp.cloudflare.com/mcp` | Dokumentasjonssøk |
| Workers Bindings | `https://bindings.mcp.cloudflare.com/mcp` | Workers + storage/AI |
| Workers Builds | `https://builds.mcp.cloudflare.com/mcp` | Builds og deploy-status |
| Observability | `https://observability.mcp.cloudflare.com/mcp` | Logger og metrics |

---

## 2. CLI (terminal / CI)

Når MCP ikke brukes (f.eks. CI eller skript), bruk **CLOUDFLARE_API_TOKEN** og CLI.

### npm-scripts

| Script | Beskrivelse |
|--------|-------------|
| `npm run cloudflare:test` | Tester Cloudflare API (token fra .env.local) |
| `npm run cloudflare zones` | Lister alle zones |
| `npm run cloudflare dns [zoneName]` | Lister DNS-records (default: klarpakke.no) |
| `npm run cloudflare account` | Lister konto(er) eller detaljer for CLOUDFLARE_ACCOUNT_ID |
| `npm run cloudflare pages` | Lister Pages-prosjekter |

### Miljøvariabler

- **CLOUDFLARE_API_TOKEN** – påkrevd for API/CLI. Opprett: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens). Anbefalt: Zone Read, Zone DNS Edit, Account Read (evt. Pages Edit).
- **CLOUDFLARE_ACCOUNT_ID** (valgfritt) – for `account` og `pages` uten å hente konto-id automatisk.

CLI-scriptet: `scripts/cloudflare-api.mjs`; leser `.env.local`.

### Eksisterende skript som bruker Cloudflare

- `scripts/update-dns-vercel.sh` – oppdaterer DNS (A/CNAME) mot Vercel med CLOUDFLARE_API_TOKEN.
- `scripts/cloudflare/deploy-pages.sh` – deploy til Pages med wrangler.
- `scripts/auto-dns-cloudflare.sh` – DNS-automasjon med API.

---

## 3. Verifisere tilkobling

```bash
npm run cloudflare:test   # API-token
npm run test:mcp          # test-mcp-connections.sh inkl. Cloudflare API + CF-headers på klarpakke.no
```

---

## 4. Oppsummering

| Del | Løsning |
|-----|--------|
| **MCP** | Remote: `url: https://mcp.cloudflare.com/mcp` i `.cursor/mcp.json`. OAuth ved første bruk. |
| **CLI** | `scripts/cloudflare-api.mjs` + `npm run cloudflare` / `cloudflare:test`. Krever `CLOUDFLARE_API_TOKEN` i `.env.local`. |
| **Full kontroll** | MCP gir full API-tilgang; CLI gir zones, DNS, account, Pages for scripting og CI. |
