# MCP Optimalisering for Klarpakke — Implementasjonsplan

> **For Hermes:** Utfør steg for steg — hver MCP er uavhengig. Kjør `hermes mcp test <navn>` etter hver installasjon for å verifisere.

**Mål:** Koble alle 7 MCP-servere (Cloudflare, GitHub, Supabase, Stripe, Resend, Sentry, Browserbase) — gi Hermes full kontroll over hele infrastrukturen.

**Nåværende status:** 3 av 7 aktive (Cloudflare, GitHub, Supabase konfigurert — Cloudflare og GitHub må aktiveres med `/new`).

---

## Oversikt over alle MCP-servere

| # | MCP | Pakke/URL | Auth | Status |
|---|---|---|---|---|
| 1 | Cloudflare | `npx @cloudflare/mcp-server-cloudflare run <account_id>` | OAuth (wrangler) | ✅ Konfigurert |
| 2 | GitHub | `npx -y @modelcontextprotocol/server-github` | `GITHUB_PERSONAL_ACCESS_TOKEN` | ✅ Konfigurert |
| 3 | Supabase | `https://mcp.supabase.com/mcp` | API key | ✅ Aktiv |
| 4 | Stripe | `https://mcp.stripe.com/mcp` | `STRIPE_SECRET_KEY` | ⏳ Ny |
| 5 | Resend | `npx -y resend-mcp` | `RESEND_API_KEY` | ⏳ Ny |
| 6 | Sentry | `npx -y @sentry/mcp-server` | `SENTRY_AUTH_TOKEN` | ⏳ Ny |
| 7 | Browserbase | `npx -y mcp-remote https://mcp.browserbase.com/mcp` | `BROWSERBASE_API_KEY` | ⏳ Ny |

---

## Fase 1: Forberedelse — API-nøkler

### Task 1.1: Verifiser eksisterende nøkler

**Mål:** Bekreft at alle nødvendige API-nøkler er tilgjengelige.

**Sjekk:**
```bash
# Allerede i .env:
grep -c 'BROWSERBASE_API_KEY' /Users/taj/.hermes/.env  # Skal være 1
grep -c 'RESEND_API_KEY' /Users/taj/.hermes/.env        # Sjekk om finnes
grep -c 'STRIPE_SECRET_KEY' /Users/taj/.hermes/.env     # Sjekk om finnes
grep -c 'SENTRY_AUTH_TOKEN' /Users/taj/.hermes/.env     # Sjekk om finnes
```

**Kjente nøkler:**
- Resend: `re_GWaFt2VN_MJN3uwRDKHHTbwVBFo1gpANE` (fra `.hermes.md`)
- Stripe: live secret key (må hentes fra Stripe Dashboard)
- Sentry: auth token (må genereres på sentry.io → Settings → Auth Tokens)
- Browserbase: allerede i `.env` ✅

### Task 1.2: Legg manglende nøkler i `.env`

**Mål:** Alle API-nøkler i `/Users/taj/.hermes/.env`.

```bash
# Hvis mangler, legg til:
echo "RESEND_API_KEY=re_GWaFt2VN_MJN3uwRDKHHTbwVBFo1gpANE" >> /Users/taj/.hermes/.env
echo "STRIPE_SECRET_KEY=sk_live_***" >> /Users/taj/.hermes/.env          # Hent fra Stripe Dashboard
echo "SENTRY_AUTH_TOKEN=sntrys_***" >> /Users/taj/.hermes/.env          # Generer på sentry.io
```

**Verifiser:**
```bash
grep -E 'RESEND_API_KEY|STRIPE_SECRET_KEY|SENTRY_AUTH_TOKEN|BROWSERBASE_API_KEY' /Users/taj/.hermes/.env | grep -v '^#'
```

---

## Fase 2: Stripe MCP

### Task 2.1: Test Stripe remote MCP

**Mål:** Koble til Stripes hosted MCP-server.

**Kommando:**
```bash
hermes mcp add stripe --url https://mcp.stripe.com/mcp --auth oauth --connect-timeout 15
```

**Forventet:** OAuth-flow åpnes i nettleser → logg inn på Stripe → server kobles til.

**Hvis OAuth feiler:** Bruk header-basert auth med secret key:
```bash
hermes mcp add stripe --url https://mcp.stripe.com/mcp --auth header --connect-timeout 15
# Skriv inn STRIPE_SECRET_KEY ved prompt
```

### Task 2.2: Verifiser Stripe-verktøy

```bash
hermes mcp test stripe
```

**Forventet:** 15-25 verktøy oppdaget — `stripe_api_read`, `stripe_api_write`, `stripe_api_search`, `stripe_docs_search`.

### Task 2.3: Konfigurer i config.yaml (hvis OAuth feiler)

Hvis OAuth ikke fungerer, legg til manuelt i `/Users/taj/.hermes/config.yaml`:

```yaml
mcp_servers:
  stripe:
    url: https://mcp.stripe.com/mcp
    headers:
      Authorization: Bearer <STRIPE_SECRET_KEY>
```

---

## Fase 3: Resend MCP

### Task 3.1: Installer og koble Resend MCP

**Mål:** Koble til Resend for e-post.

**Kommando:**
```bash
hermes mcp add resend --command npx --args -y resend-mcp --env "RESEND_API_KEY=re_GWaFt2VN_MJN3uwRDKHHTbwVBFo1gpANE" --connect-timeout 15
```

### Task 3.2: Verifiser Resend-verktøy

```bash
hermes mcp test resend
```

**Forventet:** 10-15 verktøy — `send_email`, `list_emails`, `get_email`, `create_contact`, `list_contacts`, `create_broadcast`.

---

## Fase 4: Sentry MCP

### Task 4.1: Installer Sentry MCP

**Mål:** Koble til Sentry for feilsporing.

**Forutsetning:** `SENTRY_AUTH_TOKEN` må være i `.env` (genereres på https://klarpakke-h3.sentry.io/settings/auth-tokens/).

**Kommando:**
```bash
hermes mcp add sentry --command npx --args -y @sentry/mcp-server --env "SENTRY_AUTH_TOKEN=<token>" --connect-timeout 15
```

### Task 4.2: Verifiser Sentry-verktøy

```bash
hermes mcp test sentry
```

**Forventet:** 8-12 verktøy — `list_issues`, `get_issue`, `resolve_issue`, `list_projects`, `search_events`.

---

## Fase 5: Browserbase MCP

### Task 5.1: Koble Browserbase MCP

**Mål:** Stagehand-drevet browser-automasjon via MCP.

**Kommando:**
```bash
hermes mcp add browserbase --command npx --args -y mcp-remote https://mcp.browserbase.com/mcp --env "BROWSERBASE_API_KEY=<token>" --connect-timeout 15
```

Token: allerede i `.env` som `BROWSERBASE_API_KEY`.

### Task 5.2: Verifiser Browserbase-verktøy

```bash
hermes mcp test browserbase
```

**Forventet:** 6 verktøy — `start`, `end`, `act`, `extract`, `observe`, `screenshot`.

---

## Fase 6: Aktivering og verifisering

### Task 6.1: `/new` — last inn alle MCP

Alle MCP-servere lastes ved øktstart. Kjør `/new` etter at alle er konfigurert.

### Task 6.2: Full verifisering

```bash
hermes mcp list
```

**Forventet:**
```
cloudflare    npx @cloudflare/mcp-server-cloudflare  all  ✓ enabled
github        npx @modelcontextprotocol/server-github all  ✓ enabled
supabase      https://mcp.supabase.com/mcp            all  ✓ enabled
stripe        https://mcp.stripe.com/mcp               all  ✓ enabled
resend        npx resend-mcp                           all  ✓ enabled
sentry        npx @sentry/mcp-server                   all  ✓ enabled
browserbase   npx mcp-remote https://mcp.browserbase.com/mcp  all  ✓ enabled
```

### Task 6.3: Test hver MCP med en reell operasjon

```bash
# Stripe: list products
# (bruk mcp__stripe__stripe_api_read path="/v1/products" i chat)

# Resend: send test email
# (bruk mcp__resend__send_email i chat)

# Sentry: list issues
# (bruk mcp__sentry__list_issues i chat)

# Browserbase: start session
# (bruk mcp__browserbase__start i chat)
```

---

## Fase 7: Oppdater dokumentasjon

### Task 7.1: Oppdater `.hermes.md`

Legg til MCP-seksjon med alle 7 servere.

### Task 7.2: Oppdater `AGENTS.md`

Legg til MCP-verktøyoversikt i agent-beste praksis.

---

## Avhengigheter og rekkefølge

```
Task 1.1 → 1.2 (nøkler)
         ↓
    2.1 → 3.1 → 4.1 → 5.1  (parallelle, uavhengige)
         ↓
    6.1 → 6.2 → 6.3         (verifisering)
         ↓
    7.1 → 7.2               (docs)
```

## Risikoer

| Risiko | Sannsynlighet | Løsning |
|---|---|---|
| Stripe OAuth feiler | Medium | Fallback til header-based auth med secret key |
| Sentry token mangler | Høy | Generer på sentry.io → Settings → Auth Tokens → `project:read issue:read issue:write` |
| Resend rate-limit | Lav | Free tier: 100 emails/day — nok for testing |
| Browserbase remote MCP treg | Lav | Lokal fallback: `npx @browserbase/mcp-server-browserbase` |

## Estimert tid

| Fase | Tid |
|---|---|
| 1: Nøkler | 5 min |
| 2-5: MCP installasjon | 20 min (4 × 5 min) |
| 6: Verifisering | 5 min |
| 7: Dokumentasjon | 5 min |
| **Totalt** | **35 min** |
