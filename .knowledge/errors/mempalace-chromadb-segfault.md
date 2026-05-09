# MemPalace Python CLI Segfault — ChromaDB / Python 3.13 / macOS

## Symptom
```bash
$ mempalace mine ~/klarpakke
Segmentation fault: 11
```

Crash skjer inne i ChromaDB sin Rust-backend:
```
chromadb/api/rust.py:440
```

## Environment
- Python: 3.13.x
- ChromaDB: 1.5.8 → 1.5.9 (oppgradert — hjalp ikke)
- OS: macOS (M1/M2/M3)
- mempalace (pip): 3.3.4

## Root Cause
ChromaDB sin Rust-bakende er inkompatibel med Python 3.13 på macOS. Dette er en upstream-feil — ikke noe vi kan fikse direkte.

## Workaround ✅
**Bruk MemPalace Node.js MCP-server i stedet.** Den er zero-dep, bruker in-memory FTS (inverted index), og krever ikke ChromaDB.

```bash
# Start MCP-serveren direkte
node scripts/run-mempalace-mcp-v3.mjs

# Eller via KIMI MCP-profil (minimal/medium/full — alle inkluderer mempalace)
kimi-mcp minimal
```

### Forskjeller: Python CLI vs Node.js MCP
| Feature | Python CLI (`mempalace mine`) | Node.js MCP (`run-mempalace-mcp-v3.mjs`) |
|---|---|---|
| Backend | ChromaDB (vektordatabase) | In-memory FTS (zero-dep) |
| Indexing | `mempalace mine <path>` | Auto-reindex ved startup + fs.watch |
| Semantic search | ChromaDB embeddings | KG-basert synonym-ekspansjon |
| KG | ChromaDB metadata | Native JSON (`kg.json`) |
| Diary | SQLite | Native JSONL (`diary.jsonl`) |
| MCP verktøy | ❌ Nei | ✅ `search`, `semantic_search`, `kg_query`, `write_diary`, etc. |

## KIMI CLI + MemPalace Oppsett
1. KIMI bruker **kun** Node.js MCP-serveren
2. Ingen `mempalace mine` nødvendig — MCP-serveren indekserer `.knowledge/`, `.mempalace/`, og konfigurerte paths automatisk
3. Perplexity Desktop bruker samme Node.js MCP-server (`~/.perplexity/mcp.json`)

## Related
- `.kimi/agents/KIMI-MASTER-SYSTEM.md` — MemPalace-protokoll for agenter
- `scripts/run-mempalace-mcp-v3.mjs` — MCP-server (v3.3.0, SuperKIMI-optimalisert)
- `.mempalace/kg.json` — Knowledge Graph (leses/skrives av MCP-server)
- `.mempalace/diary.jsonl` — Diary logg (leses/skrives av MCP-server)

---
*Documented: 2026-05-07*
*Status: Upstream bug — workaround in place*
