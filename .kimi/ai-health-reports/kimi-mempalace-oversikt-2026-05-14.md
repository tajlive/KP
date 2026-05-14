# KIMI CLI + MemPalace — Full Oversikt

> Generert: 2026-05-14
> Prosjekt: Klarpakke (klarpakke.no)
> KIMI CLI: v1.42.0 | Model: k2.6 (262k kontekst)
> MemPalace: v3.3.0

---

## 1. KIMI CLI Status

| | Verdi |
|---|---|
| **Versjon** | 1.42.0 (siste tilgjengelig) |
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
| `max_steps_per_turn` | 1000 | økt fra 500 (v1.40.0) |
| `max_retries_per_step` | 5 | økt fra 3 |
| `max_ralph_iterations` | 2 | self-improvement loop |
| `reserved_context_size` | 40 000 | 22k arbeidsminne |
| `compaction_trigger_ratio` | 0.94 | sjeldnere komprimering |
| `agent_task_timeout_s` | 1800 | 30 minutter |
| `tool_call_timeout_ms` | 120000 | 2 min — raskere fail |

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
| **mempalace** | Kunnskap/KG | 🟢 | v3.3.0, zero-dep, TF-IDF + bigram |

### Tilgjengelige profiler

| Profil | Servere | Bruk |
|---|---|---|
| **minimal** | 7 | Daglig koding (aktiv) |
| **medium** | 14 | Deploy, research, testing, monitor, cron |
| **full** | 25 | Alle integrasjoner + cost + search + feature flags |

### MCP Config-filer

| Fil | Sist endret |
|---|---|
| `~/.kimi/mcp.json` (minimal) | 2026-05-14 |
| `~/.kimi/mcp.medium.json` | 2026-05-06 |
| `~/.kimi/mcp.full.json` | 2026-05-06 |

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
| `.mempalace/kg.json` | ~400 KB | 2026-05-14 |
| `.mempalace/index-cache-v3.json.gz` | 2.0 MB | 2026-05-06 |
| `.kimi/diary.jsonl` | 134 KB | 2026-05-06 |

### Knowledge Graph
- **Noder:** ~200+ entities
- **Relasjoner:** 3800+ entries i kg.json
- **Features:** Cross-lingual (norsk↔engelsk), stemming, semantic tags

### Hosting-facts (oppdatert 2026-05-14)
- `klarpakke hosted_on fly.io`
- `klarpakke cdn cloudflare`
- `klarpakke legacy_hosting vercel`
- `fly.io region arn`
- `deployment pipeline github-actions-fly.io`

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

---

## 6. Arkitektur — Fly.io + Cloudflare

> Migrert fra Vercel 2026-05-12

```
User → Cloudflare DNS (klarpakke.no) → Cloudflare CDN/Proxy → Fly.io (Docker)
                                       ↓
                              DDoS + SSL + Caching
```

| Komponent | Verdi |
|---|---|
| **Primær hosting** | Fly.io (`klarpakke.fly.dev`, region `arn`) |
| **CDN/Proxy** | Cloudflare (DNS, DDoS, SSL, caching) |
| **Legacy hosting** | Vercel (analytics, edge-config, speed-insights) |
| **Database pooler** | Supavisor (port 6543, IPv4) |
| **CI/CD** | GitHub Actions → `flyctl deploy --remote-only` |
| **Build** | Docker, Node 24 slim, standalone output |

---

*Sist oppdatert: 2026-05-14 | Versjon: 3.0*
