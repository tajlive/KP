# 🧠 MEMPALACE HANDOFF
# Dato: 2026-04-14 17:52 CEST
# Økt: Perplexity → Kimi MCP-fix + paper-trading init 500 + i18n toasts
# Status: ✅ FULLFØRT

---

## 🔴 BUGS FUNNET OG FIKSET

### BUG 1 — P0 — POST /api/paper-trading/init → 500

**Rotårsak:**
`createPaperTradingSession()` i `src/lib/supabase/paper-trading.ts` manglet fire felt
i INSERT-payloaden som er `NOT NULL` i Supabase-skjemaet:
- `total_trades`
- `winning_trades`
- `losing_trades`
- `pnl`

**Sekundær rotårsak:**
`getPaperTradingSession()` brukte `.single()` som krasjer med exception når 0 rader returneres.
Riktig: `.maybeSingle()` returnerer `null` for 0 rader uten exception.

**Filen:** `src/lib/supabase/paper-trading.ts`

**Fix:**
```typescript
// createPaperTradingSession: la til:
total_trades: 0,
winning_trades: 0,
losing_trades: 0,
pnl: 0,

// getPaperTradingSession: endret:
.single() → .maybeSingle()
// Fjernet PGRST116-spesialsjekk (ikke nødvendig med maybeSingle)
```

---

### BUG 2 — P1 — Toast viste rå i18n-nøkler

**Symptom:** `toasts.paperBot.startedTitle` og `toasts.paperBot.startedDesc` vises i UI

**Rotårsak:** `messages/no/toasts.json` og `messages/en/toasts.json` eksisterte ikke.
next-intl faller tilbake til rå nøkkel-streng når namespace mangler.

**Fix:** Opprettet begge filer med nøklene:
- `paperBot.startedTitle/Desc/stoppedTitle/Desc/errorTitle/Desc`
- `session.createdTitle/Desc/errorTitle/Desc`

---

### BUG 3 — P1 — MISSINGMESSAGE i console

| Fil | Manglende nøkkel | Fix |
|---|---|---|
| `messages/no/threeSteps.json` | `ctaButtonLoggedIn`, `ctaSubtextLoggedIn` | Lagt til |
| `messages/en/threeSteps.json` | `ctaButtonLoggedIn`, `ctaSubtextLoggedIn` | Lagt til |
| `messages/en/dashboard.json` | `sidebar.paper`, `sidebar.courses` (+ 5 andre) | Lagt til `sidebar`-objekt |
| `messages/no/dashboard.json` | `sidebar.*` | Lagt til `sidebar`-objekt |

---

### BUG 4 — P1 — `kimi_ask` og `kimi_code` MCP-verktøy krasjet

**Symptom:** `No such command 'Les /Users/taj/klarpakke/...'`

**Rotårsak:**
`callKimi()` i `scripts/run-kimi-mcp.mjs` sendte prompt som posisjonelt CLI-argument:
```js
// FEIL:
const kimiArgs = ["--yolo", ...extraArgs, prompt];
```
Kimi CLI er en **Click-basert task runner** (ikke AI chat-klient).
Click tolker fritekst-argument som subkommandonavn → `No such command`.

**Fix:** Prompt sendes via stdin i stedet:
```js
// RIKTIG:
const kimiArgs = ["--yolo", ...extraArgs];
child.stdin.write(prompt + "\n");
child.stdin.end();
```
La til: Click-error-deteksjon, 5 min timeout, meningsfull feilmelding.

---

## 📝 OPPRETTET/ENDRET FILER

```
src/lib/supabase/paper-trading.ts          FIX: insert-felt + .maybeSingle()
messages/no/toasts.json                    NY: toasts namespace NO
messages/en/toasts.json                    NY: toasts namespace EN
messages/no/threeSteps.json                FIX: ctaButtonLoggedIn + ctaSubtextLoggedIn
messages/en/threeSteps.json                FIX: ctaButtonLoggedIn + ctaSubtextLoggedIn
messages/en/dashboard.json                 FIX: sidebar-objekt lagt til
messages/no/dashboard.json                 FIX: sidebar-objekt lagt til
scripts/run-kimi-mcp.mjs                   FIX: callKimi stdin-fix + error-deteksjon
.kimi/KIMI.md                              UPD: v3.2 — MCP-verktøy status-tabell
.kimi/SYSTEM-INSTRUCTIONS.md              NY: komplett agent-konfigurasjon
KIMI-SYSTEM-PROMPT.md                      UPD: referanse til SYSTEM-INSTRUCTIONS.md
docs/KIMI-FIX-PAPER-TRADING-INIT.md       NY: multi-agent prompt-dokument
```

---

## ⚠️ KIMI MCP-VERKTØY STATUS (viktig for neste økt)

| Verktøy | Status | Merknad |
|---|---|---|
| `kimi_db` | ✅ Virker | npm run db:* |
| `kimi_ci` | ✅ Virker | npm run lint:gate |
| `kimi_monitor` | ✅ Virker | npm run health:* |
| `kimi_deploy` | ✅ Virker | Vercel deploy |
| `kimi_ask` | ⚠️ Stdin-mode | Kimi er task-runner, ikke AI-chat |
| `kimi_code` | ⚠️ Stdin-mode | Bruk edit_file/write_file i stedet |

**Alternativ for kodeendringer:** Bruk Perplexity MCP-filverktøy direkte:
`read_text_file`, `edit_file`, `write_file`, `search_files`

---

## 🤖 AGENT-KONFIGURASJON (ny fil)

Fil: `/Users/taj/klarpakke/.kimi/SYSTEM-INSTRUCTIONS.md`

Inneholder:
- Verktøy-prioriteringstabell
- 4 agent-arketyper: DB-FIX, I18N-FIX, API-FIX, DEPLOY
- Standard 5-stegs arbeidsflyt
- Sikkerhetsnett-regler
- Viktige filer agenter må lese ved oppstart

---

## 📊 CI STATUS

- ESLint (lint:gate): ✅ PASS — ingen nye errors
- Kun pre-eksisterende `@typescript-eslint/no-explicit-any` warnings
- TypeScript: ikke kjørt eksplisitt, men ingen nye type-endringer

---

## 🚀 NESTE STEG

- [ ] Commit og push: `git add -A && git commit -m "fix(paper-trading): init 500 + i18n + kimi-mcp stdin-fix"`
- [ ] Verifiser POST /api/paper-trading/init returnerer 200 i prod
- [ ] Verifiser toast viser «Strategi startet» (ikke rå nøkkel)
- [ ] Verifiser ingen MISSINGMESSAGE i prod console
- [ ] Vurder: automatisere MemPalace handoff i post-task hook

---

## 🗂️ FEIL-MØNSTRE OPPDAGET (legg til error_patterns-rom)

**Mønster 1: Supabase INSERT → 500**
Sjekk alltid: alle `NOT NULL`-kolonner uten `DEFAULT` må inkluderes i INSERT-payloaden.
Verktøy: `kimi_db status` for å se schema-info.

**Mønster 2: next-intl MISSINGMESSAGE**
Sjekk alltid: både `messages/no/` og `messages/en/` må ha tilsvarende fil.
Opprett alltid begge samtidig.

**Mønster 3: Click CLI + fritekst**
Aldri send fritekst som posisjonelt CLI-argument til Click-baserte verktøy.
Bruk alltid stdin (`child.stdin.write()`) eller `--flag="tekst"` syntax.
