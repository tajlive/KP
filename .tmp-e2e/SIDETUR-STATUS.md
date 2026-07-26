# Side-for-side-tur — STATUS (oppdatert 24.07.2026)

Fortsett her i ny sesjon. **Sideturen (side 1–13) er FERDIG 24.07.2026.** Neste: backlog-listen nedenfor eller ny runde på Tom's pek.

## Metode (gjenta per side)
1. Kopier `.tmp-e2e/side5.mjs` → `side6.mjs`, bytt URL (og `/tmp/s5-` → `/tmp/s6-`)
2. `node .tmp-e2e/side6.mjs` — login tar ~25 s (scriptet håndterer kaldstart)
3. `vision_analyze` på /tmp/s6-*.png (390×844 mobil-viewport)
4. Rotårsak i kode/DB → fix → `npx tsc --noEmit` + `npm run test` → commit → deploy
5. Deploy: `pkill -9 node; bash scripts/deploy.sh` (bakgrunn, ~5 min)
6. Vent 60 s, re-capture, visuelt verifiser, oppdater denne filen

## Ferdige sider
| # | Side | Status | Hovedfikser |
|---|------|--------|-------------|
| 1 | Landing (/) | ✅ | Footer Vilkår/Personvern/Kontakt + Org.no 929003292; 404-polaroid; fjernet fabrikkerte tall («10 000+ brukere», «99,9% oppetid», «1247 aktive tradere»); preload-lydfil borte |
| 2 | /trade | ✅ | Modal lukkes ved symbolklikk; JokerTrade «Velg beløp»-krav + feilmelding; «Fyll inn alle felt» i §3 |
| 3 | /dashboard | ✅ | Aktiv økt 6→1 (2 fremtidige, 3 overlappende stoppet); NaN-knapp i daily-brief |
| 4 | /dashboard/portfolio | ✅ | USDT/NOK-enhetsbug i posisjoner (livepriser er USDT, konverteres nå m/ /api/fx/usdt-nok); scope til ikke-arkiverte sesjoner; posisjoner kun fra aktive/pausete; reparert korrupt trade (07-15 salg, USDT-pris) |
| 5 | /dashboard/historikk | ✅ | Mobil handelskort (KJØP/SALG, beløp, P&L); /api/user/trades ekskluderer arkivert test-era; 2×2 stats-grid; tom beslutningsseksjon skjult; NOK < 100 kr får desimaler (src/lib/currency.ts) |
| 6 | /dashboard/resultater | ✅ | −92 593 kr P/L-løgn → sann −70,08 kr: effectivePnlDelta telte åpne kjøp som tap (kun realisert teller nå); råe i18n-nøkler (charts.worstDayBadge/modeTrades); lastUpdated {time}; arkivert-scope i API; «Ukjent»→«Uten resultat»; reparert 8 USDT-forurensede BTC-trades 17.07 (qty÷9.6) |
| 7 | /dashboard/analysis | ✅ | Aktivaallokering viste \|P/L per par\| (70,08 kr) → sann fordeling fra /api/portfolio/summary (posisjoner+kontanter, 100% kontanter = konsistent m/ 0 posisjoner); hardkodet 100k saldo → reell 92 418,17; «Risk Metrics»/«Max tap streak» → «Risikonøkkeltall»/«Lengste tapsrekke»; heatmap-vinnrate 14%→50% (kun resultatdager); ICU-plural «1 grønn»; US-tallformat → norsk i kalkulator; defaultExpanded på dedikert side |
| 8 | /dashboard/auto-trade | ✅ | **Prisbug ×10,9**: LivePricePreview dobbeltkonverterte (BTC 6 825 226 kr → sann 624 189 kr); usePrices brukte statisk rate 10.92 → sanntid fra /api/fx/usdt-nok (fallback 9.61); Kelly-«du kan ikke tape»-løfte → fakta-copy; «Utmerkelse»-chips overalt (EN-kilde «Badge» var feil) → AI-overvåking/Lekepenger/Live (14 nøkler); «Dca»→«DCA»; wizard verifisert steg 1-3 |
| 9 | /dashboard/autopilot | ✅ KONSOLIDERT | Redirectet allerede (middleware canonical) — slettet død rute + foreldede AutopilotLaunchPad/Monitor; stale href i TradingModeSelector → /auto-trade. Motor (/api/ai/autopilot/*) urørt. Verifisert: 308 i prod |
| 10 | /dashboard/settings | ✅ | (redirect til /profile?tab=settings) Billing-kort hadde shippet placeholder i BEGGE språk: «Tittel»/«Beskrivelse» + «Lagre»-knapp som åpner Stripe → «Abonnement og betaling»/«Administrer abonnementet ditt»/«Åpne betalingsportal». Resten av fanen ren norsk (utseende, e-postvarsler, sikkerhet) |
| 12 | /dashboard/referral | ✅ | Ærlig «Kommer snart» (korrekt: ingen /api/referral-backend ennå — ReferralDashboard er bare komponent+test). Eneste feil: hardkodet norsk → common.comingSoon (en: «Coming soon» verifisert) |
| 11 | /marked | ✅ | Placeholder-tekst («Marked tittel», «Top movers», «Go to handel») → norsk; **WS-race**: connect() bygde stream-URL synkront → kun BTC kom med, alle andre symboler viste seed-mock fra 19.06 (BNB «578 kr» vs sann 5 389, DOGE «0,12 kr» vs 0,66, rundetall-%) — reconnectOnOpen-fiks; 24h-% hentes nå fra ticker (kastet bort før); «kr»-enhet + «—» ved 0 |
| 13 | /profile | ✅ | **Redirect-loop**: ProfileTab brukte browser-supabase getUser() (alltid anon pga httpOnly cookie) → trodde bruker utlogget → /innlogging → middleware → /dashboard. Standard-fanen var ubrukelig i prod. **«Ingen profil funnet»**: useProfile browser-anon → 0 rader → «Opprett profil»-skjerm for brukere SOM HAR profil — useProfile skrevet om til /api/user/profile (+ nye PATCH upsert/DELETE, whitelistet). **Fantom-kolonne risk_preference** (finnes ikke i DB) brakk GET → mappet til risk_tolerance m/ UI↔DB-oversettelse (safe/normal/advanced ↔ low/medium/high CHECK). **RLS-felle**: ON CONFLICT evaluerer INSERT-policy FØR konfliktløsning — user_id må med i upsert. **12 «plassholder»-tekster** i prod-copy → reelle eksempler. Lagring E2E-verifisert i prod (PATCH 200, persistert) |

## Side 13.5 — funn underveis (dashboard-ticker)
| 13b | /api/market/snapshot (dashboard-ticker) | ✅ | Hardkodet fallback BTC «105 000, +2,5 %» m/ fersk tidsstempel når Binance blokkerer Worker-IP (fabrikasjon presentert som live) + USDT-priser merket «kr». Nå: direkte → binance-proxy → ærlig 503 (ticker skjules), NOK-konvertert. Verifisert: BTC 615 377 kr −1,29 % |

### Side 6 — lærdommer
- **effectivePnlDelta-fellen**: signert notional som P/L-proxy lyver (åpent kjøp ≠ tap). Kodebasen visste det (trade-effective-pnl.ts omgikk det) — fiks roten, ikke omveiene.
- **Datareparasjon**: verifiser intern konsistens (qty×price=total) FØR konvertering. Første forsøk (×9.6 på total) forverret det til −564 901 kr-dag; riktig var qty÷9.6 fordi total/fee allerede var NOK.
- UPDATE-filter: `usdt_nok_rate = 9.6` traff også gårsdagens reparerte rad — snevre filtre (id/dato) ved reparasjon.
- Verifisert i prod: Total P/L −70,08 kr matcher DB eksakt (−115,68 + 45,60); 19 handler; 50 % vinnere; verste dag −116 kr.

## Avtalt arbeidsflyt
- **i18n: norsk først.** Nye nøkler i BÅDE no.json og en.json (paritet kreves av i18n:validate i prebuild), men en.json får norsk placeholder. Engelsk oversettes i én samlet runde senere.
- Fakta-krav: ingen uverifiserbare tall i UI/markedsføring.
- Mobile-first (80% mobiltrafikk).

## Backlog (ikke gjort)
1. ~~**Mock-priser på /dashboard**~~ ✅ LØST 24.07 (side 13b): /api/market/snapshot-fallback — se egen rad over.
2. **i18n en.json**: «Smart Actions Title»-placeholdere + generell oversettelsesrunde til slutt.
3. **deploy.sh falsk negativ**: «Side tom/feil»-sjekken kjører for tidlig (kaldstart). Legg til retry/60–90 s vent.
4. **Registrer/siste-steg**: Supabase mailer_autoconfirm — Tom skulle sjekke Dashboard (auth_user-EXCEPTIONS var pre-eksisterende).
5. **Session-vs-account capital-divergens**: trading_sessions.current_capital_nok (97 994) vs paper_accounts.current_balance (92 418) — samle regnskapsmodellen.
6. ~~**USDT-enhets-pollution i gamle trades**~~ ✅ LØST 24.07: 8 BTC-rader 17.07 reparert (qty÷9.6, pris×9.6); DOGE-raden var allerede NOK.

## Tekniske notater
- trades.price = NOK; useRealtimePrices (/api/market/binance-24hr) = rå USDT → konverter m/ /api/fx/usdt-nok.
- Cron-ticker handler kun status='active'; manuell handel aksepterer active+paused.
- Supabase PAT i ~/.zshrc (SUPABASE_ACCESS_TOKEN) → Mgmt API SQL: POST https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query
- Test-login: tomarnejensen@gmail.com / TestTest123!
- Hermes: model k3, reasoning_effort=high (satt 24.07), temperature 1.
