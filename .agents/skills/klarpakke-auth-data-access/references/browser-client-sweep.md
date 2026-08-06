# Browser-klient-sweep (2026-07-24) — kampanje-detaljer

Sesjonsspesifikke detaljer for sweepen mot bugklassen "browser-supabase alltid anon".
Plan: `.hermes/plans/2026-07-24_120000-browser-client-sweep.md`. Scan: `node scripts/scan-browser-client.mjs` (i repo) → klassifiserer i guard/read/write/realtime-buckets.

## Scope (målt, ikke gjettet)
- 404 "use client"-filer skannet: **42 guard, 16 read, 6 write, 4 realtime**
- Rekkefølge: guard (redirect-risiko) → data-lesing synlige sider → skriv (stille tapte lagringer) → admin+realtime.

## Verifikasjonsprobe (kopierbar)
Playwright: logg inn → `document.cookie` (kun NEXT_LOCALE), `localStorage` (tom), `context.cookies()` (auth-cookie httpOnly=true). Definitivt bevis — ikke stol på at "appen virker".

## Fullført i sweepen (commits)
- **Fase 0:** scan-script + rapport (`.tmp-e2e/browser-client-rapport.json`)
- **Fase 1a:** 3 døde hooks slettet (useProfileQuery, useTierQuery, useDarkMode — 0 konsumenter). useThemePreference → /api/user/profile (ui_theme lagt til i GET-select + PATCHABLE_FIELDS). useTradingMode → /api/trading/mode + /api/binance/keys. useNotifications → /api/notifications + NY PATCH (mark read).
- **Fase 1b:** NY API `/api/user/onboarding` (GET+PATCH, whitelistet; binance_connected beskyttet — krever binance_api_key_encrypted server-side; onboarding_step valideres heltall >= 0). Alle 6 onboarding-sider omskrevet. Kritisk: nye brukere sto i permanent onboarding-loop.
- **Fase 1c (påbegynt, ikke ferdig):** 6 betalingsfiler identifisert: CheckoutContent, ClientPricingPage, SuccessContent, UpgradeGate, StripeCheckoutButton, SubscriptionGate — alle med getUser-guard som redirecter betalende brukere ved reload.

## Funn (fantom-avhengigheter)
- `POST /api/binance/keys` kaller edge-funksjon `binance-connector` som IKKE finnes blant deployede funksjoner → 500 STORAGE_ERROR. Binance-connect ødelagt ende-til-ende. (Backlog.)
- RPC `mark_notifications_read` finnes ikke i pg_proc → markAsRead var stille no-op. Erstattet med PATCH /api/notifications.
- `notification_preferences`-kolonner ≠ UI-antakelse: ekte kolonner er `push_price_alerts`, `trading_alerts`, `email_notifications`, `push_transactions` m.fl. — ikke `price_alerts`/`trade_executed`/`course_reminder`. Hookens preferences-grensesnitt fjernet (0 konsumenter, YAGNI).
- Eksisterende server-auth API-er gjenbrukt: `/api/trading/mode` (GET+POST), `/api/binance/keys` (POST/GET/DELETE), `/api/notifications` (GET), `/api/user/profile` (GET/PATCH/DELETE).

## Patch-rekkefølge per fil
Fjern import → `const supabase = createClient()` → checkStatus/useEffect-blokk → save/handle-blokk. LSP viser transiente "Cannot find name" mellom kall — forventet. Avslutt med `grep -n "createClient\|supabase\." <fil>` for å verifisere null gjenstående.

## Verktøyfelle: write_file-maskering
Innhold som ligner hemmeligheter kan maskeres til `***` (traff `apiKey: string,` i en funksjonssignatur). LSP-diagnostics i tool-resultatet fanger det — les fila rundt feillinjen, fiks med patch. Sjekk ALLTID diagnostics etter write_file på kode med API-nøkkel-aktige identifikatorer.

## E2E-oppskrift per fase
Før/etter-screenshot per berørt side; for skriv-operasjoner: PATCH→GET persisteringstest med ekte sesjon (mobil 390×844). curl no-auth → 307→/login?next=… for å verifisere at middleware fortsatt beskytter ruten.

## Fase 2 (2026-07-25, commit 525725f81) — read-filer FERDIG

12 av 16 read-filer omskrevet (4 admin deferret til fase 4). Nye ruter: `/api/user/klt-wallet`, `/api/user/trading-logs`, `/api/user/pulse`, `/api/user/strategy-stats`, `/api/live-feed`, `/api/ai/ensemble-stats`, `/api/courses/[id]` (public). Utvidet: `/api/user/trades` m/ eksplisitt `session_id`-param (overstyrer arkivert-ekskludering for detaljvisning) + `meTradeRowSchema` m/ session_id/fee/order_type.

