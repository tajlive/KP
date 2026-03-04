# 📋 Linear Auto-Setup Guide

## 🚀 Hurtigstart (Ett-klikk)

```bash
bash scripts/setup-linear-auto.sh
```

Dette scriptet vil:
1. ✅ Sjekke/installere Linear CLI
2. ✅ Finne eller be om API-nøkkel
3. ✅ Teste tilkobling
4. ✅ Hente teams og issues
5. ✅ Oppdatere MCP config
6. ✅ Lagre nøkkel i .env.local

---

## 🔧 Manuelle Alternativer

### Alternativ 1: Auto-detection
```bash
bash scripts/linear-detect-key.sh
```

Søker automatisk etter API-nøkkel i:
- Miljøvariabler
- .env.local
- .env.mcp.local
- Shell config (~/.zshrc, ~/.bashrc)

### Alternativ 2: Test Tilkobling
```bash
bash scripts/linear-test.sh
```

Tester:
- API-tilkobling
- Teams tilgang
- Issues tilgang
- CLI installasjon

### Alternativ 3: Manuell Setup

**Steg 1:** Gå til https://linear.app/settings/api

**Steg 2:** Klikk "New API key"

**Steg 3:** Lim inn i .env.local:
```bash
echo 'LINEAR_API_KEY="lin_api_din_nøkkel"' >> .env.local
```

**Steg 4:** Test:
```bash
source .env.local
bash scripts/linear-test.sh
```

---

## 🎯 Verifisering

Etter setup, verifiser at alt fungerer:

```bash
# Test CLI
lin me

# Test MCP (i Kimi/Cursor)
@linear list_issues

# Test API
curl /api/linear/me
```

---

## 🔥 Hvis Noe Går Galt

### "API-nøkkel ikke funnet"
```bash
# Kjør auto-setup
bash scripts/setup-linear-auto.sh

# Eller sett manuelt:
export LINEAR_API_KEY="lin_api_xxx"
```

### "Tilkobling feilet"
```bash
# Sjekk at nøkkelen er riktig
bash scripts/linear-detect-key.sh

# Test API direkte:
curl -s https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -d '{"query":"{ viewer { name } }"}'
```

### "MCP fungerer ikke"
1. Sjekk at LINEAR_API_KEY er satt
2. Restart Kimi/Cursor
3. Sjekk MCP config: `cat .cursor/mcp.json`

---

## 📦 Hva som Settes Opp

| Komponent | Funksjon |
|-----------|----------|
| `scripts/setup-linear-auto.sh` | Full auto-setup |
| `scripts/linear-test.sh` | Test-tilkobling |
| `scripts/linear-detect-key.sh` | Finn API-nøkkel |
| `scripts/mcp-linear-tools.sh` | CLI-verktøy |
| `.cursor/mcp.json` | Cursor MCP config |
| `.kimi/mcp_config.json` | Kimi MCP config |
| `src/app/api/linear/*` | REST API endepunkter |

---

## 🎉 Ferdig!

Etter setup kan du:
- Bruke `@linear` kommandoer i Kimi/Cursor
- Kalle `/api/linear/*` endepunkter
- Bruke `lin` kommando i terminal
- Se Linear data automatisk i dashboard

