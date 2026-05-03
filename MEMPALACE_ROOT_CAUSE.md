# Root Cause Analysis: MemPalace Not Auto-Updated

> Dato: 2026-05-03 | Session: Binance opt + Beta cleanup + Routing fixes

---

## 🔍 Hva ble logget (fra `.kimi/diary.jsonl`)

### Auto-capture (pre-commit hook)

| Tidspunkt | Commit | Fanget? | Årsak |
|---|---|---|---|
| 14:30 | `sync-prices opt` | ✅ Ja | `src/app/api/cron/sync-prices/route.ts` → kategori **API** |
| 14:41 | `realistic-execution opt` | ✅ Ja | `ai-engine/route.ts` + `feature-loader/route.ts` → kategori **API** |
| ~17:14 | `beta/auto-trade slettet` | ❌ **Nei** | Sletting av `src/app/[locale]/(beta)/` → **INGEN kategori** |
| ~17:17 | `Hele beta/ slettet` | ❌ **Nei** | Sletting + flytting → **INGEN kategori** |
| ~17:43 | `Routing 7 fikser` | ❌ **Nei** | `src/middleware/`, `src/lib/routing/` → **INGEN kategori** |

### Manuell MCP (etter bruker spurte)

| Tidspunkt | Type | Task |
|---|---|---|
| 18:39 | OPT | Binance API optimaliseringer |
| 18:39 | REF | Slett beta/ zombie mappe |
| 18:39 | FIX | Routing audit + 7 anbefalinger |

---

## 🐛 3 Root Causes

### Root Cause #1: Auto-capture er for restriktiv

**Fil:** `scripts/mempalace-auto-capture.mjs:32-41`

```js
const changes = {
  db:    files.filter(f => f.startsWith('supabase/migrations/')),
  i18n:  files.filter(f => f.includes('messages/') && f.endsWith('.json')),
  api:   files.filter(f => f.startsWith('src/app/api/')),
  trading: files.filter(f => f.includes('lib/trading/') || f.includes('features/trading/')),
  scripts: files.filter(f => f.startsWith('scripts/'))
};
```

**Problem:** Fanget kategorier er **5 av ~20** mulige domener. Dagens arbeid:
- Beta-sletting: `src/app/[locale]/(beta)/` → ingen match
- Routing-fikser: `src/middleware/`, `src/lib/routing/` → ingen match
- `next.config.mjs` → ingen match
- `src/lib/binance.ts` → ingen match (ikke under `lib/trading/`)

**Konsekvens:** `if (!types) return;` slår til → **ingenting logges**.

---

### Root Cause #2: MCP tools ble IKKE kalt automatisk

**Forventet (fra AGENTS.md):**
> "ETTER oppgave: `kg_add()` / `kg_batch()` + `write_diary()` + `auto_tag()`"

**Reelt:** MCP tools ble aldri kalt automatisk under sessionen. De ble først brukt da brukeren eksplisitt spurte "Er mempalace oppdatert?"

**Årsak:** KIMI CLI har ingen innebygd auto-trigger for MCP tools etter verktøy-bruk. Dette er en **protokoll-brudd** — agenten må manuelt huske å kalle MemPalace.

---

### Root Cause #3: Post-task hook mangler mempalace CLI

**Fil:** `.kimi/hooks/post-task.sh:32-36`

```bash
if command -v mempalace >/dev/null 2>&1; then
    npm run knowledge:sync 2>/dev/null
else
    echo "ℹ️  mempalace not available — knowledge will sync on next availability"
fi
```

**Problem:** `mempalace` CLI finnes ikke. Hooken faller tilbake til lokal `diary.jsonl` uten å synce til MemPalace MCP.

**Mangler:** Hooken burde:
1. Sjekke om MCP er tilgjengelig (ikke bare CLI)
2. Kalle `write_diary` via MCP hvis tilgjengelig
3. Kalle `kg_batch` via MCP for viktige endringer

---

## ✅ Hva som FUNKET

| Mekanisme | Status | Kommentar |
|---|---|---|
| Pre-commit hook (steg 6/6) | ✅ Kjørte | `mempalace-auto-capture.mjs` kjørte på ALLE commits |
| Auto-capture for API-endringer | ✅ Fanget 2/3 commits | Første 2 Binance-optimaliseringer ble logget |
| `.kimi/diary.jsonl` | ✅ Oppdatert | 147 entries totalt |

---

## 🔧 Anbefalte fikser

### Fix #1: Utvid auto-capture kategorier (5 min)

```js
// scripts/mempalace-auto-capture.mjs
const changes = {
  db:      files.filter(f => f.startsWith('supabase/migrations/')),
  i18n:    files.filter(f => f.includes('messages/') && f.endsWith('.json')),
  api:     files.filter(f => f.startsWith('src/app/api/')),
  trading: files.filter(f => f.includes('lib/trading/') || f.includes('features/trading/')),
  scripts: files.filter(f => f.startsWith('scripts/')),
  // NYE:
  routing: files.filter(f => f.includes('middleware/') || f === 'next.config.mjs' || f.includes('routing/')),
  cleanup: files.filter(f => f.includes('(beta)') || f.includes('(onboarding)')),
  binance: files.filter(f => f.includes('binance') && !f.includes('test')),
  config:  files.filter(f => f.endsWith('.config.mjs') || f.endsWith('.config.ts')),
};
```

### Fix #2: Lag en MCP-basert post-task hook (15 min)

Erstatt `.kimi/hooks/post-task.sh` med en Node.js-script som:
1. Leser siste git commit
2. Kaller `write_diary` via MCP
3. Kaller `kg_batch` for viktige endringer (basert på filkategorier)

### Fix #3: Agent-protokoll — påminnelse i AGENTS.md (2 min)

Legg til en tydeligere påminnelse:

```markdown
## ⚠️ MemPalace Auto-Sync — MANUELL PÅMINNELSE

MemPalace synker IKKE automatisk. Etter hver signifikant oppgave:

```bash
# Kjør manuelt:
kimi
> "oppdater mempalace med [task]"
```

ELLER bruk MCP tools direkte:
- `write_diary` — logg oppgaven
- `kg_batch` — lagre nøkkelfacts
```

---

## Oppsummering

| Mekanisme | Fanget Binance-opt? | Fanget Beta-cleanup? | Fanget Routing-fikser? |
|---|---|---|---|
| Auto-capture (pre-commit) | ✅ Ja (2/3) | ❌ Nei | ❌ Nei |
| Post-task hook | ❌ Nei (ingen CLI) | ❌ Nei | ❌ Nei |
| MCP manuell (etter spørsmål) | ✅ Ja | ✅ Ja | ✅ Ja |

**Konklusjon:** MemPalace er avhengig av **manuell synkronisering** for alle oppgaver utenfor de 5 hardkodede kategoriene i auto-capture. Beta-cleanup og routing-fikser falt gjennom alle automatiske mekanismer.
