# 🚀 Klarpakke Prompts - Quick Start

## Hvordan bruke promptsene

### 🔷 Claude Desktop

**Steg 1:** Kopier innholdet fra `claude.txt`

**Steg 2:** I Claude Desktop, start ny chat og lim inn:
```
[Innhold fra claude.txt]

Oppgave: Sjekk git status og gi meg en oppsummering.
```

**Steg 3:** Claude vil nå:
- Vise 🔧 verktøy-ikonet
- Bruke MCP-verktøy automatisk
- Sjekke git status
- Gi deg oppsummering

---

### 🔶 Kimi Code

**Steg 1:** Start API-server (hvis ikke allerede kjørende)
```bash
cd ~/klarpakke && node api-server.js
```

**Steg 2:** Kopier innholdet fra `kimi.txt`

**Steg 3:** I Kimi Code:
```bash
# Lim inn prompten først, deretter oppgaven
cat /Users/taj/klarpakke/.prompts/kimi.txt

# Deretter:
"Sjekk git status og les README.md"
```

**Steg 4:** Kimi vil:
- Bruke curl-kommandoer
- Vise deg output
- Fortsette med neste steg

---

### 🟣 Perplexity Pro

**Steg 1:** Sørg for at API-server kjører
```bash
cd ~/klarpakke && node api-server.js
```

**Steg 2:** Kopier innholdet fra `perplexity.txt`

**Steg 3:** I Perplexity, lim inn:
```
[Innhold fra perplexity.txt]

Gjør følgende:
1. Sjekk git status via API
2. Les filen README.md
3. Gi meg en oppsummering
```

**Steg 4:** Perplexity vil:
- Gjøre HTTP-kall
- Vise deg resultater
- Forklare hva den fant

---

## 📋 Sammenligning

| Oppgave | Claude | Kimi | Perplexity |
|---------|--------|------|------------|
| **Git status** | Automatisk | curl | HTTP GET |
| **Lese fil** | Automatisk | curl | HTTP GET |
| **Commit** | Automatisk | curl | HTTP POST |
| **Build** | Automatisk | curl | HTTP GET |
| **Smarthet** | 🟢 Høy | 🟡 Medium | 🟡 Medium |
| **Kontekst** | 🟢 Husket | 🔴 Ny hver gang | 🔴 Ny hver gang |

---

## 💡 Anbefaling

### Bruk Claude Desktop for:
- Daglig utvikling
- Komplekse endringer
- Debugging
- Automatiserte workflows

### Bruk Kimi for:
- Raske fil-sjekker
- Når du vil se kommandoene eksplisitt
- Scripting/automatisering

### Bruk Perplexity for:
- Analyse av kode
- Forklaringer
- Research
- Når du vil forstå "hvorfor"

---

## 🔧 Tips

### Claude Desktop
- MCP fungerer bare i desktop-appen (ikke web)
- Sørg for at `mcp-server` kjører
- Hvis 🔧 ikke vises: restart Claude

### Kimi Code
- API-server må være startet
- Bruk `jq` for å parse JSON: `curl ... | jq -r '.status'`
- Lag alias for enklere bruk

### Perplexity Pro
- Mest manuell av de tre
- Godt for å forstå kode, ikke for å gjøre endringer
- Kan gjøre parallelle HTTP-kall

---

## 🆘 Troubleshooting

### "Tool not found" i Claude
```bash
# Restart MCP-server
cd ~/klarpakke/mcp-server
npx tsx src/index.ts

# Restart Claude Desktop
```

### "Connection refused" i Kimi/Perplexity
```bash
# Start API-server
cd ~/klarpakke
node api-server.js

# Verifiser
curl http://localhost:3456/health
```

### "Unauthorized" i alle
- Sjekk at token er riktig: `klarpakke-dev-token`
- Header format: `Authorization: Bearer klarpakke-dev-token`

---

## 📝 Eksempel: Full workflow

### Scenario: Fiks en bug i auth

**CLAUDE:**
```
[claude.txt prompt]

Det er en bug i auth callback - brukere får ikke logget inn. 
Finn og fiks feilen, test at det fungerer, og deploy.
```

**KIMI:**
```
[kimi.txt prompt]

1. Sjekk git status
2. Søk etter auth/callback kode
3. Les filen som håndterer callback
4. Identifiser bug
5. Fiks den
6. Kjør build
7. Commit og push
```

**PERPLEXITY:**
```
[perplexity.txt prompt]

Analyser auth-flyten i Klarpakke:
1. Les src/app/[locale]/auth/callback/route.ts
2. Sjekk hvordan session håndteres
3. Identifiser potensielle bugs
4. Foreslå fikser
```

---

## ✅ Oppsummering

| Fil | Bruk til | Plattform |
|-----|----------|-----------|
| `master.md` | Komplett referanse | Alle |
| `claude.txt` | Kopier inn i Claude | Claude Desktop |
| `kimi.txt` | Kopier inn i Kimi | Kimi Code CLI |
| `perplexity.txt` | Kopier inn i Perplexity | Perplexity Pro |

Velg riktig prompt for din plattform, og følg arbeidsflyten!
