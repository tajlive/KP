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
- K3 weights slippes 27. juli under MIT-lisens → selv-hosting mulig

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
