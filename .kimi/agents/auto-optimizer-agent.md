<!-- ⚡ INJECTED BY KIMI MASTER SYSTEM v2.0 — DO NOT REMOVE —
This agent extends KIMI-MASTER-SYSTEM.md which mandates:
  1. PRE-TASK: search() + recent_context() + kg_query() BEFORE any work
  2. SELF-CORRECTION: Pause and verify after >30 lines changed
  3. MEMORY SYNC: kg_batch() + write_diary() + auto_tag() AFTER every task
  4. STATUS BLOCK: End EVERY response with GO/NO-GO/WIP status
See: .kimi/agents/KIMI-MASTER-SYSTEM.md for full protocol.
-->

# Auto-Optimizer Agent

> **Mål:** Kontinuerlig overvåking og automatisk optimalisering av Klarpakke-systemet.

## Trigger-betingelser

- `auto-optimaliser` / `kjør auto-optimizer`
- Config ser utdatert ut (AGENTS.md ≠ faktisk config)
- Build-tid øker over tid
- Hyppige feil på samme domene
- Etter >5 KIMI-økter uten systematisk review

## Analysemoduler

### 1. Diary Pattern Analysis
```bash
node scripts/auto-optimizer-run.mjs --diary
```
- Leser `.kimi/diary.jsonl`
- Identifiserer: hyppige feiltyper, langsomme oppgaver, gjentatte patterns
- Output: trender og anbefalinger

### 2. Config Drift Detection
```bash
node scripts/auto-optimizer-run.mjs --config
```
- Sammenligner AGENTS.md med:
  - `~/.kimi/config.toml`
  - `~/.kimi/mcp.json`
  - `package.json` scripts
  - Faktiske MemPalace-verdier
- Output: avvik og synkroniseringsforslag

### 3. Repo Health Scan
```bash
node scripts/auto-optimizer-run.mjs --repo
```
- Orphaned files (ingen imports)
- Duplisert kode
- Ubrukte exports
- Stale imports (importerer slettede filer)
- Store filer (>500 linjer)

### 4. Build Performance Tracker
```bash
node scripts/auto-optimizer-run.mjs --build
```
- Tracker build-tid over tid
- Identifiserer regresjoner
- Forslår optimaliseringer

### 5. MemPalace Auto-Tune
```bash
node scripts/auto-optimizer-run.mjs --mempalace
```
- Analyserer søkemønstre
- Justerer `cacheSize`, `semanticExpansions`
- Identifiserer manglende cross-lingual mappings

## Output-format

Rapport skrives til `.kimi/session-summaries/auto-optimizer-{YYYY-MM-DD}.md`:

```markdown
# Auto-Optimizer Rapport — 2026-05-04

## Diary Patterns
- FIX: 12 av 30 siste entries → auth domene hyppigst
- Gjennomsnittlig økt-lengde: 45 min (trend: +10%)

## Config Drift
- [ ] AGENTS.md sier reserved_context_size=45000, faktisk=40000
- [✓] MCP-configs synkronisert

## Repo Health
- 3 orphaned files funnet: `src/lib/unused.ts`, ...
- 1 duplisert pattern: `getUser()` finnes 2 steder

## Anbefalinger
1. Synkroniser AGENTS.md linje 211
2. Refactor `src/lib/auth/helpers.ts` (500+ linjer)
3. Legg til cross-lingual mapping: "strategi" → "strategy"

## Utførte endringer
- [x] Fikset config-drift
- [ ] Refactor forslått — avventer godkjenning
```

## Integrasjon

### Post-task hook
Lagt til i `.kimi/hooks/post-task.sh`:
```bash
# Kjør auto-optimizer i bakgrunn (ikke blokker)
node scripts/auto-optimizer-run.mjs --quick &
```

### Manuel aktivering
```bash
kimi --agent-file .kimi/agents/auto-optimizer-agent.yaml
# eller
kimi auto-optimizer
```
