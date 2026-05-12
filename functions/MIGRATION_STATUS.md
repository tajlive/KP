# Cloudflare Migreringsstatus

**Dato:** 2026-05-12  
**Mål:** Full emigrering fra Vercel til Cloudflare Pages + Supabase

---

## ✅ Fullført

### Infrastruktur
- [x] `wrangler.toml` konfigurert
- [x] Cloudflare-pakker installert (`wrangler`, `@cloudflare/next-on-pages`)
- [x] Pre/post build scripts for lokal dev
- [x] `next.config.mjs` oppdatert for Cloudflare-kompatibilitet

### Frontend
- [x] Cloudflare Pages-bygg fungerer (393M, ~84s)
- [x] ISR konvertert til `force-dynamic`
- [x] `runtime = 'edge'` i ~120 filer
- [x] `next/image` konfigurert for Cloudflare

### Workers (Cloudflare)
- [x] `functions/api/health.ts` — Health check
- [x] `functions/api/track/click.ts` — Email click tracking
- [x] `functions/api/track/funnel.ts` — Funnel tracking
- [x] `functions/api/track/open.ts` — Email open pixel
- [x] `functions/api/revalidate.ts` — Cache invalidation
- [x] `functions/api/fx/usdt-nok.ts` — Exchange rate
- [x] `functions/api/webhooks/sanity.ts` — Sanity CMS webhook
- [x] `functions/api/_router.ts` — API bridge (fallback til Vercel)
- [x] `functions/api/[[path]].ts` — Universal API proxy (Supabase REST)
- [x] `functions/api/_supabase-proxy.ts` — Generic proxy

### Konvertert via script
- [x] 48 individuelle Workers fylt ut med logikk fra Next.js routes

---

## 🔄 Ukonvertert (bruker API bridge / universal proxy)

### Kritiske — Krever manuell konvertering (HIGH PRIORITY)
| Route | Årsak | Strategi |
|-------|-------|----------|
| `/api/webhooks/stripe` | 644 linjer, Stripe SDK, betalinger | Supabase Edge Function |
| `/api/v1/trading/panic` | 242 linjer, P0 safety, `executeTrade` | Supabase Edge Function |
| `/api/auth/diagnose` | 283 linjer, OAuth-debugging | Cloudflare Worker |
| `/api/v1/nlq` | 294 linjer, AI/NLQ | Supabase Edge Function |

### Komplekse — Krever manuell konvertering (MEDIUM PRIORITY)
| Route | Årsak | Strategi |
|-------|-------|----------|
| `/api/v1/admin/*` | Admin-panel, sensitive operasjoner | Supabase Edge Function |
| `/api/v1/ai/*` | AI-inferens, OpenAI/Anthropic | Supabase Edge Function |
| `/api/v1/notifications/*` | Push-notifikasjoner | Cloudflare Worker |
| `/api/copy-trading/*` | Copy-trading logikk | Supabase Edge Function |
| `/api/gamification/award` | Gamification | Cloudflare Worker |
| `/api/marketplace/listings` | Marketplace | Cloudflare Worker |
| `/api/admin/*` | Admin dashboard | Supabase Edge Function |
| `/api/ai/*` | AI features | Supabase Edge Function |
| `/api/cron/*` | Cron-jobs (men disse kjører i pg_cron!) | **Ingen endring nødvendig** |
| `/api/binance/*` | Binance API integrasjon | Supabase Edge Function |
| `/api/trading/*` | Trading-execution | Supabase Edge Function |
| `/api/signal/*` | Signal-generering | Supabase Edge Function |
| `/api/notifications/send` | Email/SMS sending | Cloudflare Worker |

### Simple — Dekkes av universal proxy (LOW PRIORITY)
- `/api/v1/user/*` — User CRUD
- `/api/v1/payments/*` — Payment CRUD
- `/api/v1/progress/*` — Progress CRUD
- `/api/v1/exchanges/*` — Exchange CRUD
- `/api/v1/trades/*` — Trade CRUD
- `/api/v1/signals/*` — Signal CRUD
- `/api/v1/marketplace/*` — Marketplace CRUD
- `/api/v1/market/*` — Market data CRUD
- `/api/v1/stats/*` — Stats CRUD
- `/api/v1/onboarding/*` — Onboarding CRUD
- `/api/v1/analytics/*` — Analytics CRUD
- `/api/v1/design-tokens` — Design tokens
- `/api/v1/health/*` — Health sub-routes
- `/api/referral` — Referral
- `/api/trading-sessions/*` — Session CRUD

---

## 🔴 Blokkerende for deploy

1. **Cloudflare API Token utløpt** (feb 2026)
   - Løsning: Generer nytt token på https://dash.cloudflare.com/profile/api-tokens
   - Oppdater `.env.local` og GitHub Secrets

2. **Stripe webhook URL må oppdateres** (etter DNS-switch)
   - Stripe Dashboard → Webhooks → Endre URL til `https://klarpakke.no/api/webhooks/stripe`

---

## 📋 Neste steg (prioritert)

### Før deploy:
1. [ ] Generer nytt Cloudflare API token
2. [ ] Opprett KV namespaces: `CACHE`, `SESSIONS`
3. [ ] Opprett R2 bucket: `klarpakke-exports`
4. [ ] Opprett D1 database: `klarpakke-edge`
5. [ ] Oppdater `wrangler.toml` med faktiske IDs

### Deploy (staging):
6. [ ] `npm run cf:deploy:staging`
7. [ ] Sett alle secrets via `wrangler pages secret put`
8. [ ] E2E-test med Playwright mot `*.pages.dev`

### Deploy (produksjon):
9. [ ] `npm run cf:deploy`
10. [ ] DNS-switch: pek `klarpakke.no` til Cloudflare Pages
11. [ ] Overvåk i 24 timer

### Post-deploy (gradvis):
12. [ ] Konverter kritiske routes (Stripe, trading/panic)
13. [ ] Konverter admin-routes
14. [ ] Konverter AI-routes
15. [ ] Fjern Vercel-avhengigheter
16. [ ] Oppdater ADR-003
