# Perplexity Desktop + Kimi CLI (OPTIMIZED v3)

> **🚀 MAJOR UPGRADE**: Denne versjonen har **21+ verktøy** med progressive complexity, direkte filoperasjoner, og batch-støtte.

## Hva er nytt i v3?

### ⚡ Direkte operasjoner (raske!)
- **kimi_read** - Les filer direkte uten Kimi-kall (instant)
- **kimi_list** - List mapper rekursivt (instant)
- **kimi_grep** - Søk i kodebase med ripgrep (raskt)
- **kimi_git** - Git-operasjoner (status, diff, commit, push)
- **kimi_project** - Prosjekt-informasjon (deps, scripts, config)
- **kimi_shell** - Direkte shell-kommandoer

### 🧠 Progressive Complexity (som Perplexity sin egen MCP!)
- **kimi_small** - ⚡ Rask (< 1 min): Fakta-sjekk, enkle spørsmål
- **kimi_medium** - 🔧 Standard (1-3 min): Kode-review, debugging
- **kimi_large** - 🧠 Deep (3-10 min): Arkitektur, komplekse oppgaver

### 💻 Forbedrede kode-verktøy
- **kimi_code** - Skriv/rediger kode med complexity-valg
- **kimi_refactor** - Refaktorer med spesifikt mål
- **kimi_explain** - Forklar med detail-nivå (brief/normal/detailed)

### 📦 Batch-operasjoner
- **kimi_batch** - Kjør flere verktøy i én kommando (mer effektivt!)

---

## Rask setup

```bash
cd /Users/taj/klarpakke
node scripts/setup-perplexity-kimi-optimized.mjs
```

Restart Perplexity Desktop etterpå.

---

## Verktøy-oversikt

| Kategori | Verktøy | Beskrivelse | Hastighet |
|----------|---------|-------------|-----------|
| **Progressive** | `kimi_small` | Enkle spørsmål | ⚡ < 1 min |
| | `kimi_medium` | Standard kode-arbeid | 🔧 1-3 min |
| | `kimi_large` | Komplekse oppgaver | 🧠 3-10 min |
| **Filer** | `kimi_read` | Les fil direkte | ⚡ Instant |
| | `kimi_list` | List mappe | ⚡ Instant |
| | `kimi_grep` | Søk i kode | ⚡ < 1 sek |
| **Kode** | `kimi_code` | Skriv/rediger kode | 🔧 Varierer |
| | `kimi_refactor` | Refaktorer kode | 🔧 Varierer |
| | `kimi_explain` | Forklar kode | 🔧 Varierer |
| **Git** | `kimi_git` | Git-operasjoner | ⚡ Instant |
| **Prosjekt** | `kimi_project` | Info om prosjekt | ⚡ Instant |
| **Shell** | `kimi_shell` | Kjør kommando | ⚡ Instant |
| **Testing** | `kimi_test` | Kjør tester | 🔧 1-5 min |
| | `kimi_ci` | CI-pipeline | 🔧 2-10 min |
| **Deploy** | `kimi_deploy` | Deploy til Vercel | 🔧 1-3 min |
| **Database** | `kimi_db` | DB-operasjoner | 🔧 1-5 min |
| **Monitor** | `kimi_monitor` | Health checks | 🔧 1-3 min |
| **Avansert** | `kimi_batch` | Flere operasjoner | 🔧 Varierer |
| | `kimi_help` | Hjelp | ⚡ Instant |

---

## Brukseksempler

### ⚡ Raske operasjoner (direkte)

**Les en fil:**
```
Bruk kimi_read med path="README.md"
```

**List filer rekursivt:**
```
Bruk kimi_list med path="src" og recursive=true
```

**Søk i kode:**
```
Bruk kimi_grep med pattern="useAuth" og glob="*.tsx"
```

**Git status:**
```
Bruk kimi_git med command="status"
```

**Prosjekt-info:**
```
Bruk kimi_project med info="summary"
```

### 🧠 Progressive complexity

**Rask spørring:**
```
Bruk kimi_small: Hva er hovedspråket i prosjektet?
```

**Standard kode-arbeid:**
```
Bruk kimi_medium med prompt="Analyser src/lib/auth.ts og forklar flyten"
```

**Kompleks oppgave:**
```
Bruk kimi_large med prompt="Refaktorer hele auth-systemet til å bruke server components" og context="Next.js 15 app, må støtte SSR"
```

