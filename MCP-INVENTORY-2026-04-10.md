# 🤖 MCP (Model Context Protocol) Inventory - Klarpakke

**Dato:** 2026-04-10  
**Versjon:** 2.1  
**Status:** ✅ Full kontroll etablert  

---

## 📋 Oppsummering

| Kategori | Antall | Status |
|----------|--------|--------|
| **Infrastruktur** | 8 | ✅ Alle aktive |
| **Database/Storage** | 3 | ✅ Alle aktive |
| **Betaling** | 3 | ✅ Alle aktive |
| **AI/ML** | 4 | ✅ Alle aktive |
| **Testing/Debugging** | 2 | ✅ Alle aktive |
| **TOTAL** | **20 MCP-servere** | ✅ **Fullstendig** |

---

## 🔧 Infrastruktur MCP-er

### 1. ☁️ Cloudflare MCP
```json
{
  "command": "node",
  "args": ["scripts/run-cloudflare-mcp.mjs"]
}
```
**Funksjoner:**
- `list_zones` - List alle zones
- `get_zone_details` - Hent zone info
- `list_dns_records` - List DNS records
- `create_dns_record` - Opprett DNS record
- `purge_cache` - Tøm cache
- `get_analytics` - Hent analytics
- `list_workers` - List Workers
- `list_pages_projects` - List Pages prosjekter
- `get_ssl_settings` / `update_ssl_settings` - SSL management

**Krever:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`

---

### 2. 🚀 Vercel MCP
```json
{
  "command": "node",
  "args": ["scripts/run-vercel-mcp.mjs"]
}
```
**Funksjoner:**
- Deployments management
- Projects & domains
- Environment variables
- Build logs

**Krever:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

### 3. 📂 Filesystem MCP
```json
{
  "command": "node",
  "args": ["scripts/run-filesystem-mcp.mjs"]
}
```
**Funksjoner:**
- Filoperasjoner i prosjektet
- Lese/skrive filer
- Directory listing

---

### 4. 🔍 Context7 MCP
```json
{
  "command": "node",
  "args": ["scripts/run-context7-mcp.mjs"]
}
```
**Funksjoner:**
- Bibliotekdokumentasjon
- API referanser
- Code snippets

---

### 5. 🎭 Playwright MCP
```json
{
  "command": "npx",
  "args": ["-y", "@playwright/mcp@latest"]
}
```
**Funksjoner:**
- Browser automation
- E2E testing
- Screenshots

---

### 6. 🔧 Chrome DevTools MCP
```json
{
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp@0.20.3", "--no-usage-statistics"]
}
```
**Funksjoner:**
- Debugging
- Performance profiling
- Network analysis

---

### 7. 📧 Resend MCP
```json
{
  "command": "npx",
  "args": ["-y", "resend-mcp@2.2.0"],
  "env": { "RESEND_API_KEY": "${RESEND_API_KEY}" }
}
```
**Funksjoner:**
- Send e-post
- Template management
- Delivery tracking

**Krever:** `RESEND_API_KEY`

---

### 8. 🐙 GitHub MCP
```json
{
  "command": "node",
  "args": ["scripts/run-github-mcp.mjs"]
}
```
**Funksjoner:**
- Repository management
- Issues & PRs
- Actions workflows
- Releases

**Krever:** `GITHUB_TOKEN`

---

## 🗄️ Database/Storage MCP-er

### 9. 🔵 Supabase (Offisiell) MCP
```json
{
  "command": "node",
  "args": ["scripts/run-official-supabase-mcp.mjs"]
}
```
**Funksjoner:**
- Management API
- Projects & organizations
- Edge Functions
- Database backups

**Krever:** `SUPABASE_ACCESS_TOKEN`

---

### 10. 🐘 Supabase DB MCP
```json
{
  "command": "node",
  "args": ["scripts/run-supabase-mcp.mjs"]
}
```
**Funksjoner:**
- SQL queries
- Table management
- Migrations
- Row Level Security

**Krever:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

### 11. 🏛️ Klarpakke MCP
```json
{
  "command": "node",
  "args": ["scripts/run-klarpakke-mcp.mjs"]
}
```
**Funksjoner:**
- Custom Supabase queries via Edge Function
- Trading-spesifikke operasjoner
- Optimaliserte DB-spørringer

**Krever:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`

