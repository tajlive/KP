# Hermes — Handover + oppdrag: UX-batch og close-on-stop-røyktest

> Lim inn ved start av ny Hermes-økt. Skrevet 2026-07-26 etter at Kimi Work fullførte merge/migrasjon/deploy-løpet.

---

Du er Hermes, lead architect for **Klarpakke**. Les `AGENTS.md` og `.hermes.md` først — de er nylig oppdatert (PR #136/#137) med bl.a. deploy-vei via `bash scripts/deploy.sh` (npm run deploy er deny-listed), norsk-først i18n-policy med løpende oversettelse tillatt, og balanse-regelen nedenfor.

## Hva som har skjedd siden din forrige økt (fait accompli)

| PR/Migrasjon | Innhold | Status |
|---|---|---|
| #134 `7798f88dd` | Orphan-redning, close-on-stop, expectancy-guard, par-normalisering, UI-A posisjonskort | Merget + deployet |
| `69be40bc6` (i #134) | Review-fikser: `p_user_id` i increment_capital, archived-filter fjernet, i18n-namespace, FIFO-lots | Merget |
| #136/#137 | Agent-konvensjoner, i18n-policy | Merget |
| Migrasjon `20260726120000` | 58 orphans adoptert, 43 par normalisert. Backup: `backups/pre-migration-20260726120000.json` | **Kjørt i prod** |
| #138 `fbfd286c0` | E2E-logikkfikser: wizard-avvisning (P0), phantom-mengde-guard, USDT-kurs-hierarki (DB→env→9.6), close-on-stop `symbol`-kolonne (PGRST204), error-toast, historikk-ledger | Merget + deployet |
| Migrasjon `20260727000000` | F2: trigger med vektet snittinngang + tidligste entry_time | **Kjørt i prod** |
| #139 `0bb14045e` | Én balanse-sannhet: triggeren skriver IKKE lenger `user_profiles.paper_balance`/`wallets`/`portfolios` — paper_accounts er eneste sannhet. Hero viser `accountBalance` | Merget + deployet |
| Migrasjon `20260727120000` | Fjernet de tre SUM-skrivingene fra triggeren | **Kjørt i prod** |

**Prod nå:** v`0bb14045e`, worker `034fe0f6`. Morgen-cron kl 07:42 (Kimi Work) overvåker helse daglig.

## Nye arkitektur-sannheter du MÅ respektere

1. **Balanse:** `paper_accounts.current_balance` er eneste sannhet. Triggeren skriver ikke profiles/wallets lenger. `wallets.balance` og `portfolios.current_balance` er **stale-by-design** — ikke les dem for visning; bruk paper_accounts (mønster: `api/portfolio/summary/route.ts`). `getUserDashboardMetrics().accountBalance` er server-veien.
2. **Wizard:** `startTrading` AVVISER oppretting når brukeren har aktiv sesjon for samme par (`PAPER_BOT_DUPLICATE`). Ikke "fiks" dette tilbake til overskriving — det var P0-buggen som resettet Toms bot.
3. **Trigger `trigger_update_session_state()`** har nå vektet snittinngang + tidligste entry_time (F2). Ikke reverser.
4. **close-on-stop:** `symbol`-kolonnen finnes ikke i prod-trades — aldri bruk den i insert-payloads.
5. **Historikk er en ledger:** vis ALLTID brukerens trades, også fra arkiverte sesjoner.

## Oppdrag 1: UX/design-batch (hovedoppdrag)

E2E-test 2026-07-26 (23 skjermbilder i `/tmp/e2e-*.jpeg`) fant disse. Fiks de enkle, trygge, høyverdige:

1. **i18n engelsk-på-norsk:** bot-detalj heading ("BOT DETAILS"/"Trading Bot"/"Started"), "No handler yet", "AKTIV PAIRS / STARTED / RISIKO NIVÅ", trade HVORFOR-forklaringer generert server-side på engelsk ("Time-based exit…") — bruk i18n-systemet eller norske maler (norsk i begge filer er OK per policy).
2. **Nav-kollisjon:** «Hovedmeny» overlapper «Trader kjører»-badge i toppbaren (alle sider).
3. **Mobil (80 % av trafikken):** balansetall i dashboard-hero må vises på 390px; klippet «Lekepenger/Live»-toggle; klippet «Handelshistor…»-overskrift.
4. **Kontrast:** aktiv fane mister label (hvit-på-hvitt) i profil/innstillinger; «Kopier diagnostikk» nesten usynlig på historikk.
5. **«Trader kjører (N)»-badge** må telle faktiske aktive sesjoner (var foreldet etter stopp).
6. **Pris-chip på bot-detalj:** positivt avvik vises rødt uten fortegn — legg til fortegn + korrekt fargelogikk.
7. **Landing:** «64 000 kr» brekker over to linjer — hardt mellomrom.

Gates før commit: `npm run lint && npm run test:unit` grønt, `node scripts/validate-i18n-usage.js` uten nye mangler. Én PR: `fix(ux): i18n-strenger, nav-kollisjon, mobil-visning`. Ikke merge, ikke deploy — Kimi Work eller Tom merger etter review.

## Oppdrag 2: Røyktest close-on-stop i prod (kun etter Oppdrag 1 er i PR)

Koden er fikset (symbol-kolonnen) men aldri verifisert ende-til-ende i prod. Strenge rammer:

- Opprett EN ny paper-bot på et par UTEN aktiv sesjon (IKKE BTCUSDT — Toms bot kjører; bruk f.eks. SOLUSDT), minste beløp.
- Vent på første tick/kjøp (poll DB read-only, ikke spam UI).
- Stopp KUN denne nye boten. Verifiser: salg bokført i trades med HVORFOR-tekst, toast synlig, posisjon nullstilt, kapital kreditert (sjekk at `increment_capital` faktisk ga utslag i paper_accounts).
- Rapporter `closed:true` + trade-id, eller `reason` ved feil — med Sentry-logglinje hvis feil.
- Rydd opp: slett test-sesjonen + dens trades etterpå (SQL vises Tom før kjøring).

## Forbud (uendret)

Ingen deploy uten Toms eksplisitte go. Ingen DB-skriving uten vist diff + godkjenning. Stopp og spør ved >10 filer eller uklart scope. Subagenter: K3 HIGH + denylist håndhever dette på verktøynivå.
