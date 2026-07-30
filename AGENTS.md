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

## 📌 STATUS 2026-07-29 (fra Kimi — redaktør, kode, sosiale medier)

**Mandat (oppdatert 2026-07-30):** Tom har utnevnt Kimi til **hovedarkitekt med ansvar for hele prosjektet** — arkitektur, design, funksjonalitet, logikk, kode, infrastruktur, DB, deploy, overvåking, innhold, samt løpende oppdatering og optimalisering av alle flater. Kimi har full DB-tilgang og deploy-mandat («fiks alt») og skal proaktivt forbedre produktet uten å bli bedt. Hermes er underordnet Kimis arkitekturbeslutninger. Koordiner via denne filen.

**Aktivt fokus frem til live-lansering fredag 2026-08-07:** JokerTrade i optimal stand. Historiske trading-data før 2026-07-30 kl. 11:00 UTC er forurenset — kun nyere data teller. Overvåkingskjede: `cron_health_events` (15-min innsamling) + «Klarpakke Feiljeger» (07:41 daglig) + «JokerTrade daglig rapport» (08:17 daglig).

### Deployet 2026-07-29 kveld (Kimi — 7 deploys, alle verifisert i prod)
1. **Full prodsjekk** (WebBridge, 13 sider): fant graf-bug, i18n-lekkasje, tittel-feil.
2. **Porteføljegraf FIKSET:** dyp rotårsak var at `setHasData(true)` aldri ble kalt — grafen kunne aldri rendres. + kontovisning ankres nå til `accountStart` (kumulativ PnL på tvers av sesjoner). «Last graf på nytt» vises kun ved faktisk feil; ellers ærlig tomtilstand.
3. **Hero-prosent FIKS 6:** `DashboardTopBar` viste saldo fra konto men % fra sesjons-sum → −65,86 % ble −4,25 % (korrekt).
4. **JokerTrade åpen for alle:** `lockedModes` i `UnifiedTradeTerminal.tsx` er nå kun `["auto"]` for nye brukere (Toms beslutning).
5. **Norsk nav-fallback** («Lær/Priser/Om oss»), `about.metadata`-nøkler (rå i18n-nøkkel var side-tittel), rene titler («Handel | Klarpakke»), 301-redirects `/no/pricing|learn|about` → norske sider.
6. **Landing-redesign:** ny hero «100 000 kr i lekepenger. Ekte markeder. Null risiko.», KLT-badge, én primær CTA, mørk 64px header, «+889 %»-gevinstløfte fjernet (`getTopReturn` slettet fra forsiden).
7. **Gevinstløfte-jakt:** 17 brudd rettet (FAQ «15–40 % månedlig», «+142,5 % verifiserte data», superlativer, uverifiserte tall). **24 døde filer slettet:** hele `features/jokertrade/`, `shared/social/`, `landing/LandingHero`, `AboutKlarpakkeSection` m.fl.

### Redaktørbeslutninger (gjeldende)
- **KLT = 5000** til de 100 første — det eneste godkjente tallet. «10 000 KLT» fjernet fra alle flater og språkfiler (no/en/th/zh).
- Historiske paper-trading-tall med disclaimer er tillatt; fremadrettede avkastningspåstander er forbudt.
- Toms personlige historie (/om-oss) er tillatt som førstepersons fortelling.

### Åpent (krever Tom)
- **Sanity CMS:** gjennomgå publiserte sider mot fakta-reglene (prosent-påstander, superlativer, «10 000 KLT», tall uten kilde). Koden er ren — CMS kan fortsatt inneholde brudd.
- **30-dagers pengene-tilbake-garanti** på /priser: verifiser at Stripe/Vipps faktisk håndhever dette.

### Deploy-notater (viktig for neste agent)
- `scripts/deploy.sh` kan overgå 5 min på treg maskin → kjør stegene manuelt: `npx next build` → `opennextjs-cloudflare build --skipNextBuild` → `wrangler deploy --env "" --var "APP_VERSION:$(git rev-parse --short HEAD)"` → CDN-purge (zone 328d7de7). Alle med `source .env.local`.
- **ALDRI `pkill node`** på denne maskinen — det dreper Kimi-runtime (node-prosessen under /Applications/Kimi.app). Ingen zombie-node er observert.
- Nettleser-cache kan vise gammel side etter deploy — tving `Page.reload {ignoreCache:true}` (CDP) ved verifisering. JS-chunks ches også — bruk `Network.setCacheDisabled` ved testing av nylig deployet kode.