---

### 12. 🏛️ Mempalace MCP
```json
{
  "command": "node",
  "args": ["scripts/run-mempalace-mcp-v3.mjs"]
}
```
**Funksjoner:**
- Search project knowledge
- Knowledge graph queries (`kg_get`, `kg_add`)
- Diary management (`read_diary`, `write_diary`)
- Room/tunnel navigation
- Status monitoring

**Konfigurasjon:** `mempalace.yaml`

---

## 💰 Betaling MCP-er

### 13. 💳 Stripe MCP
```json
{
  "command": "node",
  "args": ["scripts/run-stripe-mcp.mjs"]
}
```
**Funksjoner:**
- Payments & charges
- Subscriptions
- Customers
- Invoices
- Webhook management

**Krever:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

### 14. 🟦 Vipps MCP
```json
{
  "command": "node",
  "args": ["scripts/run-vipps-mcp.mjs"]
}
```
**Funksjoner:**
- Norwegian mobile payments
- eCommerce payments
- Recurring payments

**Krever:** `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`

---

## 🤖 AI/ML MCP-er

### 15. 🔍 Perplexity MCP
```json
{
  "command": "node",
  "args": ["scripts/run-perplexity-mcp.mjs"]
}
```
**Funksjoner:**
- AI-søk med kilder
- Research assistance
- Web-grounded answers

**Krever:** `PERPLEXITY_API_KEY`

---

### 16. 🤖 OpenAI MCP
```json
{
  "command": "node",
  "args": ["scripts/run-openai-mcp.mjs"]
}
```
**Funksjoner:**
- Chat completions (GPT-4o, GPT-4o-mini, etc.)
- Embeddings (text-embedding-3-small, etc.)
- Assistants API
- Threads & messages
- Fine-tuning

**Krever:** `OPENAI_API_KEY`, `OPENAI_ORG_ID` (valgfri)

---

### 17. 📊 Opik MCP
```json
{
  "command": "node",
  "args": ["scripts/run-opik-mcp.mjs"]
}
```
**Funksjoner:**
- LLM observability
- Traces & metrics
- Prompt management

**Krever:** `OPIK_API_KEY`

---

### 18. 📋 Linear MCP
```json
{
  "command": "node",
  "args": ["scripts/run-linear-mcp.mjs"]
}
```
**Funksjoner:**
- Issue tracking
- Projects & teams
- Cycles & milestones
- Comments & attachments

**Krever:** `LINEAR_API_KEY`

---

## 🐛 Monitoring/Testing MCP-er

### 19. 🚨 Sentry MCP
```json
{
  "command": "node",
  "args": ["scripts/run-sentry-mcp.mjs"]
}
```
**Funksjoner:**
- Error tracking
- Issues & events
- Releases
- Performance monitoring

**Krever:** `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

---

### 20. 📈 Binance MCP *(Ny!)*
```json
{
  "command": "node",
  "args": ["scripts/run-binance-mcp.mjs"]
}
```
**Funksjoner:**
- Market data (prices, order books, klines)
- Trading (spot, limit/market orders)
- Account information
- Order management
- Trade history

**Krever:** `BINANCE_API_KEY`, `BINANCE_API_SECRET` (for trading)

**Testnet støtte:** `BINANCE_TESTNET=true`

---

## 🔐 Påkrevde Environment Variables

### Kritiske (Må konfigureres)
```bash
# Database
SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...

# Deployment
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...

# Betaling
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# Infrastruktur
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_ACCOUNT_ID=...

# E-post
RESEND_API_KEY=re_...

# Monitoring
SENTRY_AUTH_TOKEN=...

# Project Management
LINEAR_API_KEY=lin_api_...
GITHUB_TOKEN=ghp_...

