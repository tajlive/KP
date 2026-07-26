# Klarpakke — Agent Instructions (2026)

**Prosjekt:** Klarpakke — AI Trading Platform for småsparere  
**Produksjon:** https://www.klarpakke.no  
**Stack:** Next.js 16 · React 19 · TypeScript 5.9 · Supabase · Cloudflare Workers  
**Node:** 24.18.0  
**Domene:** klarpakke.no via Cloudflare DNS (zone 328d7de7)  
**Supabase-prosjekt:** `pskhryjzkobytnfwucrb`  
**Testbruker:** `tomarnejensen@gmail.com` / `TestTest123!`

> Hermes-spesifikk kontekst (modellparametere, provider-konfig) ligger i `.hermes.md` (auto-loades). Denne filen er for alle agenter — Hermes, Claude Code, Codex, og manuelle utviklere.

---

## 🧠 Modellruting (2026)

| Oppgavetype | Modell | Begrunnelse |
|---|---|---|
| Kodeimplementasjon, PR-arbeid, debugging | **DeepSeek V4 Pro** (deepseek-chat) | Presisjon, 128K context |
| Rutinearbeid — i18n, lint-fikser, små patcher | **DeepSeek V4 Flash** (deepseek-v4-flash) | Rask, billig |
| Kodegjennomgang, kvalitetskontroll | **DeepSeek V4 Pro** (deepseek-chat) | Nøyaktig diff-analyse |
| Subagenter (delegate_task) | **DeepSeek V4 Flash** (deepseek-v4-flash) | Rask parallellisering |
| Arkitektur, systemdesign (K3 1M) | **Kimi K3** via Pi CLI | Kun Pi — krever `thinking`-param |

**Fallback-kjede:** gemini → kimi-coding → openrouter → nous

**Merk:** K3 kan IKKE brukes via Hermes fallback — krever `thinking`-parameter som custom provider ikke sender. Bruk Pi CLI direkte: `pi` → `/model kimi-coding/k3`.

---

## 🔧 Utvikling

```bash
npm run dev           # Lokal utvikling
npm run build         # next build
npm run lint          # ESLint
npm run test:unit     # Vitest
npm run cf:build      # next build + opennextjs --skipNextBuild
```

## 🚀 Deploy (manuell)

```bash
bash scripts/deploy.sh
```

Viktig:
- **`npm run deploy` er hard-blokkert for agenter** — bruk alltid `scripts/deploy.sh`
- Kjør `pkill -9 node` før bygg (clearer zombie-prosesser)
- Aldri kjør to deploys i parallell
- `opennextjs-cloudflare build` feiler på pre-eksisterende TS-feil. Bruk 2-steg: `next build` → `opennextjs --skipNextBuild`

## 🏗️ Arkitektur (viktig!)

### Auth
- **Client-side only.** `requireAuth()` feiler på Cloudflare Workers SSR.
- Auth via `AuthProvider` / `useAuth()` hook.
- Supabase cookies håndteres av createBrowserClient.

### i18n
- Alle nøkler i **konsoliderte** `messages/no.json` / `messages/en.json`.
- Split-filer fungerer **ikke** i Cloudflare Worker.
- **Norsk-først m/ løpende oversettelse:** nye nøkler kan skrives norsk i begge filer for hastighet. Engelsk oversettelse alltid velkommen løpende.

### Balance
- **Source of truth:** `paper_accounts.current_balance`
- DB trigger `sync_paper_balance()` synker til `user_profiles.paper_balance`
- Hvis balanse viser feil tall → sjekk triggeren eller sync manuelt

### Markedsdata
- Cloudflare Workers IP er **blokkert** av Binance.
- Priser hentes via Supabase Edge Function `binance-proxy`.
- Price cache: 10s in-memory TTL i BinanceMarketDataProvider.
- `coin_prices` tabellen oppdateres av cron `sync-prices`.

### Dashboard
- 4 adaptive views: NyBruker → Onboarded → AktivTrader → PowerUser
- `AdaptiveDashboard.tsx` dispatcher basert på `userState`
- Risikoscore 0 = nøytral (ingen data)