### 🚨 Hendelse 2026-07-29 kveld: Trading brutt for alle (løst)
**Symptom:** JokerTrade/Auto «står starter, også skjer det ingenting» — for alle brukere.
**Rotårsaker:** (1) `smart-trader-v3` svarer uten `Access-Control-Allow-Origin` på vanlige responser (kun preflight har CORS) → nettleseren blokkerer alle direkte kall. (2) Funksjonen krever `CRON_SECRET`, ikke user-JWT — den er cron-only, start-kall fra klient var umulig uansett. (3) Falske fallbacks viste «aktiv» selv når alt feilet. (4) `.from()` i browser leste stille 0 rader (anon).
**Fiks:** Start går via `/api/jokertrade` (server-side: sikrer sesjon + kjører 12-agent ensemble umiddelbart). Status via `/api/trading/sessions`. Verifisert med ekte BUY-trade i prod.

### ⛔ Nye harde regler (arkitekt-beslutning 2026-07-29)
1. **ALDRI kall Supabase Edge Functions direkte fra nettleseren.** Alltid via `/api/*`-rute (server-side auth). Gjelder også «bare denne ene» — ingen unntak.
2. **ALDRI falsk suksess-UI.** Ingen fallback som viser «aktiv»/«ferdig»/«ok» når operasjonen faktisk feilet. Feil vises ærlig, med konkret melding.
3. **Edge functions for brukerflyt MÅ ha CORS-headere på alle responser** (ikke bare preflight) — men regel 1 gjelder uansett.

### Sosiale flater (live)
- **LinkedIn-bedriftsside:** `/company/111340815/` (slug `klarpakke`) — logo, banner v2, tagline, fakta-overview, lanseringspost. 50 følge-invitasjoner sendt. **Mangler:** location (trenger Toms adressevalg) + services.
- **Facebook-side:** `facebook.com/profile.php?id=61592276566006` — Datafirma, bio, logo, nytt banner (fb-cover.png), lanseringspost med beta-budskap. 1000 venninvitasjoner sendt.
- **Toms LinkedIn-profil:** AI-ingeniør-headline, Om-seksjon live, 5 nye skills, beta-repost.

### Deployet 2026-07-29 (kode/metadata)
- `messages/no.json` + `messages/en.json` → `home.metadata`: ny tittel «Klarpakke — AI-trading med lekepenger» + beskrivelse «Gratis beta: Du får 100 000 kr i lekepenger…» (styrer og:/twitter:-tags på forsiden).
- `public/og-image.png`: nytt branded 1200×630-bilde (MD5 `306e16225a1752385c88722b930d8d38`). Facebook Sharing Debugger re-scrapet ✅.
- `/api/og`-ruten (dynamiske varianter result/rank) er urørt og har fallback til `/og-image.png`.

### Klar til neste deploy (IKKE deployet ennå)
- `og-image-v2.png` (rot) — fikser tekstkollisjon «Paper tradingklarpakke.no» i bunnlinjen. Ved neste deploy: `cp og-image-v2.png public/og-image.png`.

### 🏥 Trading-infrastruktur (Kimi, 2026-07-30) — LES FØR ENDRING
**Live-lansering planlagt fredag 2026-08-07. Historiske trading-data FØR 2026-07-30 kl. 11:00 UTC er forurenset** (fiktive fallback-priser + NOK/USDT-enhetsbug) — bruk kun nyere data til strategivurdering.

