# Perplexity Mac + Klarpakke - Optimalisert Setup

## 1. Forutsetninger

- [x] Perplexity Mac-app installert
- [x] PerplexityXPC installert (`~/Library/Application Support/Perplexity/PerplexityXPC.xpc`)
- [x] Node.js 24.x installert
- [x] Repo klonet til `/Users/taj/klarpakke`

## 2. Aktiver Local MCP

### I Perplexity Mac:
1. **Settings** (⌘,) → **Connectors**
2. **Install MCP Helper** (hvis ikke allerede gjort)
3. **Add Connector** → velg type basert på behov

### Kopier konfigurasjon:
```bash
# Backup eksisterende
cp ~/Library/Application\ Support/Perplexity/mcp.json \
   ~/Library/Application\ Support/Perplexity/mcp.json.backup

# Kopier optimalisert config
cp /Users/taj/klarpakke/.perplexity/mac-mcp-config.json \
   ~/Library/Application\ Support/Perplexity/mcp.json
```

> **Merk:** Custom KIMI MCP-server er fjernet fra config (krasjet OpenCode/Kimi pga. ugyldige MCP-verktøyskjemaer). Perplexity bruker nå kun lokale verktøy-MCP-er: filesystem, GitHub, Supabase, MemPalace, Sanity.

### Aktive servere

#### 1. Filsystem
```json
{
  "description": "Filsystem - Direkte filoperasjoner",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-filesystem-mcp.mjs"]
}
```

#### 2. GitHub
```json
{
  "description": "GitHub - Repo og issues",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-github-mcp.mjs"]
}
```

#### 3. Supabase
```json
{
  "description": "Supabase - DB og Edge Functions",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-official-supabase-mcp.mjs"]
}
```

#### 4. MemPalace
```json
{
  "description": "MemPalace - Prosjektkunnskap",
  "command": "node",
  "args": ["/Users/taj/.kimi/mempalace-server.mjs"],
  "env": {
    "MEMPALACE_ROOT": "/Users/taj/klarpakke",
    "MEMPALACE_CONFIG": "/Users/taj/klarpakke/.mempalace/config.json"
  }
}
```

#### 5. Sanity
```json
{
  "description": "Sanity - CMS read/write",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-sanity-mcp-v2.mjs"]
}
```

## 3. Opprett Klarpakke Space

1. **Ny Space** → Navn: `Klarpakke Arkitektur`
2. **Pin prompt**: Lim inn fra `.perplexity/klarpakke-space-prompt.md`
3. **Aktiver Sources**:
   - ✅ Filsystem (ved fil-operasjoner)
   - ✅ GitHub (ved repo-sjekk)
   - ✅ Supabase (ved DB-operasjoner)
   - ✅ MemPalace (ved prosjektkunnskap)
   - ✅ Sanity (ved CMS-operasjoner)
   - ⭕ Perplexity-search (valgfritt, ved research)

## 4. Standard Arbeidsflyt

### Daglig Start
```
"Gi meg en statusrapport for Klarpakke.
Sjekk: 1) Git status, 2) Siste commits, 3) Er det noen åpne PRs?"
```

### Før kodeendring
```
"Verifiser at npm run type-check og npm run lint passerer i /Users/taj/klarpakke"
```

### Etter kodeendring
```
"Kjør test:unit for å verifisere at endringene ikke brøt noe"
```

### Før deploy
```
"cd /Users/taj/klarpakke && npm run verify && npm run health:prod:gate"
```

## 5. Tasks (Pro-funksjon)

Opprett faste Tasks for:

### Daglig Health Check
```
Klappakke Daily Health
- Sjekk /api/health
- Verifiser DB-tilkobling
- Sjekk siste 24t logs
```

### Nightly Summary
```
Klarpakke Nightly
- Oppsummer commits i dag
- Sjekk åpne issues
- Status på workflows
```

### Pre-Deploy Checklist
```
Klarpakke Pre-Deploy
- npm run lint
- npm run type-check
- npm run test:unit
- npm run build
- Verifiser env-vars
```

## 6. Tips & Triks

### Hurtigkommandoer
| Hva | Kommando |
|-----|----------|
| Les fil | "Les filen src/lib/api.ts" |
| Søk kode | "Søk etter useAuth i koden" |
| Git status | "Kjør git status i /Users/taj/klarpakke" |
| Sjekk build | "Kjør npm run build i /Users/taj/klarpakke" |

### Kontekst-håndtering
- **Space = Langtidshukommelse**: Historikk beholdes
- **Thread = Korttidskontekst**: Spesifikk oppgave
- **New Thread**: Når du bytter fokusområde

### Sources-håndtering
- Skru på kun det du trenger (raskere responstid)
- MemPalace bør nesten alltid være på
- Filsystem/GitHub kun ved relevante operasjoner

## 7. Feilsøking

### MCP feiler
```bash
# Test individuell MCP
cd /Users/taj/klarpakke
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node scripts/run-filesystem-mcp.mjs
```

> **Kjent problem:** Custom KIMI MCP-server er fjernet fra config. Hvis du får krasj ved oppstart, sørg for at `~/Library/Application Support/Perplexity/mcp.json` er kopiert fra `.perplexity/mac-mcp-config.json` og ikke inneholder en `kimi`-server.

## 8. Vedlikehold

- Oppdater MCP-scripts: `git pull` i `/Users/taj/klarpakke`
- Sjekk for nye versjoner: Se `AGENTS.md` for oppdateringer
- Backup config: Kopier `mcp.json` før endringer
