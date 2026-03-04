# 🔐 MCP Autentisering - Komplett Guide for Alle Platformer

> **Full kontroll over Supabase og Vercel uten OAuth-prompts**
> 
> Støtter: **Cursor** ⭐ | **Kimi CLI** | **Claude Desktop** | **Perplexity Pro**

---

## 📋 Hva er konfigurert

| Platform | Status | Auto Token Loading | Fil |
|----------|--------|-------------------|-----|
| **Cursor** | ✅ Klar | ✅ Ja | `.cursor/mcp-authenticated.json` |
| **Kimi CLI** | ✅ Klar | ✅ Ja (via wrapper) | `.kimi/mcp_config.json` |
| **Claude Desktop** | ✅ Klar | ✅ Ja (via wrapper) | `.claude/claude_desktop_config.json` |
| **Perplexity Pro** | ⚠️ Begrenset | ⚠️ Desktop har ikke MCP ennå | `.perplexity/mcp_config.json` |

---

## 🚀 Hurtigstart (Velg din platform)

### ⭐ Alternativ A: Cursor (Anbefalt!)

```bash
# 1. Generer tokens (hvis ikke gjort)
# Vercel:  https://vercel.com/account/tokens
# Supabase: https://supabase.com/dashboard/account/tokens

# 2. Lagre tokens
echo "VERCEL_TOKEN=din-token" >> .env.mcp.local
echo "SUPABASE_ACCESS_TOKEN=sbp_din-token" >> .env.mcp.local

# 3. Aktiver
./scripts/mcp-with-auth.sh cursor

# 4. Start Cursor - ferdig!
```

### Alternativ B: Kimi CLI

```bash
# 1. Lagre tokens (som over)

# 2. Bruk wrapper script
./scripts/mcp-kimi-wrapper.sh

# ELLER lag alias i ~/.zshrc:
alias kimi='~/klarpakke/scripts/mcp-kimi-wrapper.sh'

# 3. Start Kimi med MCP
kimi
```

### Alternativ C: Claude Desktop

```bash
# 1. Lagre tokens (som over)

# 2. Start med wrapper
./scripts/mcp-claude-wrapper.sh

# Dette kopierer config og starter Claude Desktop automatisk
```

### Alternativ D: Perplexity Pro

```bash
# Perplexity Desktop har IKKE MCP støtte ennå
# Se seksjonen "Perplexity Pro Alternativer" nedenfor
```

---

## 🔧 Detaljert Oppsett per Platform

### ⭐ Cursor (Anbefalt)

**Fordeler:**
- Beste MCP støtte
- Innebygd UI for tools
- Rask respons

**Oppsett:**
```bash
# Konfigurasjonen kopieres automatisk
./scripts/mcp-with-auth.sh cursor

# Manuelt (hvis script feiler):
cp .cursor/mcp-authenticated.json .cursor/mcp.json
```

**Verifiser:**
1. Åpne Cursor
2. Settings → Cursor Settings → Tools & MCP
3. Du skal se:
   - `klarpakke-local` (170+ tools)
   - `supabase-secure` (SQL, logs, Edge Functions)
   - `vercel-secure` (deploy, logs, env vars)

---

### Kimi CLI

**Fordeler:**
- Raskt terminal-basert
- God for automatisering
- Lett å integrere i scripts

**Oppsett:**

**Metode 1: Wrapper script (anbefalt)**
```bash
# Kjør direkte
./scripts/mcp-kimi-wrapper.sh

# Eller lag permanent alias
echo 'alias kimi-mcp="~/klarpakke/scripts/mcp-kimi-wrapper.sh"' >> ~/.zshrc
source ~/.zshrc

# Bruk
kimi-mcp
```

**Metode 2: Manuelt**
```bash
# Last tokens
source ~/klarpakke/.env.mcp.local

# Sett config path
export KIMI_MCP_CONFIG=~/klarpakke/.kimi/mcp_config.json

# Start Kimi
kimi
```

**Config fil:** `.kimi/mcp_config.json`

---

### Claude Desktop

