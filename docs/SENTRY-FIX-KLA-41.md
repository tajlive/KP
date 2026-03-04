# KLA-41: Sentry Org-Slug Fix

## Problem
Sentry MCP-integrasjon pekte til `elbatt-chatbot` org istedenfor `klarpakke`.

## Løsning

### 1. Kodeendringer

**next.config.mjs:**
- ✅ Aktivert `import { withSentryConfig } from '@sentry/nextjs'`
- ✅ Aktivert `export default withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions)`
- ✅ Konfigurert med org: `"klarpakke"`, project: `"klarpakke-web"`

**Sentry config-filer:**
- ✅ `sentry.client.config.ts` - Håndterer client-side errors
- ✅ `sentry.server.config.ts` - Håndterer server-side errors  
- ✅ `sentry.edge.config.ts` - Håndterer edge runtime errors

### 2. Miljøvariabler (Må settes i Vercel)

Gå til https://vercel.com/tom-jensens-projects/klarpakke/settings/environment-variables

Sett følgende verdier fra https://sentry.io/settings/klarpakke/projects/klarpakke-web/keys/:

```
NEXT_PUBLIC_SENTRY_DSN=https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
SENTRY_DSN=https://[PUBLIC_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
SENTRY_AUTH_TOKEN=[sntryu_xxx]  # Hvis ny token trengs
```

### 3. Verifiser etter deploy

Test i browser console:
```javascript
throw new Error('Test error for Sentry');
```

Sjekk at error dukker opp på: https://sentry.io/organizations/klarpakke/issues/

### 4. Sentry Features Aktivert

- ✅ Error tracking (JavaScript exceptions)
- ✅ GDPR-compliant (maskerer sensitive felter)
- ✅ Source map upload (i CI/CD)
- ✅ Performance monitoring (10% sampling i prod)
- ✅ Session replay (10% sampling, maskerer all tekst)
- ✅ Tunnel route (/monitoring) for å unngå ad-blockers

## MCP Integrasjon

Sentry MCP er konfigurert i:
- `.cursor/mcp.json`
- `.kimi/mcp_config.json`

URL: `https://mcp.sentry.io`

**Merk:** Hvis MCP fortsatt peker til `elbatt-chatbot`, må du:
1. Gå til https://sentry.io/settings/account/api/auth-tokens/
2. Generere ny token for `klarpakke` org
3. Oppdatere MCP-konfigurasjonen med ny token

## Status

- [x] Sentry aktivert i Next.js config
- [x] Org slug satt til "klarpakke"
- [x] Project satt til "klarpakke-web"
- [ ] DSN satt i Vercel miljøvariabler (MANUELL STEG)
- [ ] Testet i produksjon (ETTER DEPLOY)
