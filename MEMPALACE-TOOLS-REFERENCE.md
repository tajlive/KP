# 🏛️ MemPalace MCP — Verktøy Referanse (v3.1.1)

> **Oppdatert:** 2026-05-03 | MemPalace MCP Server v3.1.1 | KIMI CLI v1.40.0 + k2.6

---

## 📊 MemPalace MCP Verktøy (12 stk)

Disse verktøyene eksponeres via `run-mempalace-mcp-v2.mjs` (MCP-server).

| # | Verktøy | Beskrivelse | Når å bruke |
|---|---------|-------------|-------------|
| 1 | `search` | TF-IDF søk i prosjektkunnskap | Først — finn eksisterende kontekst |
| 2 | `semantic_search` | Semantisk søk uten eksakt ord-match | Når søkeord kan variere |
| 3 | `recent_context` | Hent innhold fra siste N timer | Finn det som skjedde i forrige sesjon |
| 4 | `kg_query` | Query knowledge graph for entity | Finn alt vi vet om et koncept |
| 5 | `kg_add` | Legg til ett faktum i KG | Etter isolerte funn |
| 6 | `kg_batch` | Batch-insert flere KG-fakta | Etter store oppgaver |
| 7 | `kg_find_path` | Finn sti mellom to entiteter | Auth → Trading, etc. |
| 8 | `read_diary` | Les dagbok (siste N entries) | Hent historikk |
| 9 | `write_diary` | Skriv til dagbok | Etter hver signifikant oppgave |
| 10 | `get_status` | Systemstatus — indexer, docs, cache | Diagnostikk |
| 11 | `get_room_info` | List rom eller info om ett rom | Utforsk struktur |
| 12 | `auto_tag` | Auto-generer tags fra tekst | Kategorisering |

### Rom-struktur

| Rom | Path | Innhold |
|---|---|---|
| Knowledge | `.knowledge/` | ADR-er, patterns, API-kontrakter |
| Diary | `.kimi/diary.jsonl` | Strukturerte sesjonslogger |
| Handoffs | `.mempalace/handoffs/` | Deploy/fix-overleveringer |
| Plans | `.mempalace/plans/` | Task-planer |
| Docs | `docs/` | Arkitektur, setup-guides |
| Memory | `memory/` | Ustrukturert minne |

---

## 🔗 Andre MCP-servere (separate)

MemPalace MCP-serveren inneholder **kun** de 12 verktøyene over.
Øvrige verktøy tilbys av dedikerte MCP-servere konfigurert i `~/.kimi/mcp.json`:

| Server | Formål |
|--------|--------|
| `filesystem` | Filoperasjoner i prosjektet |
| `supabase-db` | SQL queries, tabeller, migrasjoner |
| `sanity` | CMS read + write |
| `github` | Repo, issues, pull requests |
| `context7` | Bibliotekdokumentasjon |
| `perplexity` | AI-søk og research |

---

## 💡 Raske Eksempler

### Søk i lokalt minne
```
search(query="auth refresh token race condition")
```

### Semantisk søk
```
semantic_search(concept="OAuth retry storm mitigation")
```

### Hent siste aktivitet
```
recent_context(hours=48)
```

### Query knowledge graph
```
kg_query(entity="auth-system", depth=2)
```

### Lagre funn
```
kg_add(subject="auth-system", predicate="uses", object="refresh-token-guard")
```

### Skriv til dagbok
```
write_diary(entry={type:"FIX", task:"fiks auth", status:"GO", rating:5, files:3})
```

---

## 📁 Konfigurasjon

**MCP Config:** `~/.kimi/mcp.json`  
**MemPalace Server:** `scripts/run-mempalace-mcp-v2.mjs`  
**Diary:** `.kimi/diary.jsonl`  
**Knowledge Graph:** `.mempalace/kg.json`

---

*Sist oppdatert: 2026-05-03*
