# 🗄️ SQL Auto-Deploy Setup

## Problem: Hvorfor kan ikke AI-en kjøre SQL automatisk?

**Kimi CLI (jeg)** kjører i et isolert miljø uten direkte database-tilgang.

**Claude Desktop** har MCP-tilkobling og kan kjøre SQL via din eksisterende MCP-server.

---

## ✅ LØSNINGER (velg én):

### 🥇 Alternativ 1: Claude Desktop + MCP (Anbefalt for daglig bruk)

**Steg 1: Sjekk at MCP-serveren kjører**
```bash
cd /Users/taj/klarpakke/klarpakke-mcp-server
npm run start
```

**Steg 2: Konfigurer Claude Desktop**
```bash
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "klarpakke": {
      "command": "deno",
      "args": ["run", "--allow-all", "/Users/taj/klarpakke/klarpakke-mcp-server/src/index.ts"],
      "env": {
        "SUPABASE_PROJECT_REF": "vuxbjlykgmzskxbclquf",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "SUPABASE_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
EOF
```

**Steg 3: Bruk i Claude Desktop**
```
"Kjør SQL filen supabase/migrations/20260228_kla34_gamification_levelup.sql"

Claude vil da:
✅ Lese filen
✅ Validere SQL
✅ Kjøre mot databasen
✅ Bekrefte suksess
```

---

### 🥈 Alternativ 2: GitHub Actions (Anbefalt for CI/CD)

**Allerede satt opp!** Se `.github/workflows/supabase-migrations.yml`

**For å aktivere:**
1. Gå til GitHub repo → Settings → Secrets and variables
2. Legg til:
   - `SUPABASE_ACCESS_TOKEN` (fra https://supabase.com/dashboard/account/tokens)
   - `SUPABASE_PROJECT_REF` = `vuxbjlykgmzskxbclquf`
   - `SUPABASE_DB_PASSWORD` (fra database settings)

**Da vil SQL kjøre automatisk ved push til main!**

---

### 🥉 Alternativ 3: PSQL Script (Raskeste nå)

**Installer PostgreSQL client:**
```bash
# macOS
brew install libpq
brew link libpq --force

# Ubuntu/Debian
sudo apt-get install postgresql-client
```

**Kjør SQL:**
```bash
# Sett miljøvariabler
export SUPABASE_DB_PASSWORD="your-db-password"
export SUPABASE_PROJECT_REF="vuxbjlykgmzskxbclquf"

# Kjør alle migrasjoner
./scripts/deploy-sql-direct.sh

# ELLER: Kjør spesifikk fil
./scripts/deploy-sql-direct.sh supabase/migrations/20260228_kla34_gamification_levelup.sql
```

---

### Alternativ 4: Supabase Dashboard (Manuelt)

1. Gå til https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/sql
2. Kopier inn SQL fra filen
3. Klikk "Run"

---

## 🔐 Hvor finner du credentials?

| Variabel | Hvor finner du? |
|----------|-----------------|
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → Connection string |

---

## 🤖 Hva er MCP?

**MCP (Model Context Protocol)** er en standard for å gi AI-verktøy tilgang til eksterne systemer.

- Din MCP-server: `klarpakke-mcp-server/`
- Har allerede: SQL execution, database tools, deployment tools
- Fungerer med: Claude Desktop, Claude Code, andre MCP-kompatible klienter

**Kimi CLI støtter IKKE MCP ennå** - derfor må du velge en av løsningene ovenfor.

---

## 💡 Anbefalt workflow fremover

### For utvikling (lokalt):
```bash
# Bruk PSQL scriptet
./scripts/deploy-sql-direct.sh supabase/migrations/your-file.sql
```

### For produksjon (automatisert):
```bash
# Push til GitHub → Auto-deploy via Actions
git add supabase/migrations/new-file.sql
git commit -m "feat: new migration"
git push origin main
# ✅ SQL kjøres automatisk!
```

### For komplekse operasjoner:
```bash
# Bruk Claude Desktop med MCP
# Få AI-hjelp med SQL-validering og feilsøking
```

---

## ✅ Hva er nå satt opp?

| Komponent | Status | Fil |
|-----------|--------|-----|
| GitHub Actions workflow | ✅ Klar | `.github/workflows/supabase-migrations.yml` |
| PSQL deploy script | ✅ Klar | `scripts/deploy-sql-direct.sh` |
| MCP server | ✅ Eksisterer | `klarpakke-mcp-server/` |

---

**Neste steg:** Velg alternativ 1, 2 eller 3 og følg instruksjonene!
