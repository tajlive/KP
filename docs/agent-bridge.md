# Agent Bridge — Lokal MCP-kontrakt for Klarpakke

## Målarkitektur

```
Perplexity/Computer (Research + Planning)
           │
           ▼
    MemPalace (Kontekst / Minne / Handoffs)
           │
           ▼
    KIMI CLI / MCP (Eneste executor for repo)
           │
           ▼
    Repo → CI → DB → Deploy (Vercel)
```

- **Perplexity** og andre research-agenter brukes til planlegging, research og beslutningsstøtte.
- **MemPalace** er kilde til sannhet for prosjektkontekst, diary, kunnskapsgraf og handoffs.
- **KIMI CLI** er den eneste aktøren som utfører filoperasjoner, kjører tester, deployer og interagerer med databasen.

## Sikkerhetsmodell

| Prinsipp | Implementasjon |
|----------|----------------|
| **Ingen fri shell** | Alle kommandoer går gjennom allowlistet command map |
| **Path guard** | Alle filoperasjoner begrenses til `/Users/taj/klarpakke` |
| **Eksplisitte endringer** | Ingen auto-fix, ingen implisitte side-effekter |
| **En executor** | KIMI CLI alene har skrivetilgang til repo, CI, DB og deploy |

## Allowlist (Command Map)

| Kommando | Beskrivelse |
|----------|-------------|
| `kimi_code` | Filoperasjoner: les/skriv/erstatt innenfor repo-root. Maks 1 samtidig. |
| `kimi_ci` | Lint + type-check parallelt, deretter unit-test. Maks 1 samtidig. |
| `kimi_db_status` | Sjekk migrasjonsstatus. Cachet 60s, deduplisert, fast-path uten npm-overhead. |
| `kimi_monitor_full` | Helsecheck: prod, API, supabase, signals, trading. Cachet 60s, deduplisert, fast-path uten npm-overhead. |

## Anbefalt oppsett: HTTP som default

HTTP-transport er **anbefalt** fremfor stdio fordi:
- Bridge kjører som én persistent prosess
- Cache og single-flight dedupe fungerer på tvers av kall
- Lavere latency ved gjentatte kall (warm process)
- `/health`-endepunkt gir innsikt i drift

### 1. Bygg

```bash
npm run mcp:bridge:build
```

### 2. Start HTTP

```bash
# Med API-key (anbefalt)
MCP_API_KEY=din-nøkkel npm run mcp:bridge:start:http

# Sjekk helse
curl -s http://localhost:3100/health | jq
# → {"status":"ok","version":"2.2.0","cache":{"entries":0,"hits":0,"misses":0}}
```

### 3. Start stdio (fallback)

```bash
npm run mcp:bridge:start
```

> **Merk:** I stdio-mode starter bridge på nytt for hver kommando. Cache og dedupe har **ingen effekt** i denne modusen.

### 4. Utvikling (med tsx)

```bash
npm run mcp:bridge:dev
```

## Setup: Perplexity Local MCP Connector

1. Bygg bridge:
   ```bash
   npm run mcp:bridge:build
   ```
2. Kopier eksempelkonfig:
   ```bash
   cp config/perplexity-local-mcp.example.json ~/.config/perplexity/mcp.json
   ```
3. Juster `MCP_API_KEY` i HTTP-seksjonen.
4. Start Perplexity Desktop.

## Optimaliseringer i v2.1

| Forbedring | Før (v2.0) | Etter (v2.1) |
|------------|------------|--------------|
| **Cold-start** | `npx tsx` (~2–4s) | Pre-kompilert JS (~0.3s) |
| **CI-gate** | Sekvensiell lint → type-check → test | Lint + type-check **parallelt**, deretter test |
| **Read-only kall** | Alltid ny kjøring | **TTL-cache** (60s) + **single-flight dedupe** |
| **Fast-path monitor** | `npm run health:full` (~npm-overhead) | `node scripts/health-check.mjs full` direkte (~100-150ms spart) |
| **Fast-path db** | `npm run db:status` (~npm-overhead) | `supabase migration list --linked` direkte (~100-150ms spart) |
| **Payload-grense** | 4000 tegn | Default **2000 tegn**; `verbose:true` for 200k |
| **Concurrency** | Ubegrenset | `kimi_code` og `kimi_ci` begrenset til **maks 1** samtidig |
| **Observability** | Ingen | Strukturert JSON-logg i `logs/mcp-bridge.log` |
| **Transport** | Kun stdio | **Dual**: stdio + HTTP med `/health` og API-key |

