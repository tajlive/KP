# Neste trinn: Merge → migrasjon → deploy PR #134, deretter Alt 2

> **For Hermes:** Bruk subagent-driven-development der kode skal skrives (Fase 3). Fase 1–2 er operasjonelle og kjøres av hovedagenten med Toms godkjenningspunkter.

**Mål:** Få Alt 1 + UI-A (PR #134) trygt ut i produksjon med migrasjon og verifisering, deretter starte Alt 2 (full posisjons-tabell) med ryddet PR-kø.

**Kontekst (2026-07-25):**
- PR #134 (`feat/trading-logikk-fix`, commit `c29570a61`) — verifisert: 1427/1427 tester, tsc 0, lint ren, i18n OK, migrasjonsvalidator 307/307. **IKKE merget.**
- Migrasjon `20260726120000_pair_normalisering_orphan_redning.sql` — validert, **IKKE kjørt** (krever Toms diff-godkjenning).
- PR #135 (docs: agent-konvensjoner) — åpen, ren dokumentasjon.
- Kimi-merger ventende: #126/#127/#128/#129/#133 (MERGEABLE).
- Prod: `v0d32bf7d4` live. Subagenter: K3 HIGH + denylist herdet. Watchdogs starter 08:00/08:30 i morgen.

**Anbefalt rekkefølge (begrunnelse):** Inntekts-kritisk trading-logikk først (PR #134), docs etter, watchdog-verifikasjon gratis i morgen, Alt 2 som neste byggeløp.

---

## Fase 0: Godkjenningspunkter hos Tom (blokkerer alt under)

- [ ] **G1:** Tom godkjenner migrasjons-diff (ligger i PR #134-beskrivelsen)
- [ ] **G2:** Tom/Kimi merger PR #134 → main
- [ ] **G3:** Tom/Kimi merger PR #135 (docs)

---

## Fase 1: Migrasjon mot prod-DB (kun etter G1)

DB er hellig — diff er allerede vist i PR-body; dette er utførelsen etter godkjenning.

**Steg 1: Ta snapshot av berørte tabeller før migrasjon**
```bash
TOKEN=$(grep SUPABASE_ACCESS_TOKEN ~/.zshrc | head -1 | sed 's/.*=//' | tr -d "\"'")
curl -s -X POST "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"SELECT count(*) AS sessions, count(*) FILTER (WHERE trading_pair ~ '"'"'[ /]'"'"') AS u_normaliserte FROM trading_sessions;"}'
```
Forventet: 8 u_normaliserte (orphans fra q62–q67-kartleggingen).

**Steg 2: Kjør migrasjonen**
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d @/tmp/migrate-20260726120000.json   # body = hele SQL-filen som query-streng
```
NB: Kun SISTE statement returneres ved multi-statement — verifiser derfor separat (steg 3). Migrasjonen er idempotent; feil → kjør igjen trygt.

**Steg 3: Verifiser**
```sql
-- Forventet: 0 rader igjen med mellomrom/slash i trading_pair
SELECT count(*) FROM trading_sessions WHERE trading_pair ~ '[ /]';
-- Forventet: 0 stoppede sesjoner med åpen posisjon (orphans adoptert)
SELECT count(*) FROM trading_sessions WHERE status='stopped' AND open_position IS NOT NULL AND open_position::text <> 'null';
-- Forventet: unik indeks finnes igjen
SELECT indexname FROM pg_indexes WHERE tablename='trading_sessions' AND indexdef ILIKE '%UNIQUE%';
```

**Risiko:** Migrasjonen rører 8 orphan-sesjoner + par-format. Idempotent og testet mot lokal kopi — men prod er prod. Ved uventet feil: stopp, rapporter diff, ikke retry blindt.

---

## Fase 2: Deploy PR #134 (kun etter G2 + Fase 1)

**Steg 1:** `git checkout main && git pull`
**Steg 2:** `pkill -9 node` (zombie-clearing, standard prosedyre)
**Steg 3:** `bash scripts/deploy.sh` i **bakgrunn** m/ `notify_on_complete=true` (aldri parallelt med annet node-arbeid)
**Steg 4: Manuell verifisering i prod (mobil + desktop):**
- [ ] Logg inn som Tom → /dashboard/historikk viser **posisjonskort øverst** m/ urealisert P&L
- [ ] Opprett paper-sesjon, kjøp, stopp den → **close-on-stop selger** + toast m/ læringsforklaring
- [ ] Toggle «Selg åpen posisjon når boten stoppes» av → stopp → posisjon beholdes
- [ ] /api/cron/tick: adopterte orphan-posisjoner begynner å ticke igjen (sjekk trading_logs)
- [ ] Sentry: ingen nye errors etter deploy (morgendagens digest dekker dette)

---

## Fase 3: Alt 2 — full posisjons-tabell (neste byggeløp)

**Scope (fra backlog):** Utvid UI-A fra kompakt kort til full posisjons-tabell med per-trade-detaljer.

**Task 1: Spesifiser + rød test**
- Utvid `positions-from-trades.ts` med per-posisjon trade-lot-detaljer (entry-tidspunkter, gjenstående mengde per lot)
- Test: `src/lib/trading/__tests__/positions-from-trades.test.ts` — ny test for lot-detaljer
- Kjør: `npx vitest run src/lib/trading/__tests__/positions-from-trades.test.ts` → FORVENTET FAIL

**Task 2: Implementer lot-detaljer (grønn test)**

**Task 3: API-utvidelse** — `src/app/api/user/trades/route.ts` + `me-trades-api.ts` zod-skjema

**Task 4: Tabell-UI** — `ClientHandelshistorikk.tsx`: ekspanderbart posisjonskort → tabell m/ lots (mobil-først: kort vises som liste på mobil, tabell på desktop)

**Task 5: i18n** — nye nøkler norsk i BÅDE no.json og en.json, `npm run i18n:validate`

**Task 6: Gates + PR**
- `npm run test:unit` (1427+ grønne), `npx tsc --noEmit`, ESLint berørte filer
- Ny branch `feat/alt2-positions-tabell`, PR UTEN merge

**Utførelse:** subagent-driven-development — én K3-subagent per task, to-trinns review (spec → kodekvalitet). Husk i context-feltet: i18n norsk-først-regelen (nå også i AGENTS.md).

---

## Fase 4: Morgendagens gratis verifikasjon (2026-07-26)

- [ ] 08:00 `sentry-digest` leverte i chatten — sjekk at den fant token eller be om det
- [ ] 08:30 `dependabot-vakt` leverte — verifiser worktree-testing fungerte
- [ ] Vurder Kimi-merger #126/#127/#128/#129/#133 (alle MERGEABLE, testet tidligere)

## Åpne spørsmål (Toms valg, ikke blokkende)

1. **Live-handel**: close-on-stop avviser nå live eksplisitt — live-støtte er eget arbeid. Prioriteres?
2. **Cloudflare Workers Builds**: fortsatt ikke bekreftet satt opp — død GitHub-runner står igjen som eneste deploy-vei (manuell).
3. **jokertrade-landing.html**: slettet lokalt, lever i prod — commit-sletting eller gjenoppretting?

## Risikoer / tradeoffs

| Risiko | Tiltak |
|---|---|
| Migrasjon feiler midtveis | Idempotent — les feil, fiks, kjør igjen. Aldri blind retry. |
| Deploy nedetid | Standard deploy.sh-prosedyre; landing er edge-cachet |
| Alt 2 scope-vekst | Kun lot-detaljer + tabell — ingen live-trading, ingen nye API-er utover trades-ruten |