**Fordeler:**
- Naturlig språkforståelse
- Lange kontekst-vinduer
- God for komplekse oppgaver

**Oppsett:**

**Metode 1: Wrapper script (anbefalt)**
```bash
./scripts/mcp-claude-wrapper.sh
```

Dette:
1. Laster tokens fra `.env.mcp.local`
2. Kopierer config til `~/Library/Application Support/Claude/`
3. Starter Claude Desktop

**Metode 2: Manuelt**
```bash
# Last tokens
source ~/klarpakke/.env.mcp.local

# Kopier config
mkdir -p ~/Library/Application\ Support/Claude
cp ~/klarpakke/.claude/claude_desktop_config.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Start Claude Desktop
open /Applications/Claude.app
```

**Config fil:** `~/Library/Application Support/Claude/claude_desktop_config.json`

---

### Perplexity Pro

**⚠️ Viktig:** Perplexity Desktop har **IKKE** native MCP støtte ennå (februar 2026).

**Alternativer:**

#### Alternativ 1: Perplexity API + MCP (Anbefalt)
```bash
# Bruk Perplexity API i din egen app
# Kombiner med MCP for full kontroll

export PERPLEXITY_API_KEY="pplx-din-api-key"
```

#### Alternativ 2: Claude + Perplexity
```bash
# Bruk Claude Desktop med MCP
./scripts/mcp-claude-wrapper.sh

# I Claude, spør:
# "Bruk Perplexity for å researche X, deretter kjør SQL i Supabase"
```

#### Alternativ 3: Kimi + Perplexity
```bash
# Start Kimi med MCP
./scripts/mcp-kimi-wrapper.sh

# Integrer Perplexity API som et MCP tool
```

**Status:** MCP config forberedt i `.perplexity/mcp_config.json` for når støtte kommer.

---

## 📁 Filstruktur

```
klarpakke/
├── .env.mcp                         # Template (ikke sensitiv)
├── .env.mcp.local                   # DINE TOKENS (gitignored!) ⭐
│
├── .cursor/
│   ├── mcp.json                     # Aktiv config (kopieres hit)
│   └── mcp-authenticated.json       # Config med auth headers
│
├── .kimi/
│   └── mcp_config.json              # Kimi CLI config
│
├── .claude/
│   └── claude_desktop_config.json   # Claude Desktop config
│
├── .perplexity/
│   └── mcp_config.json              # Perplexity config (klar for fremtiden)
│
└── scripts/
    ├── setup-mcp-auth.sh            # Setup wizard
    ├── mcp-with-auth.sh             # Aktivering (Cursor)
    ├── mcp-kimi-wrapper.sh          # Kimi wrapper
    ├── mcp-claude-wrapper.sh        # Claude wrapper
    └── mcp-perplexity-wrapper.sh    # Perplexity wrapper
```

---

## 🧪 Testing etter Oppsett

### Supabase

```
"List alle tabeller i databasen"
"Kjør: SELECT * FROM trading_sessions WHERE status = 'active'"
"Hent siste Postgres logs"
"Deploy Edge Function process-copy-trades"
```

### Vercel

```
"Deploy til production"
"Hent siste deploy logs"
"List alle miljøvariabler"
"Søk i Vercel docs om edge functions"
```

### Kombinert

```
"Kjør SQL migrasjon og deploy til Vercel etterpå"
"Sjekk database status og hent deploy logs"
"Hent errors fra både Supabase og Vercel"
```

---

## 🔄 Auto Token Loading - Hvordan det fungerer

### Cursor
- Bruker `${VAR}` syntax i JSON
- Cursor erstatter automatisk med miljøvariabler
- **Ingen wrapper nødvendig**

### Kimi CLI
- JSON støtter ikke `${VAR}` syntax
- **Wrapper script** laster tokens før start
- Script: `mcp-kimi-wrapper.sh`

### Claude Desktop
- JSON støtter ikke `${VAR}` syntax  
- **Wrapper script** laster tokens før start
- Kopierer også config til riktig sted
- Script: `mcp-claude-wrapper.sh`