# Trading (valgfri for markedsdata)
BINANCE_API_KEY=...
BINANCE_API_SECRET=...
```

---

## 📁 Konfigurasjonsfiler

| Fil | Formål |
|-----|--------|
| `.cursor/mcp.json` | Cursor IDE integrasjon |
| `.mcp/mcp_config.json` | CI/CD og verktøy |
| `.kimi/mcp-config.json` | KIMI CLI integrasjon |
| `mempalace.yaml` | Mempalace konfigurasjon |
| `.env.local` | API nøkler (ikke commit) |

---

## 🚀 Hurtigstart

### Synkroniser MCP-konfigurasjon
```bash
npm run mcp:sync
```

### Verifiser alle MCP-tilkoblinger
```bash
npm run mcp:check
```

### Test spesifikk MCP
```bash
node scripts/run-cloudflare-mcp.mjs
node scripts/run-binance-mcp.mjs
node scripts/run-openai-mcp.mjs
```

---

## 📊 MCP Server Matrix

| MCP | Read | Write | API Key | Lokalt | Remote |
|-----|------|-------|---------|--------|--------|
| cloudflare | ✅ | ✅ | ✅ | ✅ | ✅ |
| vercel | ✅ | ✅ | ✅ | ✅ | ✅ |
| filesystem | ✅ | ✅ | ❌ | ✅ | ❌ |
| supabase | ✅ | ✅ | ✅ | ✅ | ✅ |
| supabase-db | ✅ | ✅ | ✅ | ✅ | ✅ |
| klarpakke | ✅ | ✅ | ✅ | ✅ | ✅ |
| mempalace | ✅ | ✅ | ❌ | ✅ | ❌ |
| stripe | ✅ | ✅ | ✅ | ✅ | ✅ |
| vipps | ✅ | ✅ | ✅ | ✅ | ✅ |
| openai | ✅ | ✅ | ✅ | ✅ | ✅ |
| perplexity | ✅ | ❌ | ✅ | ✅ | ✅ |
| binance | ✅ | ✅* | ⚠️ | ✅ | ✅ |
| sentry | ✅ | ✅ | ✅ | ✅ | ✅ |
| resend | ❌ | ✅ | ✅ | ✅ | ✅ |
| playwright | ✅ | ✅ | ❌ | ✅ | ❌ |
| chrome-devtools | ✅ | ❌ | ❌ | ✅ | ❌ |
| github | ✅ | ✅ | ✅ | ✅ | ✅ |
| linear | ✅ | ✅ | ✅ | ✅ | ✅ |
| context7 | ✅ | ❌ | ❌ | ✅ | ✅ |
| opik | ✅ | ✅ | ✅ | ✅ | ✅ |

*Binance trading krever API key, markedsdata er gratis

---

## 🔧 Feilsøking

### MCP starter ikke
1. Sjekk at nødvendige env vars er satt
2. Verifiser at script-filen er kjørbar: `chmod +x scripts/run-*.mjs`
3. Sjekk Node versjon: `node --version` (krever 20+)

### API-feil
1. Verifiser API nøkler i `.env.local`
2. Sjekk at tokens ikke er utløpt
3. Verifiser tillatelser/scopes

### Network issues
1. Sjekk proxy-innstillinger
2. Verifiser at API-endepunkter er tilgjengelige
3. Sjekk rate limiting

---

## 📝 Versjonshistorikk

| Versjon | Dato | Endringer |
|---------|------|-----------|
| 2.1 | 2026-04-10 | Lagt til: cloudflare, mempalace, binance, openai |
| 2.0 | 2026-04-06 | Konsolidert konfigurasjon, fjernet ubrukte servere |
| 1.0 | 2026-02-20 | Initial setup |

---

## 🔗 Ressurser

- [MCP Specification](https://modelcontextprotocol.io/)
- [Cursor MCP Docs](https://docs.cursor.com/context/model-context-protocol)
- [Klarpakke MCP Guide](MCP-GUIDE.md)
- [Mempalace Guide](MEMPALACE-KIMI-GUIDE.md)

---

**Full kontroll etablert.** Alle 20 MCP-servere er konfigurert og klare til bruk. 🎯