Fikset denne dagen:
1. **jokertrade markedsdata**: kalte binance-proxy med feil endepunkt/uten auth → alltid fallback (RSI 50/flat → evig WAIT). Bruk alltid `@/lib/trading/canonical/market-data/binance-proxy-provider` — aldri håndrullede proxy-kall.
2. **jokertrade exits**: `trades.price` er **NOK** for paper — sammenligning mot USDT-priser ga falske ±89 % exits, og stop-loss manglet helt. Nå: konverter via `getNokUsdtRate()`, sjekk både TP og SL, hent priser for ALLE åpne symboler.
3. **Sesjonsbølger**: `ensure_active_sessions_for_all()` laget ny sesjon per bruker hvert ~30 min. Nå gjenbruker den stoppede sesjoner (migrasjon 20260730120000). `session_maintenance()` hadde alias-bug (`ts.user_id` uten alias) som feilet stille hvert 2. min — fikset.
4. **Cron 401-krise**: `klarpakke-trading-tick`, `smart-trader-v3` og `reconcile-binance-trades` fikk 401 i timevis (utdatert/vault-mismatchet CRON_SECRET). **Regel: alle cron HTTP-kall skal bruke `klarpakke_trigger_cron()` eller lese `vault.decrypted_secrets` — aldri hardkodede tokens eller `current_setting('app.settings...')`.**
5. **Varig overvåking**: `cron_health_events`-tabell + `cron-health-collector` (hvert 15. min) registrerer alle ikke-200/timeout fra `net._http_response` (migrasjon 20260730153000). NB: `cron.job_run_details` viser "succeeded" selv ved HTTP 401 — sjekk alltid `net._http_response.status_code`.
6. **Daglig rapport**: cron-jobb «JokerTrade daglig rapport» kl. 08:17 (Kimi-automasjon) analyserer rene handler + sesjonshelse + cron-helse mot live-fristen.

### Branding-assets (rot i repoet)
`klarpakke-logo-ny.png` (600×600), `klarpakke-cover.png` (1128×191, LinkedIn v1 — erstattet), `linkedin-cover-v2.png` (live), `fb-cover.png` (820×312, live). Badge-grønn i OG er `#22c55e`, ellers brand: `#0a0b0d`/`#0052ff`/`#3d7aff`/`#34d399`, font Inter.

### Markedsføringsdokumenter
- `REDAKTORPLAN-V2.md` — **gjeldende plan**: tone-of-voice, 4-ukers kalender m/ 16 ferdige postutkast, maler, KPI-er.
- `KONKURRENTANALYSE-OG-REDAKTORPLAN.md` — v1, kun historikk.
- `DESIGN-GJENNOMGANG.md` — visuell gjennomgang + mal for post-bilder (1200×627 LI / 1200×630 FB).

### Fakta-godkjent copy (bruk KUN dette)
Gratis beta · 100 000 kr i lekepenger (JokerTrade) · autonome AI-agenter · paper trading på ekte markedsdata · 5000 gratis KLT til de 100 første · norsk plattform.
**Forbudt:** «Norges første/beste», gevinstløfter, og «ingen i Norge lar deg teste med lekepenger» (Skilling har demokonto — verifisert feil). Korrekt: «Ingen norske kryptobørser lar deg trene med lekepenger».

### WebBridge-notater (browser-automasjon)
- FB-post-editor (Lexical): `fill`/`insertText` komprimerer linjeskift — bruk trusted CDP per linje + Enter keyDown.
- Filopplasting FB/LinkedIn: `DOM.setFileInputFiles` nektes — bruk DataTransfer-injeksjon (base64 via `window.__b64` i 90k-chunks). LinkedIn banner: Edit Page → pencil → Edit cover image → injiser i `#org-image-editor__change-photo-input` → scroll til Apply → trusted CDP-klikk.

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

## 📚 Dokumentasjonssøk

Bruk `web_search` med domain-prefiks for oppdatert dokumentasjon — unngå utdaterte svar fra treningsdata:

| Teknologi | Foretrukket domene |
|---|---|
| Next.js / React | `site:nextjs.org` eller `site:react.dev` |
| Supabase | `site:supabase.com/docs` |
| Cloudflare Workers | `site:developers.cloudflare.com/workers` |
| TypeScript | `site:typescriptlang.org` |
| Stripe | `site:docs.stripe.com` |
| Vitest | `site:vitest.dev` |
| Tailwind CSS | `site:tailwindcss.com` |

Eksempel: `web_search("site:nextjs.org app router middleware i18n")`

## 🤖 Hermes 2026 — agent-beste praksis

### Før hver oppgave
1. **Sjekk session_search** for relevant historikk — unngå å gjenskape løst arbeid
2. **Les relevante filer** før du endrer — `read_file` + `search_files` i batch
3. **Batch uavhengige verktøykall** — les flere filer samtidig, ikke sekvensielt

### Under arbeid
4. **Skill-basert:** last `klarpakke-dev` for dev-flow, `klarpakke-build` for bygg, `klarpakke-deploy` for deploy
5. **Verifiser hver endring:** `npm run lint` + `npm run test:unit` etter hver commit
6. **Bruk delegate_task** for parallelle oppgaver — 4 subagenter samtidig
7. **Pre-commit er obligatorisk** — 8-stegs pipeline må passere

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
