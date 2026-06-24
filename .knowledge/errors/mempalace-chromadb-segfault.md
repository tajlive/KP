# MemPalace Python CLI Segfault — ChromaDB / Python 3.13 / macOS

> ⚠️ **VIKTIG:** Prosjektet bruker **KUN** MemPalace Node.js MCP-serveren (`scripts/run-mempalace-mcp-v3.mjs`). Python CLI-en `mempalace mine` er **forbudt** å bruke i dette repoet fordi den krasjer på macOS + Python 3.13.

## Symptom
```bash
$ mempalace mine ~/klarpakke
Segmentation fault: 11
```

Crash skjer inne i ChromaDB sin Rust-backend (`chromadb_rust_bindings.abi3.so`).

## Bekreftet crash-report (2026-06-25)
- **Prosess:** Python 3.13.3
- **mempalace (pip):** 3.5.0
- **OS:** macOS 26.5 (25F71), Apple Silicon (ARM-64)
- **Exception:** `EXC_BAD_ACCESS (SIGSEGV)` — `KERN_INVALID_ADDRESS at 0x0000000000000000`
- **Crashed thread:** 17
- **Faulting binary:** `chromadb_rust_bindings.abi3.so`
- **Stack trace top:** `chromadb_rust_bindings.abi3.so + 26147832` (mutex/segment-locking)

Dette er en null-pointer-deref inne i ChromaDBs Rust-kjerne under oppstart/indexering.

## Environment
- Python: 3.13.x (testet 3.13.3)
- ChromaDB: 1.5.8 → 1.5.9 (oppgradert — hjalp ikke)
- OS: macOS (M1/M2/M3/M4)
- mempalace (pip): 3.3.4 → 3.5.0 (krasjer fortsatt)

## Root Cause
ChromaDB sin Rust-bakende er inkompatibel med Python 3.13 på macOS. Dette er en upstream-feil — ikke noe vi kan fikse direkte.

## Workaround ✅
**Bruk MemPalace Node.js MCP-server i stedet.** Den er zero-dep, bruker in-memory FTS (inverted index), og krever ikke ChromaDB.

```bash
# Start MCP-serveren direkte (test at den ikke krasjer)
node scripts/run-mempalace-mcp-v3.mjs

# Eller via KIMI MCP-profil (minimal/medium/full — alle inkluderer mempalace)
kimi-mcp minimal

# Full smoke-test av alle MCP-servere
node scripts/mcp-smoke-test.mjs
```

## Hurtig-diagnose
```bash
# 1. Sjekk om du har den ødelagte Python CLI-en i PATH
which mempalace
# Hvis denne returnerer en sti: IGNORER den. Bruk Node.js MCP-serveren.

# 2. Sjekk at KIMI Code CLI bruker riktig MCP-config
cat ~/.kimi-code/mcp.json | grep -A 3 '"mempalace"'

# 3. Sjekk at Node.js MCP-serveren starter
node scripts/run-mempalace-mcp-v3.mjs &
sleep 2
kill %1

# 4. Kjør smoke-test
node scripts/mcp-smoke-test.mjs
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
| Status på macOS + Python 3.13 | ❌ SIGSEGV / krasj | ✅ Fungerer |

## KIMI CLI + MemPalace Oppsett
1. KIMI bruker **kun** Node.js MCP-serveren
2. Ingen `mempalace mine` nødvendig — MCP-serveren indekserer `.knowledge/`, `.mempalace/`, og konfigurerte paths automatisk
3. Perplexity Desktop bruker samme Node.js MCP-server (`~/.perplexity/mcp.json`)

## Hva du skal gjøre hvis du får SIGSEGV
1. Ikke bruk `mempalace mine`.
2. Start KIMI Code CLI på nytt — den vil starte Node.js MCP-serveren automatisk fra `~/.kimi-code/mcp.json`.
3. Hvis du fortsatt har problemer, kjør:
   ```bash
   node scripts/mcp-smoke-test.mjs
   bash .kimi/mcp-check.sh
   npm run mempalace:status
   ```

## Related
- `.kimi/agents/KIMI-MASTER-SYSTEM.md` — MemPalace-protokoll for agenter
- `scripts/run-mempalace-mcp-v3.mjs` — MCP-server (v3.4.0, SuperKIMI-optimalisert)
- `.mempalace/kg.json` — Knowledge Graph (leses/skrives av MCP-server)
- `.mempalace/diary.jsonl` — Diary logg (leses/skrives av MCP-server)
- `scripts/mempalace-status.mjs` — Status-sjekk (viser advarsel hvis Python CLI finnes)
- `.kimi/mcp-check.sh` — Sjekker at MCP-konfigurasjonen inneholder mempalace

---
*Documented: 2026-05-07*  
*Updated: 2026-06-25 med fersk crash-report og diagnosekommandoer*  
*Status: Upstream bug — workaround in place*
