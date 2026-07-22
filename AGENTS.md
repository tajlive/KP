# Klarpakke — Agent Instructions

**Prosjekt:** Klarpakke — AI Trading Platform for småsparere  
**Produksjon:** https://www.klarpakke.no  
**Stack:** Next.js 16 · React 19 · TypeScript 5.9 · Supabase · Cloudflare Workers · Stripe · Vipps · Resend  
**Node:** 24.18.0  
**Domene:** klarpakke.no via Cloudflare DNS (zone 328d7de7)  
**AI-modell:** Kimi K3 (Allegretto) — 1M context, temp=1  
**Supabase-prosjekt:** `pskhryjzkobytnfwucrb`  
**Testbruker:** `tomarnejensen@gmail.com` / `TestTest123!`

> Hermes-spesifikk kontekst ligger i `.hermes.md` (auto-loades). Denne filen er for alle agenter.

---

## 🔧 Utvikling

```bash
npm run dev           # Lokal utvikling
npm run build         # next build
npm run lint          # ESLint
npm run test:unit     # Vitest
npm run cf:build      # next build + opennextjs --skipNextBuild
npm run deploy        # cf:build + wrangler deploy --env ""
```

## 🚀 Deploy (manuell)

CI-runner er **fjernet**. Deploy gjøres manuelt:

```bash
npm run deploy
```

Viktig:
- Kjør `pkill -9 node` før bygg (clearer zombie-prosesser)
- `opennextjs-cloudflare build` feiler på pre-eksisterende TS-feil. Bruk 2-steg: `next build` → `opennextjs --skipNextBuild`
- CDN purge: `curl -X POST "https://api.cloudflare.com/client/v4/zones/328d7de7e8e48308fd4f9d760da5b18f/purge_cache" ...`
- Siste deploy: 2026-07-20

## 🏗️ Arkitektur (viktig!)

### Auth
- **Client-side only.** `requireAuth()` feiler på Cloudflare Workers SSR.
- Auth via `AuthProvider` / `useAuth()` hook.
- Supabase cookies håndteres av createBrowserClient.
- OAuth token for Kimi K3 auto-refreshes via launchd hvert 15. min.

### i18n
- Alle nøkler i **konsoliderte** `messages/no.json` / `messages/en.json`.
- Split-filer (profile.json) fungerer **ikke** i Cloudflare Worker.
- Nye nøkler må legges i riktig namespace i hovedfilene.

### Balance
- **Source of truth:** `paper_accounts.current_balance`
- DB trigger `sync_paper_balance()` synker til `user_profiles.paper_balance`
- Hvis balanse viser feil tall → sjekk triggeren eller sync manuelt

### Markedsdata
- Cloudflare Workers IP er **blokkert** av Binance.
- Priser hentes via Supabase Edge Function `binance-proxy` (publicApi action).
- Fallback: direkte Binance API.
- Price cache: 10s in-memory TTL i BinanceMarketDataProvider.
- `coin_prices` tabellen oppdateres av cron `sync-prices`.

### Dashboard
- 4 adaptive views: NyBruker → Onboarded → AktivTrader → PowerUser
- `AdaptiveDashboard.tsx` dispatcher basert på `userState`
- `DashboardPro.tsx` = aktiv trader-view
- Risikoscore 0 = nøytral (ingen data), ikke høy risiko

### Paper Trading
- Slippage: 0.2% (realistisk)
- `smart-trader-v3` Edge Function for auto-trading
- Auto-trade cron kjører daglig for testbrukere

## 📁 Viktige stier

```
src/
├── features/
│   ├── dashboard/       AdaptiveDashboard, DashboardPro, PriceTicker
│   ├── portfolio/       PortfolioClientPage, RiskMetricsPanel
│   └── trading/         PaperTradingList, UnifiedTradeTerminal
├── app/
│   └── [locale]/
│       ├── (auth)/      login
│       └── (user)/
│           └── dashboard/  historikk, portfolio, analysis, resultater
├── lib/
│   ├── auth/            AuthProvider, auth-actions
│   ├── supabase/        client, server
│   ├── trading/         strategy-configs, paper-executor
│   └── navigation/      config.ts
└── messages/            no.json, en.json (konsolidert)
```

## 🧪 K3-model

```yaml
provider: custom
base_url: https://api.kimi.com/coding/v1
model: k3
temperature: 1          # K3 KREVER temperature=1 (K2.7 fungerer også)
max_tokens: 32000
context_length: 1048576
reasoning_effort: max
```

- K2.7 Highspeed: gratis via pi OAuth, fungerer med temperature=1
- K3 weights slippes 27. juli under Modified MIT — selv-hosting krever ~650 GB–1 TB minne og 64+ GPUer. Ikke aktuelt for oss. Bruk hosted API.

## 🧭 Modellruting & grenser (K3 / K2.7)

### Modellvalg
| Oppgavetype | Modell |
|---|---|
| Arkitektur, multi-fil refaktorering, vanskelig debugging | **K3** |
| i18n-nøkler, små UI-justeringer, enkle scripts, batch-jobber | **K2.7 Highspeed** (gratis) |

### K3-regler (kjente fallgruver)
1. **Aldri bytt modell midt i en økt.** K3 er trent på å bevare reasoning-historikk; mid-session switch gir ustabil output. Start ny økt ved modellbytte.
2. **K3 er overproaktiv.** Den tar egne beslutninger ved tvetydighet. Grensene under er derfor bindende.
3. **Hallusinasjonsraten er høyere enn K2.** Verifiser alltid med `npm run lint && npm run test:unit` etter endringer.
4. **Prompt-caching:** cache-treff koster 10× mindre ($0.30 vs $3.00/M input). Unngå å redigere AGENTS.md/.hermes.md midt i tunge økter — det invaliderer cachen.
5. Reasoning-trace telles som output-tokens ($15/M). Bruk K2.7 til rutinearbeid.

### Grenser (gjelder ALLE agenter)
- ❌ **Aldri** kjør `npm run deploy` uten eksplisitt samtykke fra Tom
- ❌ **Aldri** endre DB-migrasjoner, triggere eller RLS-policies uten å vise diff og få godkjenning først
- ❌ **Aldri** endre Stripe/Vipps-integrasjonen uten eksplisitt oppdrag
- ⚠️ **Stopp og spør** hvis en endring berører flere enn 10 filer
- ⚠️ **Stopp og spør** ved tvetydighet om scope — ikke gjett (jf. `48ebef74e` hvor et script manglet kode og måtte reverteres)
- ✅ Etter hver økt: `npm run lint && npm run test:unit` skal være grønn før commit

### Fallback
Hvis K3-endepunktet er tregt/nede: bytt til K2.7 Highspeed i **ny økt** (aldri mid-session).

## 🐛 Kjente issues

1. Binance 403 på Cloudflare → løst med proxy
2. ICU `select`-format brekker med apostrof (D'Souza) → bruk forenklede meldinger
3. `opennextjs-cloudflare build` feiler på eksisterende TS-feil → bruk --skipNextBuild
4. Høy risikoscore ved 0 trades → løst (viser nøytral)

## 📞 Kontakt

- Founder: Tom Jensen (tomarnejensen@gmail.com)
- Supabase: pskhryjzkobytnfwucrb
- Resend API: re_GWaFt2VN_MJN3uwRDKHHTbwVBFo1gpANE
- Sentry: klarpakke-h3 / klarpakke-no
- Stripe/Vipps: live
