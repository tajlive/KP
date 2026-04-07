# KIMI CLI Wrapper - Integrasjonsrettelse

## Problem
Tidligere MCP-integrasjon sendte beskrivende norsk tekst som CLI-kommandoer, som ga feilen:
```
No such command 'DB-operasjon: npm run db:status...'
```

## Løsning
Korrekt mapping av MCP-operasjoner til eksplisitte CLI-kommandoer uten beskrivende tekst.

## Filer Opprettet/Endret

### 1. `scripts/kimi-cli-wrapper.ts` (NY)
Hovedwrapper med:
- **Eksplisitt kommando-mapping**: `kimi_db status` → `npm run db:status`
- **Input-validering**: Fail-fast før exec
- **Strukturert output**: Per-steg resultater
- **Miljø-støtte**: `CI=true` og custom env vars

**Mapping-tabell:**
| MCP-verktøy | Action | CLI-kommando |
|-------------|--------|--------------|
| `kimi_db` | `status` | `npm run db:status` |
| `kimi_db` | `push` | `npm run db:push` |
| `kimi_db` | `gen-types` | `npm run db:gen-types` |
| `kimi_db` | `migrate` | `npm run db:migrate` |
| `kimi_db` | `lint` | `npm run db:lint` |
| `kimi_ci` | (default) | `npm run ci` |
| `kimi_ci` | `quick` | `npm run ci:quick` |
| `kimi_monitor` | `full` | `npm run health:full` |
| `kimi_monitor` | `prod` | `npm run verify:prod` |
| `kimi_monitor` | `api` | `npm run health:api` |
| `kimi_monitor` | `supabase` | `npm run supabase:health` |
| `kimi_monitor` | `signals` | `npm run signals:health` |
| `kimi_monitor` | `trading` | `npm run trading:health` |

### 2. `scripts/run-kimi-mcp.mjs` (ENDRET)
Oppdatert MCP-server som:
- Bruker wrapper-funksjoner (ikke `callKimi` med tekst)
- Validerer kommandoer før eksekvering
- Returnerer strukturerte resultater

### 3. `scripts/kimi-cli-wrapper.test.ts` (NY)
**26 tester** som verifiserer:
- Kommando-mapping korrekthet
- Input-validering
- Strukturert output
- Fail-fast oppførsel
- Timeout-håndtering
- Miljø-variabler

### 4. `vitest.scripts.config.ts` (NY)
Separat Vitest-konfigurasjon for Node.js scripts (ikke jsdom).

### 5. `package.json` (ENDRET)
La til script: `npm run test:scripts`

## Bruk

### Kjøre tester
```bash
# Kjør alle script-tester
npm run test:scripts

# Kjør med verbose output
npx vitest run --config vitest.scripts.config.ts --reporter=verbose
```

### CLI-bruk (wrapper direkte)
```bash
# Hjelp
node scripts/kimi-cli-wrapper.ts --help

# List tilgjengelige kommandoer
node scripts/kimi-cli-wrapper.ts --list

# Eksekver spesifikk kommando
node scripts/kimi-cli-wrapper.ts db status
```

### MCP-bruk (via Perplexity/Cursor)
```json
{
  "tool": "kimi_db",
  "args": { "action": "status" }
}
```

## Krav oppfylt
- ✅ Map hver MCP-operasjon til eksplisitt CLI-task/command
- ✅ Ikke send beskrivende norsk tekst som kommando
- ✅ Input-validering før exec
- ✅ Returner strukturert output per steg
- ✅ Fail-fast med tydelig feil ved manglende kommando
- ✅ Støtte for local environment
- ✅ Tester som verifiserer riktige kommandoer
- ✅ Unit test kjørt og passerer (26/26)

## Testresultater
```
✓ 26 passed (26)
✓ validateCommand (8 tests)
✓ Command Mapping (6 tests)
✓ Structured Output (3 tests)
✓ Fail-Fast Behavior (3 tests)
✓ Environment Support (2 tests)
✓ Helper Functions (3 tests)
✓ Timeout Handling (1 test)
```
