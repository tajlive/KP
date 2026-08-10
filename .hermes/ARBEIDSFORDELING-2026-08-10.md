# ARBEIDSFORDELING K3 ↔ HERMES — 2026-08-10 (kveld)

> **Fra:** Kimi Desktop K3 · **Til:** Hermes (les ved oppstart)
> **Kontekst:** Hermes kjører deepseek-v4-flash — fordelingen reflekterer det:
> K3 tar arkitektur/kompleks logikk, Hermes tar drift og mekaniske fikser.
> Forutsetter `.hermes/HANDOFF-2026-08-10.md` (lest og handlet på — takk ✅).

---

## Prinsipp

| Agent | Modell | Tar |
|---|---|---|
| **K3** (Kimi Desktop) | K2.7/K3-klasse | Pilot-motor, LLM-explainer, backtest, strategi, affiliate |
| **Hermes** | deepseek-v4-flash | CI/drift, mekaniske bugfikser, migrasjoner, secrets, overvåking |
| **Tom** | — | Live-trading, DB-godkjenning, priser/tiers, UI-fjerninger |

---

## K3 tar (i rekkefølge)

1. **Oppgave 2.1 — `simple-grid.ts`** (COMBO: grid ±1.5 % + DCA hver 4. time, TDD)
   ⚠️ **SONE-UNNTAK:** berører 4 filer i Hermes-sone:
   - `src/lib/trading/strategies/simple-grid.ts` (ny)
   - `src/lib/trading/strategies/types.ts` (TickStrategyEngineKey)
   - `src/lib/trading/strategy-id-aliases.ts` (validEngines)
   - `src/lib/trading/strategy-configs.ts` (engineDefaults)
   → **Hermes: ikke rør disse 4 filene før commit `feat(strategy): simple-grid` er på main** (ETA: i kveld). Meldes i commit + her når landet.
2. **Oppgave 2.2 — `src/lib/llm/trade-explainer.ts`** (Kimi K3 → norsk forklaring per trade, template-fallback)
3. **Oppgave 2.3 — `src/lib/backtest/simple-backtest.ts`** (90d OKX-historikk, DSR-sjekk, gebyr+slippage)
4. **Oppgave 3 (de to tunge):** `/handel` live-tall i Lekepenger-modus (P1.2) + Resultater-side «0 handler» vs historikk 13 (P1.4) — krever dataflyt-graving
5. **Oppgave 4:** OKX affiliate-søknadstekst + `src/lib/affiliate/okx-referral.ts` (API-kobling med secrets = Hermes/Tom senere)

## Hermes tar (flash-egnet, mekanisk/drift)

1. **Fullfør auth-smoke** (pågående — storage state i CI)
2. **auto-rollback `CLOUDFLARE_API_TOKEN`** — wrangler virker lokalt, returnerer tomt i CI → sannsynligvis GH-secret-rettighet (Workers: Edit). Guard fra 660ff9694 fanger krasjet, men rollback FUNGERER ikke før token er fikset.
3. **P1.3: død e-postlenke** `/no/profil` → `/no/innstillinger` (`src/lib/email/index.ts:427`, `branded-templates.ts:116`)
4. **P2:** tittel-feil `/handel`, `/marked`, 404-side; verveprogram «Kommer snart»-lenke i meny
5. **Binance-rydding rest:** lokale mapper, cron-jobb 1144, `BINANCE_*` secrets
6. **Bitwarden-migrasjon** av deploy-scripts
7. **DB-migrasjon `is_pilot`** — NÅR K3 leverer SQL-diff (etter 2.1–2.3): presentér for Tom, kjør ETTER godkjenning
8. **CI-watch + prod-verifisering** etter hver K3-commit

## Kollisjonsregler

1. **Sonekartet gjelder** — eneste unntak er 2.1 (4 filer, listet over).
2. **Delte registry-filer** (strategy types/aliases/configs): commit umiddelbart, separat, aldri samle opp.
3. **Kommunikasjon:** commit-meldinger + `.hermes/*.md` + Trello-kort med bevis (hash + CI-grønn).
4. **Ved sone-tvil:** stopp, skriv i neste handoff — ikke gjett.
5. **Ingen av oss rører:** Stripe-priser (venter Tom/Hermes-migrasjon til 399/799), live-trading, DB-schema uten Tom.

## Nye beslutninger (Tom, 2026-08-10 kveld)

1. **Verveprogram: DROPPET HELT.** K3 har fjernet meny-lenke (DASHBOARD_USER_MENU_NAV),
   labelKey-union, UserMenu-ikon og ruten `/dashboard/referral` (commit kommer).
   **Delegert til Hermes — dead-code-rydding:**
   - `src/features/account/referral/` (ReferralDashboard, GoldenTicket, `__tests__/`) — slett
   - `src/features/account/gamification/KLTWallet.tsx` linje ~92: `case "referral"` — vurder mot KLT-visning før sletting
   - i18n-nøkkel `referral` (label) — fjern fra no/en/zh når kode er borte
   - DB-tabeller (`referral_tracking`, `user_referrals_summary`, `profiles.referral_code`) — SQL-diff → Tom-godkjenning → kjør (IKKE kjør uten godkjenning)
2. **«Gi en venn 100 000 kr i lekepenger»** — Toms gave-konsept (erstatter verving).
   Regel: «lekepenger» står ALLTID med i copy. Ingen belønning, ingen telling, kun del-lenke.
   Bygges ETTER Pilot (post-2.3) — ikke start nå.

## Status fra K3 (2026-08-10 kveld)

- Oppgave 1 fullført: landing, /kurs, /om-oss, /priser, Pilot-dashboard — alle live i prod, CI grønn
- Neste commit fra meg: `feat(strategy): simple-grid` (2.1)
- Priser låst av Tom: Pro 399 / Pro+ 799, årspris 3 990/7 990 — Stripe-migrasjon venter (ikke startet av noen)
