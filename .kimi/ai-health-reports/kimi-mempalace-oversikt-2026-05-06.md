# KIMI CLI + MemPalace — Full Oversikt

> Generert: 2026-05-06  
> Prosjekt: Klarpakke (klarpakke.no)  
> KIMI CLI: v1.40.0 | Model: k2.6 (262k kontekst)  
> MemPalace: v3.3.0

---

## 1. KIMI CLI Status

| | Verdi |
|---|---|
| **Versjon** | 1.40.0 (siste tilgjengelig) |
| **Default model** | `kimi-code/kimi-for-coding` (k2.6) |
| **Kontekst** | 262 144 tokens |
| **Capabilities** | image_in, thinking, video_in |
| **Theme** | dark |
| **Thinking** | aktivert (default) |
| **Yolo** | av (default) |
| **Skills** | merge_all_available_skills = true |

### Loop Control (k2.6-optimalisert)

| Parameter | Verdi | Kommentar |
|---|---|---|
| `max_steps_per_turn` | 750 | økt fra 500 |
| `max_retries_per_step` | 5 | økt fra 3 |
| `max_ralph_iterations` | 2 | self-improvement loop |
| `reserved_context_size` | 40 000 | 22k arbeidsminne |
| `compaction_trigger_ratio` | 0.94 | sjeldnere komprimering |
| `agent_task_timeout_s` | 1800 | 30 minutter |

### Background Tasks

| Parameter | Verdi |
|---|---|
| `max_running_tasks` | 4 |
| `read_max_bytes` | 30 000 |
| `worker_stale_after_ms` | 15 000 |
| `kill_grace_period_ms` | 2000 |

### Hooks

| Event | Kommando | Status |
|---|---|---|
| `SessionEnd` | `~/.kimi/hooks/mempalace-smart-exit.sh` | ✅ aktiv |

SessionEnd-hook kjører:
1. MemPalace flush
2. Self-improve analyse (`kimi-self-improve`)
3. Git-diff analyse
4. Session-summary lagring

---

## 2. MCP — Model Context Protocol

### Aktiv profil: **minimal** (7 servere)

Bytt profil: `kimi-mcp [minimal|medium|full]`

| Server | Type | Status | Merknad |
|---|---|---|---|
| **filesystem** | Filoperasjoner | 🟢 | Lokal wrapper |
| **supabase-db** | Postgres SQL | 🟢 | Lokal wrapper |
| **sanity** | CMS read/write | 🟢 | Lokal wrapper v2 |
| **github** | Repo/Issues/PR | 🟢 | Lokal wrapper |
| **context7** | Dokumentasjon | 🟢 | Lokal wrapper |
| **perplexity** | AI-research | 🟢 | Lokal wrapper |
| **mempalace** | Kunnskap/KG | 🟡 | v3.3.0, zero-dep |

### Tilgjengelige profiler

| Profil | Servere | Bruk |
|---|---|---|
| **minimal** | 7 | Daglig koding (aktiv) |
| **medium** | 14 | Deploy, testing, monitor |
| **full** | 25 | Alle integrasjoner |

### Medium (ekstra servere)
- vercel, sentry, stripe, opik, linear, cloudflare
- binance, openai, monitor, cron, featureflag, search, cost

### Full (ekstra serverer)
- vipps, resend, playwright, chrome-devtools
- klarpakke (remote, fjernet pga treghet)

### MCP Config-filer

| Fil | Sist endret |
|---|---|
| `~/.kimi/mcp.json` (minimal) | 2026-05-06 |
| `~/.kimi/mcp.medium.json` | 2026-05-06 |
| `~/.kimi/mcp.full.json` | 2026-05-06 |
| `~/.kimi/mcp.minimal.json` | 2026-05-04 (backup) |

---

## 3. MemPalace v3.3.0

### Arkitektur
- **Type:** Zero-dep, in-memory med disk-persistens
- **Index:** Inverted index (TF-IDF + Bigram + Cross-lingual)
- **Oppstart:** <100ms fra `index-cache-v3.json.gz`
- **File watcher:** Inkrementell reindex ved runtime-endringer

### Data

| Fil | Størrelse | Oppdatert |
|---|---|---|
| `.mempalace/kg.json` | 69 KB | 2026-05-06 17:35 |
| `.mempalace/index-cache-v3.json.gz` | 2.0 MB | 2026-05-06 17:35 |
| `.kimi/diary.jsonl` | 134 KB | 2026-05-06 23:33 |

### Knowledge Graph
- **Noder:** ~500+ entities
- **Relasjoner:** 2542 linjer i kg.json
- **Features:** Cross-lingual (norsk↔engelsk), stemming, semantic tags

### Rom

| Rom | Innhold |
|---|---|
| `Knowledge` | ADR-er, arkitekturbeslutninger |
| `Diary` | Session-logger, GO/NO-GO |
| `Handoffs` | Overleveringer mellom agenter |
| `Plans` | Implementeringsplaner |
| `Docs` | API-kontrakter, dokumentasjon |
| `Memory` | Prosjektkunnskap, patterns |