### Paper Trading
- Slippage: 0.2% (realistisk)
- `smart-trader-v3` Edge Function for auto-trading
- Auto-trade cron kjører daglig for testbrukere

## 🔒 Data- og tilgangsregler

### Browser-Supabase (kritisk)
- `.from()` / `.channel()` i `'use client'`-komponenter kjører **alltid som anon** → stille 0 rader/events.
- Bruker-data hentes KUN via `/api`-ruter (server-side).
- Pre-commit guard blokkerer nye `.from()`/`.channel()` i client-filer.
- Admin-APIer: `requireAdmin` → service-role for data.

### DB-migrasjoner (DB er hellig)
- Vis SQL-diff FØR migrasjon kjøres — **aldri kjør uten Toms godkjenning**.
- Aldri seed brukerdata (kun konfig).
- Rename krever idempotent innhold.
- Kun flate `.sql`-filer i `supabase/migrations/`.

### Trading-sesjoner
- `archived=true` = ekskluderes fra visninger.
- Auto-trading er opt-in via `user_auto_trading_configs.is_enabled`.

## 📱 UX-regler
- **~80% av trafikken er mobil** → mobil-først: 4 bunnfaner, 48px touch targets, safe-area.
- **Fakta-regel:** ingen uverifiserbare tall i copy — kun verifiserte fakta.

## 📁 Viktige stier

```
src/features/
├── dashboard/       AdaptiveDashboard, DashboardPro, PriceTicker
├── portfolio/       PortfolioClientPage, RiskMetricsPanel
└── trading/         PaperTradingList, UnifiedTradeTerminal, auto-trading/

src/app/[locale]/
├── (auth)/login
└── (user)/dashboard/  historikk, portfolio, analysis, resultater

src/lib/
├── auth/            AuthProvider, auth-actions
├── supabase/        client, server
├── trading/         strategy-configs, paper-executor, close-on-stop
└── navigation/      config.ts

messages/            no.json, en.json (konsolidert)
```

## 🤖 Hermes 2026 — agent-beste praksis

### Før hver oppgave
1. **Sjekk session_search** for relevant historikk — unngå å gjenskape løst arbeid
2. **Les relevante filer** før du endrer — `read_file` + `search_files` i batch
3. **Batch uavhengige verktøykall** — les flere filer samtidig, ikke sekvensielt

### Under arbeid
4. **Skill-basert:** last `klarpakke-dev` for dev-flow, `klarpakke-build` for bygg, `klarpakke-deploy` for deploy
5. **Verifiser hver endring:** `npm run lint` + `npm run test:unit` etter hver commit
6. **Bruk delegate_task** for parallelle oppgaver — 4 subagenter samtidig
7. **Pre-commit er obligatorisk** — 7-stegs pipeline må passere

### Etter arbeid
8. **Lagre lærdom som skill** ved komplekse oppgaver (5+ verktøykall)
9. **Oppdater AGENTS.md/.hermes.md** hvis nye regler/mønstre oppdages
10. **Session er ren:** `git status` skal være clean, ingen temp-filer

### Grenser (harde)
- ❌ Aldri `npm run deploy` uten Toms samtykke
- ❌ Aldri endre DB, triggere, eller RLS uten diff → godkjenning
- ❌ Aldri endre Stripe/Vipps uten eksplisitt oppdrag
- ⚠️ Stopp ved >10 filer eller tvetydig scope

## 🐛 Kjente issues
1. Binance 403 på Cloudflare → løst med proxy
2. ICU `select`-format brekker med apostrof → bruk forenklede meldinger
3. `opennextjs-cloudflare build` feiler på eksisterende TS-feil → bruk --skipNextBuild

## 📞 Kontakt
- Founder: Tom Jensen (tomarnejensen@gmail.com)
- Supabase: pskhryjzkobytnfwucrb
- Resend API, Sentry, Stripe/Vipps: se `.hermes.md`