### Single-flight dedupe

Hvis to identiske `kimi_monitor_full`-kall kommer samtidig, kjøres bare ett. Resultatet deles med begge kallere. Dette sparer både CPU og ventetid.

### Kompakte responser

Default returnerer korte summaries og trunkerer `details` til 2000 tegn. Bruk `verbose: true` for full output:

```json
{
  "name": "kimi_db_status",
  "arguments": { "verbose": true }
}
```

### JSON-logging

Hver tool-kall logges til `logs/mcp-bridge.log`:

```json
{
  "tool_name": "kimi_ci",
  "queue_ms": 0,
  "exec_ms": 45231,
  "payload_in_bytes": 47,
  "payload_out_bytes": 1892,
  "cache_hit": false,
  "dedupe_hit": false,
  "exit_code": 0,
  "timestamp": "2026-04-18T00:30:00.000Z",
  "status": "ok",
  "tool_mode": "kimi",
  "verbose": false,
  "schema_version": "2.2.0"
}
```

## Drift

- **Før endring:** Research-agent (Perplexity) leverer plan → lagres i MemPalace.
- **Under endring:** KIMI CLI henter plan fra MemPalace, utfører endringer, verifiserer.
- **Etter endring:** Resultat logges i MemPalace; KIMI CLI kjører `kimi_monitor_full`.

## Smoke Test

### 1. Bygg og start HTTP

```bash
cd /Users/taj/klarpakke
npm run mcp:bridge:build
MCP_API_KEY=test npm run mcp:bridge:start:http &
sleep 1
```

### 2. Test health

```bash
curl -s http://localhost:3100/health | jq
```

### 3. Test tools/list

```bash
curl -s -X POST http://localhost:3100/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq
```

### 4. Test path guard

```bash
curl -s -X POST http://localhost:3100/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"kimi_code","arguments":{"instruction":"les fil","filePath":"/etc/passwd"}}}' | jq
```

Forventet: `ok: false`, `summary: "Path guard avslått"`.

### 5. Test cache og dedupe

```bash
# Første kall (miss)
curl -s -X POST http://localhost:3100/ ... kimi_db_status ...

# Andre kall innen 60s (hit, cached=true)
curl -s -X POST http://localhost:3100/ ... kimi_db_status ...
```

## Next Steps

1. ✅ Kompiler bridge til kjørbar JS.
2. ✅ Dual transport (stdio + HTTP) med `/health`.
3. ✅ TTL-cache, single-flight dedupe og parallell CI.
4. ✅ Fast-path uten npm-overhead for monitor og db_status.
5. ✅ Concurrency control og kompakte responser.
6. ✅ Strukturert JSON-logging med status, tool_mode, verbose.
## Log rotation

For å holde loggen oversiktlig og unngå at gamle og nye schema-versjoner blir blandet:

```bash
npm run mcp:bridge:log:rotate
```

Dette flytter `logs/mcp-bridge.log` til `logs/archive/mcp-bridge-YYYYMMDD-HHmmss.log`. Gamle logger slettes ikke — de arkiveres.

**Anbefaling:** Roter loggen før benchmarks og etter større endringer.

## Next Steps

1. ✅ Kompiler bridge til kjørbar JS.
2. ✅ Dual transport (stdio + HTTP) med `/health`.
3. ✅ TTL-cache, single-flight dedupe og parallell CI.
4. ✅ Fast-path uten npm-overhead for monitor og db_status.
5. ✅ Concurrency control og kompakte responser.
6. ✅ Strukturert JSON-logging med status, tool_mode, verbose, schema_version.
7. ✅ Log rotation til archive.
8. Koble Perplexity Desktop til wrapperen via `config/perplexity-local-mcp.example.json`.
8. Vurder `autoApprove` — skal brukeren bekrefte `kimi_code` manuelt per kall?
9. Utvid allowlist ved behov — alltid eksplisitt, aldri wildcard-shell.