Per-fil mapping: KLTWallet→klt-wallet, GamificationCard→gamification/achievements, SessionDetailDialog+PaperTradingSessionDetail+useUnifiedTrading→user/trades?session_id=, TraderStatusLog→trading-logs, LiveTradeFeed→live-feed, usePulseData→pulse, EnsembleAIDashboard→ensemble-stats, AdvancedStatsModal→strategy-stats, TradeDetailsDrawer (død anon-fallback FJERNET — /api/trades/[id] eneste kilde, synlig feil fremfor stille tomhet), ClientCheckout→courses/[id].

**Funn:**
- `EnsembleAIDashboard` ordnet på `updated_at` — kolonnen heter `last_updated_at` (fantom ORDER BY, verifisert mot information_schema).
- 3 døde realtime-channels (LiveTradeFeed, usePulseData, PaperTradingSessionDetail) → polling 15–30s.
- To parallelle KLT-tabeller: `kltbalances` (32 rader) vs `user_klt_balances` (48) — divergens flagget, ikke merged.
- E2E: 8/8 ruter 200 innlogget m/ reelle data (KLT-saldo 10 000, 6 trades per session, 5 logger). Checkout-parameter heter `course`, ikke `courseId` — redirect til /priser var korrekt guard.

## Fase 3 (2026-07-25, commit 3b33f0d91) — write-filer FERDIG

5 av 6 omskrevet (ClientStudentsPage admin → fase 4). Nye ruter: `/api/notifications` (GET 20 nyeste + unreadCount; PATCH {id}|{all:true}; DELETE ?id= — alltid user_id-scopet), `/api/portfolio/rebalance` (GET wallets+config+orders, auto-opprett default-config BTC50/ETH30/SOL10/BNB5/XRP5; PATCH {is_active}). Utvidet: `/api/user/profile` PATCH m/ BOOLEAN_FIELDS-typevalidering + dismissed_get_started_card i PATCHABLE+GET-select; `/api/user/onboarding` PATCHABLE + setup_completed_at.

Per-fil: NotificationTray→notifications (+realtime→polling 30s), SmartPortfolioDashboard→portfolio/rebalance (+realtime→polling; død PortfolioClient query-builder-typing fjernet), GetStartedCard→profile GET/PATCH, InteractiveOnboardingWizard→onboarding PATCH (dobbel fallback-update slått sammen til ett kall), ExchangeApiSettings→/api/exchanges/connections (legacy api_keys + ikke-deployet connect-exchange forlatt; UI mappet: én rad per exchange, rawExchange-felt for DELETE ?exchange=, test_status fra lastError/lastValidatedAt).

**Funn:** legacy `api_keys`-tabellen viste kryptert ciphertext "maskert" i UI — kanonisk exchange_connections returnerer aldri nøkkel. saveApiKey-drop av separat test-steg: POST validerer server-side (BinanceExecutor.validateApiKeys / Kraken read-only).

## Fase 4 (2026-07-25, commit 72fc5c87f) — admin + realtime + guard FERDIG

5 admin-filer omskrevet + 3 realtime-komponenter + pre-commit-guard. Nye ruter (alle m/ `requireAdmin()` — ny delt helper `src/lib/admin/require-admin.ts`): `/api/admin/recent-signups` (10 nyeste user_profiles), `/api/admin/students` (GET liste + PATCH rolle m/ rolle-whitelist), `/api/admin/beta-signups`, `/api/admin/cta-analytics?days=` (aggregasjon flyttet server-side).

Per-fil: ClientAdminDashboard (helseprobe anon .from→recent-signups; død INSERT-channel→60s polling m/ knownIds-diff), ClientStudentsPage (liste+rolle→students-ruta; grantFounder/ban var allerede server actions), admin/login (rolle-sjekk anon .from→/api/admin/verify m/ Bearer fra getSession), CtaAnalyticsDashboard (fetchData→cta-analytics), ClientMonetization (beta_signups→beta-signups-ruta). Realtime→polling: PaperTradingList (visibility-pauset 20s, router.refresh bevart), PaperTrading (20s), BotStatusDashboard (30s mot /api/dashboard/bot-status — lastAnalysisDetails/nextActionAt/nextActionDescription mappes til samme RealtimeUpdate-shape). use-realtime.ts beholdt m/ KLA-auth-advarsel (5 konsumenter igjen).

**Funn:**
- **Sikkerhetshull:** `/api/admin/dashboard/data` brukte SUPABASE_SERVICE_ROLE_KEY helt UTEN auth — lukket m/ requireAdmin (etter env/503-sjekk; testen `admin-routes-auth.test.ts` forventet 503 ved manglende env og feilet til guard ble flyttet).
- `marketing_funnel_summary`-viewet finnes ikke i DB — komponentens "materialized view først, rå-events som fallback" var dobbelt død; ruta spør kun rå-events.
- Rolle-whitelist i students-PATCH: `student/admin/instructor/user` — aldri fritekst-roller fra klient.
- **Guard:** `scripts/guard-browser-supabase.mjs` i pre-commit (steg 5b); allowlist 29 filer ved innføring. Shell-grep undergenererte (`\.from\(['"]..` krevde 2 tegn) — guard-scriptet selv er ground truth for allowlisten.
- Test-grønt ved commit: 1386/1386, tsc 0 feil.
