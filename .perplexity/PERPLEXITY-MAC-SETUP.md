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

### Eller legg til manuelt:

#### 1. KIMI (Essensiell)
```json
{
  "description": "KIMI CLI v3 - Hovedorkestrator",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-kimi-mcp-optimized.mjs"]
}
```

#### 2. Filsystem
```json
{
  "description": "Filsystem - Direkte filoperasjoner",
  "command": "node", 
  "args": ["/Users/taj/klarpakke/scripts/run-filesystem-mcp.mjs"]
}
```

#### 3. GitHub
```json
{
  "description": "GitHub - Repo og issues",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-github-mcp.mjs"]
}
```

#### 4. Supabase
```json
{
  "description": "Supabase - DB og Edge Functions",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-official-supabase-mcp.mjs"]
}
```

#### 5. Vercel
```json
{
  "description": "Vercel - Deployments",
  "command": "node",
  "args": ["/Users/taj/klarpakke/scripts/run-vercel-mcp.mjs"]
}
```

## 3. Opprett Klarpakke Space

1. **Ny Space** → Navn: `Klarpakke Arkitektur`
2. **Pin prompt**: Lim inn fra `.perplexity/klarpakke-space-prompt.md`
3. **Aktiver Sources**:
   - ✅ KIMI (alltid på)
   - ✅ Filsystem (ved fil-operasjoner)
   - ✅ GitHub (ved repo-sjekk)
   - ✅ Supabase (ved DB-operasjoner)
   - ✅ Vercel (ved deploy-sjekk)

## 4. Standard Arbeidsflyt

### Daglig Start
```
"Bruk kimi_medium: Gi meg en statusrapport for Klarpakke. 
Sjekk: 1) Git status, 2) Siste commits, 3) Er det noen åpne PRs?"
```

### Før kodeendring
```
"Bruk kimi_small: Verifiser at npm run type-check og npm run lint 
passerer i /Users/taj/klarpakke"
```

### Etter kodeendring
```
"Bruk kimi_test: Kjør test:unit for å verifisere at endringene ikke 
brøt noe"
```

### Før deploy
```
"Bruk kimi_shell: cd /Users/taj/klarpakke && npm run verify && npm run health:prod:gate"
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
| Les fil | "Bruk kimi_read med path=src/lib/api.ts" |
| Søk kode | "Bruk kimi_grep med pattern=useAuth" |
| Git status | "Bruk kimi_git med command=status" |
| Sjekk build | "Bruk kimi_shell: npm run build" |

### Kontekst-håndtering
- **Space = Langtidshukommelse**: Historikk beholdes
- **Thread = Korttidskontekst**: Spesifikk oppgave
- **New Thread**: Når du bytter fokusområde

### Sources-håndtering
- Skru på kun det du trenger (raskere responstid)
- KIMI bør nesten alltid være på
- Filsystem/GitHub kun ved relevante operasjoner

## 7. Feilsøking

### MCP feiler
```bash
# Test individuell MCP
cd /Users/taj/klarpakke
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  node scripts/run-kimi-mcp-optimized.mjs
```

### PerplexityXPC issues
```bash
# Restart helper
killall PerplexityXPC 2>/dev/null
# Deretter restart Perplexity Mac-app
```

### Node ikke funnet
```bash
# Sørg for at node er i PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
```

## 8. Vedlikehold

- Oppdater MCP-scripts: `git pull` i `/Users/taj/klarpakke`
- Sjekk for nye versjoner: Se `AGENTS.md` for oppdateringer
- Backup config: Kopier `mcp.json` før endringer
