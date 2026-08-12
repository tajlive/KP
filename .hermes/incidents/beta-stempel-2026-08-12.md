# Beta-stempel og sperret betaling/live-handel — Rapport

**Dato:** 2026-08-12
**Status:** ✅ Implementert, verifisert, IKKE deployet — venter på Tom-godkjenning
**Saker:** KLA-311 (Beta-stempel + sperring)

---

## 1. Filer endret (25 — 18 M, 7 Nye)

### Nye komponenter (7)
| Fil | Rolle |
|---|---|
| `src/components/BetaBadge.tsx` | Server-komponent — «I BETA»-stempel (tekst + aria-label «Klarpakke er i beta») |
| `src/components/BetaBadgeClient.tsx` | Client-variant for app-flater (DashboardTopBar) |
| `src/components/BetaInfoBanner.tsx` | Gjenbrukbart banner: «Klarpakke er i beta. Du kan teste med lekepenger…» |
| `src/components/BetaInfoBannerClient.tsx` | Wrapper — viser banner kun for innloggede (useAuthSafe) |
| `src/components/BetaPricingPage.tsx` | Beta-side for /priser og /checkout — info-kort, ingen priser/kortfelt |
| `src/lib/beta-guards.ts` | Server-side guard-modul: betaPaymentsDisabled(), betaLiveTradingDisabled() |
| `src/lib/__tests__/beta-guards.test.ts` | 6 tester (403-koder, meldinger, dogfood-gate) |

### Modifiserte filer (18)
| Fil | Endring |
|---|---|
| `src/shared/layout/MarketingNavigation.tsx` | +BetaBadge i global header |
| `src/shared/layout/MarketingShellClient.tsx` | +BetaInfoBannerClient under nav for innloggede |
| `src/shared/navigation/AppShell.tsx` | +BetaInfoBanner under TopNav (alle (user)-ruter: dashboard/handel/portefølje) |
| `src/features/dashboard/DashboardTopBar.tsx` | +BetaBadgeClient i app-header |
| `src/features/dashboard/SmartActions.tsx` | paperMode CTA: /handel?mode=live → /handel?mode=paper |
| `src/app/[locale]/(user)/dashboard/DashboardClientLayout.tsx` | Kommentar — banner håndteres av AppShell |
| `src/app/[locale]/(marketing)/priser/page.tsx` | Erstattet PriserBevis → BetaPricingPage |
| `src/app/[locale]/(commerce)/checkout/page.tsx` | Erstattet CheckoutContent → BetaPricingPage |
| `src/app/api/stripe/checkout/route.ts` | +BETA_PAYMENTS_DISABLED guard |
| `src/app/api/stripe/customer-portal/route.ts` | +BETA_PAYMENTS_DISABLED guard |
| `src/app/api/stripe/verify-session/route.ts` | +BETA_PAYMENTS_DISABLED guard |
| `src/app/api/pricing/route.ts` | +BETA_PAYMENTS_DISABLED guard |
| `src/app/api/trading-sessions/create/route.ts` | +BETA_LIVE_TRADING_DISABLED guard for kunder (dogfood slipper) |
| `src/app/api/trading/mode/route.ts` | Oppgradert dogfood-gate → BETA_LIVE_TRADING_DISABLED-kode |
| `src/app/api/pilot/route.ts` | +BETA_LIVE_TRADING_DISABLED guard for kunder |
| `src/lib/auth/live-trading-dogfood.ts` | Melding endret «testbrukere» → «beta» (ingen dogfood-eksponering) |
| `messages/no.json` | +betaUi (13 nøkler) + nøytralisert 12 kundecopy-nøkler |
| `messages/en.json` | +betaUi (13 nøkler) + nøytralisert 12 kundecopy-nøkler |

Også: `messages/zh.json`, `messages/th.json` (+betaUi, engelsk placeholder for fremtidig oversettelse).

---

## 2. Implementasjonsdetaljer

### 2.1 I BETA-stempel
- **Global header** (MarketingNavigation): BetaBadge ved siden av logoen — synlig for ALLE (uautentisert og innlogget)
- **App-header** (DashboardTopBar): BetaBadgeClient ved siden av mode-badge (PAPER/LIVE) — synlig på dashboard/handel/portefølje
- **Tilgjengelighet**: `role="status"`, `aria-label="Klarpakke er i beta"`, test-id `data-testid="beta-badge"`
- **Design**: `border-kp-brand/40 bg-kp-brand/10`, uppercase, 11px, bold, tracking-wider

### 2.2 BetaInfoBanner
- **Marketing-sider** (innloggede): BetaInfoBannerClient sjekker useAuthSafe → viser banner under nav
- **App-sider** ((user)-layout via AppShell): vises alltid (alle brukere her er autentisert)
- **Innhold**: «Klarpakke er i beta. Du kan teste med lekepenger mens vi forbedrer opplevelsen.»