### Perplexity
- Venter på native MCP støtte
- Config forberedt for fremtiden

---

## 🛠️ Avansert: Alias i Shell

Legg til i `~/.zshrc` eller `~/.bashrc`:

```bash
# MCP Autentisering for Klarpakke
export KLARPAKKE_ROOT="$HOME/klarpakke"

# Last tokens automatisk ved shell start
if [ -f "$KLARPAKKE_ROOT/.env.mcp.local" ]; then
  source "$KLARPAKKE_ROOT/.env.mcp.local"
fi

# Aliaser
alias kkp='cd $KLARPAKKE_ROOT'
alias kimi-mcp='$KLARPAKKE_ROOT/scripts/mcp-kimi-wrapper.sh'
alias claude-mcp='$KLARPAKKE_ROOT/scripts/mcp-claude-wrapper.sh'
alias cursor-mcp='$KLARPAKKE_ROOT/scripts/mcp-with-auth.sh cursor'
```

---

## 🐛 Feilsøking per Platform

### Cursor: "Authentication failed"

```bash
# Sjekk at tokens er satt
source .env.mcp.local
echo $VERCEL_TOKEN
echo $SUPABASE_ACCESS_TOKEN

# Sjekk config
cat .cursor/mcp.json | grep -E "(vercel|supabase)"

# Restart Cursor
# Cmd+Shift+P → "Developer: Reload Window"
```

### Kimi CLI: "Cannot connect to MCP"

```bash
# Bruk wrapper script
./scripts/mcp-kimi-wrapper.sh

# Sjekk at KIMI_MCP_CONFIG er satt
echo $KIMI_MCP_CONFIG

# Skal vise: /Users/taj/klarpakke/.kimi/mcp_config.json
```

### Claude Desktop: "MCP server not found"

```bash
# Sjekk config sted
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Bruk wrapper
./scripts/mcp-claude-wrapper.sh

# Restart Claude Desktop helt (Cmd+Q, deretter åpne på nytt)
```

### Alle platformer: "Token not set"

```bash
# Sjekk at .env.mcp.local finnes
ls -la .env.mcp.local

# Sjekk innhold
grep -v "your_" .env.mcp.local

# Hvis tom, kjør setup
./scripts/setup-mcp-auth.sh
```

---

## 📊 Sammenligning av Platformer

| Feature | Cursor | Kimi CLI | Claude | Perplexity |
|---------|--------|----------|--------|------------|
| MCP Support | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ⭐⭐⭐ Excellent | ❌ None yet |
| Auto Token Loading | ✅ Native | ✅ Wrapper | ✅ Wrapper | N/A |
| Hurtighet | ⭐⭐⭐ Rask | ⭐⭐⭐ Rask | ⭐⭐ God | ⭐⭐⭐ Rask |
| Best for | Utvikling | Automatisering | Komplekse oppgaver | Research |
| UI | 🖥️ GUI | 💻 Terminal | 🖥️ GUI | 🖥️ GUI |
| Pris | Gratis/Pro | Gratis | Gratis/Pro | Pro |

---

## 🔒 Sikkerhet

### Viktige regler

1. **Aldri commit `.env.mcp.local`** - Den er i `.gitignore`
2. **Begrens token-scope** - Kun nødvendige rettigheter
3. **Roter tokens** - Hver 3. måned
4. **Slett gamle tokens** - Fra Vercel/Supabase dashboards

### Token-oppbevaring

```bash
# Sjekk at .env.mcp.local er gitignored
grep "env.mcp.local" .gitignore

# Backup (kryptert)
gpg -c .env.mcp.local
```

---

## 📚 Ressurser

- [Cursor MCP Docs](https://cursor.sh/docs/mcp)
- [Kimi CLI Docs](https://docs.kimi.io/cli)
- [Claude MCP Docs](https://docs.anthropic.com/claude/docs/model-context-protocol-mcp)
- [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [Vercel MCP](https://vercel.com/docs/agent-resources/vercel-mcp)

---

**Sist oppdatert:** 2026-02-24  
**Versjon:** 2.0.0 (Multi-platform)
