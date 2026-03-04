# 🔌 Klarpakke API - Multi-Platform Guide

**API Base URL:** `http://localhost:3456`  
**Auth Token:** `klarpakke-dev-token`

---

## 🎯 Plattform-spesifikk oppsett

### 1️⃣ Claude Desktop (MCP - allerede konfigurert)

Claude bruker MCP direkte. Ingen endring nødvendig.

```bash
# Start MCP server (allerede gjort)
cd ~/klarpakke/mcp-server
npx tsx src/index.ts
```

**Bruk i Claude:**
```
"Sjekk git status og commit endringene"
```

---

### 2️⃣ Perplexity Pro (via HTTP API)

Perplexity støtter ikke MCP, men kan bruke HTTP API.

**Steg 1: Start API server**
```bash
cd ~/klarpakke
node api-server.js
```

**Steg 2: I Perplexity, bruk denne prompten:**
```
Du har tilgang til Klarpakke API på http://localhost:3456

Auth header: Authorization: Bearer klarpakke-dev-token

Tilgjengelige kommandoer:
- GET http://localhost:3456/git/status
- POST http://localhost:3456/git/commit (JSON: {"message": "..."})
- POST http://localhost:3456/git/push
- GET http://localhost:3456/file/read?path=src/app/page.tsx
- POST http://localhost:3456/file/write (JSON: {"path": "...", "content": "..."})
- GET http://localhost:3456/build

OPPGAVE: Sjekk git status, les README.md, og gi meg en oppsummering.
```

**Steg 3: Perplexity vil gjøre HTTP-kall og vise resultater**

---

### 3️⃣ Kimi Code 2.5 (via HTTP API)

Kimi Code er CLI-basert og kan bruke `curl` kommandoer.

**Steg 1: Start API server (i egen terminal)**
```bash
cd ~/klarpakke
node api-server.js
```

**Steg 2: I Kimi Code, bruk curl:**
```bash
# Sjekk git status
curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  http://localhost:3456/git/status

# Les en fil
curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  "http://localhost:3456/file/read?path=README.md"

# Commit endringer
curl -s -X POST -H "Authorization: Bearer klarpakke-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"message": "fix: auth callback"}' \
  http://localhost:3456/git/commit

# Build prosjektet
curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  http://localhost:3456/build
```

---

## 📋 API Endpoints

| Endpoint | Method | Beskrivelse |
|----------|--------|-------------|
| `/health` | GET | Sjekk at server kjører |
| `/git/status` | GET | Se git status |
| `/git/commit` | POST | Commit med melding |
| `/git/push` | POST | Push til GitHub |
| `/file/read` | GET | Les fil (param: path) |
| `/file/write` | POST | Skriv til fil |
| `/build` | GET | Kjør npm run build |
| `/supabase/migration/list` | GET | List migrasjoner |

---

## 🔐 Auth Header

Alle kall må inkludere:
```
Authorization: Bearer klarpakke-dev-token
```

---

## 🚀 Eksempel: Komplett workflow i Perplexity

**Du skriver:**
```
Jeg vil fikse en bug i auth callback. 

1. Les src/app/[locale]/auth/callback/route.ts
2. Sjekk hva som kan være galt
3. Fiks det hvis nødvendig
4. Commit med melding "fix: auth callback error handling"
5. Push til GitHub

API: http://localhost:3456
Token: klarpakke-dev-token
```

**Perplexity vil:**
1. Gjøre HTTP GET til `/file/read?path=src/app/[locale]/auth/callback/route.ts`
2. Analysere koden
3. Gjøre HTTP POST til `/file/write` hvis fiks trengs
4. Gjøre HTTP POST til `/git/commit`
5. Gjøre HTTP POST til `/git/push`
6. Gi deg oppsummering

---

## 🔄 Automatisk oppstart

### macOS LaunchAgent (valgfritt)

For å starte API-serveren automatisk:

```bash
# Lag plist-fil
cat > ~/Library/LaunchAgents/com.klarpakke.api.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.klarpakke.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/taj/klarpakke/api-server.js</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/klarpakke-api.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/klarpakke-api.err</string>
</dict>
</plist>
PLIST

# Last inn
launchctl load ~/Library/LaunchAgents/com.klarpakke.api.plist
```

---

## 📞 Support

**Sjekk at server kjører:**
```bash
curl http://localhost:3456/health
```

**Restart server:**
```bash
# Finn prosess
lsof -ti:3456 | xargs kill -9
# Start på nytt
cd ~/klarpakke && node api-server.js
```
