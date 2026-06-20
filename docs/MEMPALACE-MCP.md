# 🏛️ MemPalace MCP System

MemPalace MCP er Klarpakkes lokale prosjektkunnskapssystem for KIMI. Det gir KIMI
tilgang til indeksert kunnskap, knowledge graph (KG) og dagbok via Model Context
Protocol (MCP).

---

## Arkitektur

```text
┌─────────────────────────────────────────────┐
│ KIMI CLI                                    │
│  └── leser ~/.kimi/mcp.json                 │
│       └── mcpServers.mempalace              │
└──────────────────┬──────────────────────────┘
                   │ stdio (MCP)
┌──────────────────▼──────────────────────────┐
│ MemPalace MCP Server v3.4.0                 │
│ scripts/run-mempalace-mcp-v3.mjs            │
│                                             │
│  • In-memory inverted index (TF-IDF)        │
│  • Bigram-scoring for fraser                │
│  • Cross-lingual norsk↔engelsk              │
│  • Enkel stemming                           │
│  • File watcher m/debounce                  │
│  • Atomisk index/KG-skriving                │
│  • Persistens til .mempalace/index-cache-v3 │
└─────────────────────────────────────────────┘
```

KIMI CLI starter MemPalace automatisk fra MCP-konfigurasjonen. Det er **ingen**
selvstendig HTTP-server eller fast port.

---

## Konfigurasjon

MCP-konfigurasjonen ligger i:

- Global: `~/.kimi/mcp.json`
- Prosjekt: `.mcp/mcp_config.json`

`mempalace`-oppføringen ser omtrent slik ut:

```json
{
  "mempalace": {
    "command": "node",
    "args": ["/Users/taj/klarpakke/scripts/run-mempalace-mcp-v3.mjs"]
  }
}
```

Ved endringer i `args` må begge config-filene oppdateres.

---

## Hva som indekseres

| Kilde | Type | Rom/label |
|-------|------|-----------|
| `.knowledge/` | Markdown/tekst | Knowledge |
| `.kimi/diary.jsonl` | JSONL | Diary |
| `.mempalace/handoffs/` | Markdown | Handoffs |
| `.mempalace/plans/` | Markdown | Plans |
| `docs/` | Markdown | Docs |
| `memory/` | Markdown | Memory |

Kritiske rom får høyere prioritet ved søk:

- `critical_decisions`
- `error_patterns`
- `infrastructure`
- `api_contracts`
- `trading`

---

## MCP-verktøy

| Verktøy | Beskrivelse |
|---------|-------------|
| `search` | TF-IDF + bigram-søk i kunnskap. Bruk FØRST. |
| `semantic_search` | KG-basert semantisk søk med cross-lingual ekspansjon. |
| `recent_context` | Hent nylig lagt til innhold (timer tilbake). |
| `kg_query` | Spør knowledge graph om en entitet. |
| `kg_add` | Legg til ett faktum i KG. |
| `kg_batch` | Batch-legg til flere KG-fakta. |
| `kg_find_path` | Finn sti mellom to entiteter i KG. |
| `read_diary` | Les dagbok for en agent. |
| `write_diary` | Skriv dagboksentry etter oppgave. |
| `get_status` | Status for indeks, cache og KG. |
| `get_room_info` | List eller beskriv et rom. |
| `auto_tag` | Generer semantiske tags for tekst. |

---

## MCP-prompts

| Prompt | Bruk |
|--------|------|
| `pre_task` | Kjør FØR en oppgave for å hente kontekst. |
| `post_task` | Kjør ETTER en oppgave for å lagre oppsummering. |
| `agent_auth` | Systemprompt for auth-agent. |
| `agent_architect` | Systemprompt for architect-agent. |
| `superkimi_boost` | Aktiver maksimal kontekst og tenke-disiplin. |

---

## Bruk

### Fra KIMI
KIMI kaller verktøyene direkte, for eksempel:

```text
Søk i MemPalace etter "auth callback pattern"
```

### Fra terminal
```bash
# Søk i kunnskap
node scripts/mempalace-search.mjs "auth callback pattern"

# Sjekk status
npm run mempalace:status

# Tving re-indeksering
node scripts/mempalace-reindex.mjs

# Seed kunnskap
npm run mempalace:seed
```

---

## Feilsøking

| Problem | Løsning |
|---------|---------|
| MCP-server vises ikke | Sjekk `~/.kimi/mcp.json` og `.mcp/mcp_config.json` |
| Gamle treff / manglende endringer | Kjør `node scripts/mempalace-reindex.mjs` |
| File watcher slår ikke til | Start en ny KIMI-sesjon |
| Treg første oppstart | Serveren bygger indeksen; senere lastes cache |

---

**MemPalace MCP gir KIMI supermenneskelig prosjektforståelse — helt lokalt og
uten HTTP-port.** 🏛️✨