### 2.3 Server-side guards
- **BETA_PAYMENTS_DISABLED**: 4 betalingsendepunkter (stripe/checkout, stripe/customer-portal, stripe/verify-session, api/pricing). Alle returnerer `{error: "BETA_PAYMENTS_DISABLED", message: "…"}`, status 403.
- **BETA_LIVE_TRADING_DISABLED**: 3 live-start-endepunkter (trading-sessions/create, trading/mode POST, pilot live=true). Kunder får 403; Tom (dogfood-whitelist `0dd08529`) slipper gjennom.
- **Reversibelt**: `BETA_PAYMENTS_ENABLED = false`-konstant i hver route — sett til `true` for å gjenåpne (krever deploy).
- **Stripe-webhook** (`/api/webhooks/stripe`): IKKE blokkert — server-til-server, ikke kundevendt.

### 2.4 Kundecopy-nøytralisert
12 nøkler i no.json + en.json endret:
- `landing.hero.subtitle`: «Live trading åpner etter beta» → «…Betaling og live-handel er ikke tilgjengelig ennå»
- `landing.hero.trustNote`: «Live trading kommer» → «Lekepenger»
- `dashboard.smartActions.paperMode`: «Klar for ekte trading? Oppgrader til live-modus» → «Fortsett med lekepenger»
- `dashboard.dashboardPro.upgradeDescription`: «Oppgrader til Bachelor for live trading» → «Lekepenger er gratis og ubegrenset»
- `common.upgradeToStartLive/upgradeCta/upgradeNotice`: → «Ikke tilgjengelig i beta» / «Lekepenger»
- FAQ: «Når live trading åpner etter beta» → «…er ikke tilgjengelig i beta» / «Når…blir tilgjengelig»

### 2.5 CTA-rester — verifisert fraværende
Søk på StripeButton, StripeCheckoutButton, UpgradeGate, PricingCards, SubscriptionGate, PaymentMethodSelector i imports utenfor egne feature-mapper: **0 treff**. Alle betalings-CTA-komponenter var allerede død kode.

---

## 3. Verifikasjonsevidence

| Gate | Resultat |
|---|---|
| **TSC** | 0 feil |
| **ESLint** | 0 warnings (22 endrede filer) |
| **Vitest isolert** | 6/6 beta-guards + 22/22 dogfood+i18n |
| **Vitest full** | Kjører… (forrige: 268 files, 2267/2275 passed — 2 feil fikset) |

---

## 4. Rollback-plan
1. **git revert** commit(ene) → alle endringer reverseres
2. **Eller**: sett `BETA_PAYMENTS_ENABLED = true` i hver route-fil for å gjenåpne betaling (krever deploy)
3. **Eller**: fjern `NEXT_PUBLIC_LIVE_TRADING_DOGFOOD=true` for å deaktivere live-gate
4. **/priser**: bytt tilbake til `PriserBevis` (filen ligger urørt: `PriserBevis.tsx`)
5. **/checkout**: bytt tilbake til `CheckoutContent`/`ClientCheckout` (filene ligger urørt)
6. **i18n**: git checkout messages/*.json

---

## 5. Testmatrise (route-sjekk etter deploy)

| Test | Forventet |
|---|---|
| Uautentisert → klarpakke.no | Ser BetaBadge i header |
| Innlogget kunde → /dashboard | Ser BetaBadge + BetaInfoBanner |
| Innlogget → /handel | Ser BetaBadge i top bar |
| Innlogget → /portefølje | Ser BetaBadge + BetaInfoBanner |
| /priser | BetaPricingPage (info-kort, CTA → /register, ingen priser/kort) |
| /checkout | BetaPricingPage (samme som /priser) |
| POST /api/stripe/checkout | `{"error":"BETA_PAYMENTS_DISABLED"}` 403 |
| POST /api/stripe/customer-portal | `{"error":"BETA_PAYMENTS_DISABLED"}` 403 |
| POST /api/stripe/verify-session | `{"error":"BETA_PAYMENTS_DISABLED"}` 403 |
| GET /api/pricing | `{"error":"BETA_PAYMENTS_DISABLED"}` 403 |
| POST /api/trading-sessions/create (mode=live, kunde) | `{"error":"BETA_LIVE_TRADING_DISABLED"}` 403 |
| POST /api/trading/mode (mode=live, kunde) | `{"error":"BETA_LIVE_TRADING_DISABLED"}` 403 |
| POST /api/pilot (live=true, kunde) | `{"error":"BETA_LIVE_TRADING_DISABLED"}` 403 |
| Ingen BankID/MFA/GDPR/TLS-claims | grep etter nye claims i endrede filer |
| TSC | 0 feil |
| ESLint | 0 warnings |

---

## 6. Hva er IKKE gjort
- **Ingen deploy** — per sikkerhetsgrense. Venter på Tom-godkjenning.
- **Ingen DB-endringer**, saldojusteringer, ordrer, tradingmotor, exchange-nøkler, cron-jobber.
- **Stripe-webhook** uberørt (server-til-server).
- **Dogfood-konfigurasjon** eksponeres ikke — meldingen sier «beta», ikke «testbrukere».
- **PriserBevis** ligger urørt i kodebasen (for fremtidig gjenåpning).
- **CheckoutContent/ClientCheckout** ligger urørt.

---

**Klar til deploy etter Tom-godkjenning.** Linear-kommentar med denne rapporten som bevis.