### MCP Verktøy

| Verktøy | Funksjon |
|---|---|
| `search` | TF-IDF + Bigram søk |
| `semantic_search` | KG-basert synonym-ekspansjon |
| `kg_query` | Knowledge graph oppslag |
| `kg_add` / `kg_batch` | Legge til fakta |
| `recent_context` | Siste N timer |
| `write_diary` | Session-logging |
| `auto_tag` | Automatiske semantiske tags |

---

## 4. KIMI Aliaser & Scripts

### `~/.kimi/bin/` — Globale aliaser

| Script | Funksjon |
|---|---|
| `kimi-mcp` | Bytt MCP-profil (minimal/medium/full) |
| `kimi-smart` | Interaktiv smart orchestrator |
| `kimi-smart-brief` | Generer pre-session brief |
| `kimi-smart-launch` | Komplett session wrapper (kontekst + agent + MCP) |
| `kimi-smart-start` | Rask session-start |
| `kimi-self-improve` | Post-session analyse |
| `kimi-suggest-agent` | Foreslå agent basert på oppgave |
| `kimi-memory-guard` | Minne-overvåking |

### Lokale prosjekt-scripts (`scripts/`)

| Script | Funksjon |
|---|---|
| `mempalace-search.mjs` | Søk i kunnskap |
| `mempalace-exit-flush.mjs` | Session-end flush |
| `mempalace-auto-capture.mjs` | Auto-capture ved filendringer |
| `mempalace-dashboard.mjs` | Status-dashboard |
| `knowledge-search.sh` | Hurtigsøk |

### Orkestrering

```
kimi-smart-launch "din oppgave"
  → MemPalace search + recent_context
  → Git-kontekst (branch, commits)
  → Domain detection → agent-valg
  → MCP-profil valg
  → Generer brief
  → Start KIMI med riktig agent
```

---

## 5. Hooks & Automasjon

### SessionEnd (`mempalace-smart-exit.sh` v2.0)

Kjøres automatisk når KIMI session avsluttes:

1. **MemPalace flush** — lagrer KG og index til disk
2. **Self-improve analyse** — analyserer diary for patterns
3. **Git-diff analyse** — sjekker endringer, gir verify-anbefalinger
4. **Session-summary** — lagrer til `.kimi/session-summaries/`

### Andre hooks

| Hook | Funksjon |
|---|---|
| `daily-health-check.sh` | Daglig system-sjekk |
| `monthly-backup.sh` | Månedlig backup |
| `mempalace-save-now.sh` | Manuell lagring |
| `post-session-save.sh` | Rask post-session lagring |

---

## 6. Helse & Diagnose

### KIMI CLI
- ✅ Versjon 1.40.0 (siste)
- ✅ Config valid
- ✅ OAuth-autentisering aktiv
- ⚠️ Log inneholder MallocStackLogging-meldinger (macOS-noise, ikke kritisk)

### MemPalace
- ✅ Index-cache oppdatert (2026-05-06)
- ✅ Søk fungerer (testet: 127 treff for "kimi cli")
- ✅ KG: 2542 relasjoner
- ✅ Diary: 134 KB (innenfor normalt)

### MCP
- ✅ Alle 7 minimal-servere lokalt installert
- ✅ Ingen npx-avhengigheter
- ⚠️ MCP metadata var utdatert (v3.1 → v3.3) — fikset 2026-05-06

### Prosjekt
- ✅ 866 tester, alle grønne
- ✅ Type-check clean
- ✅ Produksjon deployet og 200 OK

---

## 7. Siste endringer (2026-05-06)

| Commit | Endring |
|---|---|
| `736e3302f` | Mobil audit tools + RiskMetricsPanel error handling |
| `9bfd398bf` | P0 trading currency bugs, realized_pnl, distributed locks |
| `37b05b59e` | i18n: TrialBanner, LiveStrategyView, PaperTradingSessionDetail |
| `39571fab9` | Mobil-first UX audit: bot-tall, i18n, responsivitet |

---

## 8. Kjente begrensninger

1. **MemPalace MCP** kan feile ved høy last (zero-dep, single-threaded)
2. **MCP tool_call_timeout** = 120s — tilstrekkelig for de fleste operasjoner
3. **Diary vokser** — vurder komprimering ved >500KB
4. **Index-cache** = 2.0MB — OK, men overvåk ved >5MB

---

## 9. Hurtigkommandoer

```bash
# Bytt MCP-profil
kimi-mcp minimal   # rask oppstart (7 servere)
kimi-mcp medium    # balansert (14 servere)
kimi-mcp full      # alle (25 servere)

# Smart session-start
kimi-smart-launch "din oppgave"

# MemPalace søk
./scripts/mempalace-search.mjs "query"

# Status
kimi --version
node scripts/mempalace-dashboard.mjs

# Mobil audit
node scripts/mobile-audit-scanner.mjs
npx playwright test e2e/mobile/mobile-empty-state-audit.spec.ts
```