### 💻 Kode-operasjoner

**Skriv kode:**
```
Bruk kimi_code med instruction="Lag en React-komponent for brukerprofil" og filePath="src/components/UserProfile.tsx"
```

**Refaktorer:**
```
Bruk kimi_refactor med filePath="src/lib/api.ts" og goal="Reduser duplisering og forbedre feilhåndtering"
```

**Forklar:**
```
Bruk kimi_explain med target="src/lib/trading/executor.ts" og detail="detailed"
```

### 📦 Batch-operasjoner

**Kjør flere operasjoner samtidig:**
```
Bruk kimi_batch med operations=[
  {"tool": "kimi_git", "args": {"command": "status"}},
  {"tool": "kimi_project", "args": {"info": "deps"}},
  {"tool": "kimi_read", "args": {"path": "package.json", "limit": 50}}
]
```

---

## Avansert bruk

### Paginering av store filer

```
Bruk kimi_read med path="src/large-file.ts", offset=0, limit=100
```

### Git med commit

```
Bruk kimi_git med command="commit", message="Fix auth bug", args="-a"
```

### Shell med timeout

```
Bruk kimi_shell med command="npm run build", timeout=120000
```

### Test med coverage

```
Bruk kimi_test med type="unit", coverage=true
```

### Database på staging

```
Bruk kimi_db med action="status", environment="staging"
```

---

## Beste praksis

### 1. Velg riktig complexity-nivå
- **kimi_small** for fakta, raske spørsmål, enkle forklaringer
- **kimi_medium** for kode-review, debugging, refaktoring
- **kimi_large** for arkitektur, store endringer, kompleks analyse

### 2. Bruk direkte operasjoner for hastighet
- `kimi_read` i stedet for `kimi_ask` når du vet filstien
- `kimi_list` for å utforske struktur
- `kimi_grep` for å finne mønstre

### 3. Deploy-konfigurasjon (Vercel)
- `npm run deploy` → Vercel production (rettet fra gcloud)
- `npm run deploy:preview` → Vercel preview
- `npm run deploy:prod` → Vercel production (med --yes)

### 4. Git-integrasjon
- Sjekk status før endringer: `kimi_git status`
- Commit med mening: `kimi_git commit`
- Se historikk: `kimi_git log`

---

## Feilsøking

### "Kimi not found"
```bash
uv tool install kimi-cli
# eller
pip install kimi-cli
```

### "Command not found" for ripgrep
```bash
brew install ripgrep  # Mac
apt-get install ripgrep  # Linux
```

### Timeout på lange operasjoner
- Bruk `kimi_large` for komplekse oppgaver (lengre timeout)
- Del opp i mindre `kimi_batch`-operasjoner

### Perplexity finner ikke MCP
1. Sjekk at stien er korrekt: `scripts/run-kimi-mcp-optimized.mjs`
2. Restart Perplexity helt (Cmd+Q)
3. Sjekk at mcp.json er gyldig JSON

---

## Migrering fra v2

Gammel config fungerer fortsatt, men for å få nye verktøy:

```bash
# Kjør nytt setup
node scripts/setup-perplexity-kimi-optimized.mjs

# Restart Perplexity
# Nye verktøy er nå tilgjengelige!
```

**Breaking changes:**
- `kimi_ask` → `kimi_small` / `kimi_medium` / `kimi_large`
- `kimi_search` → `kimi_grep` (mye raskere)

---

## Ytelse

| Operasjon | v2 (gammel) | v3 (OPTIMIZED) | Forbedring |
|-----------|-------------|----------------|------------|
| Lese fil | 5-10s | < 10ms | **500-1000x** |
| Liste mapper | 10-20s | < 100ms | **100-200x** |
| Søk i kode | 15-30s | < 1s | **15-30x** |
| Git status | 5-10s | < 100ms | **50-100x** |
| Enkel spørring | 10-30s | 5-15s | **2x** |

---

## Ressurser

- [MCP Specification](https://modelcontextprotocol.io/)
- [Kimi CLI](https://github.com/moonshot-ai/Kimi-cli)
- [Perplexity Desktop](https://www.perplexity.ai/download)
- [MCP Best Practices 2026](https://www.cdata.com/blog/proven-mcp-performance-optimization-techniques)

---

**Versjon:** 3.0.0  
**Sist oppdatert:** 2026-04-05  
**Kompatibel med:** Perplexity Desktop 2.0+, Kimi CLI 1.30+
