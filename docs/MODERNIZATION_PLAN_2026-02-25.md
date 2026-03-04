# 🚀 KLARPAKKE MODERNISERINGSPLAN
**Dato:** 2026-02-25 | **Utfører:** KIMI Code

---

## 📊 FASE 0 FUNN

### Struktur Status
```
src/
├── types/              ✅ Hovedtypes (database.ts, index.ts, trading.ts, etc.)
├── lib/types/          ❌ DUPLIKAT - kun trading.ts (må slettes)
├── context/            ⚠️ SimulatorContext.tsx (vurder konvertering til Zustand)
├── providers/          ✅ ToastProvider.tsx (beholdes)
├── store/              ✅ tradingStore.ts (Zustand - beholdes)
└── index.js            ⚠️ Må konverteres til TypeScript
```

### Dependencies Status
| Pakke | Status | Kommentar |
|-------|--------|-----------|
| `@supabase/ssr` | ✅ Installert | Men kode bruker fortsatt gamle patterns |
| `@supabase/auth-helpers-nextjs` | ✅ Ikke installert | Allerede migrert ✓ |
| `@tanstack/react-query` | ✅ Installert | 5.90.21 - OK |
| Vitest + testing-library | ✅ Installert | OK |
| Sentry | ❌ Mangler | Må installeres |
| Tailwind | ⚠️ v3.4.0 | Er på v3, vurder v4 |

### Supabase Imports som må oppdateres
- `src/middleware.ts` - Bruker gamle patterns
- `src/app/[locale]/auth/callback/route.ts` - Gamle patterns
- `src/components/trading/index.tsx` - Gamle patterns
- `src/hooks/useTrading.ts` - Gamle patterns
- `src/hooks/usePrices.ts` - Gamle patterns
- `src/lib/shared.ts` - Gamle patterns
- `src/lib/supabase/client.ts` - Må verifisere @supabase/ssr
- `src/lib/supabase/server.ts` - Må verifisere @supabase/ssr
- `src/lib/subscription.ts` - Gamle patterns

### i18n Status
- `messages/no.json` - ✅ Eksisterer
- `messages/en.json` - ✅ Eksisterer  
- `messages/th.json` - ✅ Eksisterer
- `messages/zh.json` - ✅ Eksisterer
- ⚠️ Trenger synkronisering av keys mellom språk

### Vipps Referanser (må fjernes)
- `src/app/api/vipps*/` - Multiple API routes
- `src/app/api/webhooks/vipps/` - Webhook route
- `src/components/payment/Vipps*.tsx` - UI komponenter
- `src/app/[locale]/vipps/success/` - Success page

### Sentry Status
- ❌ Ikke installert
- ❌ Ingen error tracking konfigurert

### Dokumentasjon (må oppdateres)
- `.kimi/WORKFLOW_RULES.md` - Refererer fortsatt til Google Cloud ❌
- `.kimi/MASTER_PROMPT.md` - Kan ha utdaterte referanser
- `.kimi/MCP_CONFIG.md` - Kan ha utdaterte referanser

---

## 🏗️ MODERNISERINGSPLAN

### FASE 1: Rydd opp duplikat-struktur
- [ ] Flytt `src/lib/types/trading.ts` → `src/types/trading.ts` (hvis forskjellig)
- [ ] Slett `src/lib/types/`
- [ ] Oppdater imports fra `@/lib/types/*` → `@/types/*`
- [ ] Konverter `src/context/SimulatorContext.tsx` → Zustand store
- [ ] Konverter `src/index.js` → `src/index.ts`

### FASE 2: Dependency-modernisering
- [ ] Verifiser alle Supabase-klienter bruker @supabase/ssr
- [ ] Oppdater middleware.ts til moderne pattern
- [ ] Oppdater auth callback route
- [ ] Oppdater alle hooks som bruker Supabase
- [ ] Fjern ALLE Vipps-referanser
- [ ] Installer Sentry: `@sentry/nextjs`
- [ ] Konfigurer Sentry client/server config

### FASE 3: i18n komplettering
- [ ] Opprett scripts for å synkronisere keys mellom NO og EN
- [ ] Legg til manglende auto-trading oversettelser
- [ ] Legg til manglende trading-UI oversettelser
- [ ] Valider i18n med scripts/validate-i18n.js

### FASE 4: Test infrastruktur
- [ ] Verifiser vitest.config.ts er korrekt
- [ ] Verifiser src/test/setup.ts eksisterer
- [ ] Opprett unit tests for risk-manager
- [ ] Opprett integration tests for API security

### FASE 5: React Query hooks
- [ ] Verifiser QueryProvider eksisterer
- [ ] Verifiser trading hooks med React Query
- [ ] Legg til cache-invalidering

### FASE 6: Sentry error monitoring
- [ ] Installer @sentry/nextjs
- [ ] Opprett sentry.client.config.ts
- [ ] Opprett sentry.server.config.ts
- [ ] Konfigurer GDPR-filtrering
- [ ] Erstatt console.error i kritiske filer

### FASE 7: MCP Server
- [ ] Verifiser mcp-server struktur
- [ ] Oppdater tools for Supabase, Vercel, GitHub, Stripe
- [ ] Konfigurer MCP configs for KIMI, Claude, Perplexity
- [ ] Sett opp daily-brief cron

### FASE 8: Dokumentasjon
- [ ] Oppdater WORKFLOW_RULES.md - FJERN Google Cloud
- [ ] Oppdater MASTER_PROMPT.md med Vercel workflow
- [ ] Oppdater MCP_CONFIG.md
- [ ] Opprett DAILY_ROUTINE.md

### FASE 9: Final build og deploy
- [ ] npm run type-check
- [ ] npm run test
- [ ] npm run build
- [ ] Deploy til Vercel
- [ ] Verifiser deployment

---

## ⚠️ KJENTE UTFORDRINGER

1. **Vipps integrasjon** - Mange filer refererer til Vipps, må fjernes forsiktig
2. **Supabase patterns** - Flere hooks/components bruker fortsatt gamle patterns
3. **Tailwind v3→v4** - Krever potensielt store endringer, vurder om nødvendig
4. **SimulatorContext** - Krever refactoring til Zustand

---

## 📝 GJENSTÅR Å UTFØRE

Se den detaljerte 10-fase planen i brukerens prompt for konkrete implementasjonsinstruksjoner.
