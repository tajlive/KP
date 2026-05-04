# Perplexity Desktop + Kimi CLI Integrasjon

Dette dokumentet beskriver hvordan du gir **Perplexity Desktop** direkte tilgang til **Kimi Code CLI** via MCP (Model Context Protocol).

## Hva er dette?

Med denne integrasjonen kan du fra Perplexity Desktop:
- Be Kimi analysere kodebasen
- Be Kimi skrive eller redigere filer
- Få Kimi til å kjøre tester
- Bruke alle Kimi-verktøy (Shell, ReadFile, WriteFile, etc.) direkte fra Perplexity

## Arkitektur

```
Perplexity Desktop
       │
       │ MCP (stdio)
       ▼
run-kimi-mcp-simple.mjs  ←  Denne filen starter MCP-serveren
       │
       │ Kaller
       ▼
   Kimi CLI  ←  Utfører faktisk arbeid
```

## Rask setup (ett kommando)

```bash
cd /Users/taj/klarpakke
node scripts/setup-perplexity-kimi.mjs
```

Scriptet vil:
1. Sjekke at Kimi er installert
2. Finne Perplexity Desktop konfigurasjonsmappe
3. Oppdatere `mcp.json` med Kimi MCP-server
4. Vise instruksjoner for neste steg

## Manuelt setup

### 1. Finn Perplexity config-fil

**Mac:**
```bash
~/Library/Application Support/Perplexity/mcp.json
```

**Windows:**
```
%APPDATA%\Perplexity\mcp.json
```

**Linux:**
```bash
~/.config/Perplexity/mcp.json
```

### 2. Lag eller rediger `mcp.json`

```json
{
  "mcpServers": {
    "kimi": {
      "description": "Kimi CLI - direkte tilgang til Kimi Code CLI",
      "command": "node",
      "args": ["/Users/taj/klarpakke/scripts/run-kimi-mcp-simple.mjs"]
    }
  }
}
```

### 3. Restart Perplexity Desktop

- Lukk Perplexity helt (Cmd+Q / Alt+F4)
- Åpne på nytt
- Verifiser at MCP vises i Settings → Integrations

## Tilgjengelige verktøy

| Verktøy | Beskrivelse | Eksempel |
|---------|-------------|----------|
| `kimi_ask` | Generelle spørsmål | "Forklar hva denne kodebasen gjør" |
| `kimi_code` | Skrive/redigere kode | "Lag en ny komponent som..." |
| `kimi_search` | Søk i kodebasen | "Finn alle bruk av useAuth" |
| `kimi_read_file` | Les spesifikk fil | "Les src/lib/api.ts" |
| `kimi_run_tests` | Kjør tester | "Kjør unit-tester" |

## Bruk i Perplexity

Etter oppsett kan du spørre Perplexity om å bruke Kimi:

> "Bruk kimi_ask til å spørre: Hvordan er prosjektstrukturen i dette repoet?"

> "Bruk kimi_code til å lage en React-komponent som viser en handleliste"

> "Bruk kimi_search til å finne alle steder vi bruker Supabase"

> "Bruk kimi_read_file til å lese README.md og oppsummere"

## Feilsøking

### "Kimi not found"
```bash
# Installer Kimi CLI
uv tool install kimi-cli
# eller
pip install kimi-cli
```

### Perplexity finner ikke MCP-serveren
1. Sjekk at stien til `run-kimi-mcp-simple.mjs` er korrekt (absolutt sti)
2. Sjekk at filen er kjørbar: `chmod +x scripts/run-kimi-mcp-simple.mjs`
3. Restart Perplexity Desktop

### MCP-server vises men ingenting skjer
1. Sjekk Perplexity Console/Logs (hvis tilgjengelig)
2. Kjør manuelt for debugging:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | node scripts/run-kimi-mcp-simple.mjs
   ```

### Langsom respons
Dette er normalt - Kimi CLI kan ta 10-30 sekunder på komplekse oppgaver. Perplexity vil vise "thinking..." mens den venter.

## Sikkerhet

- MCP-serveren kjører med samme rettigheter som din bruker
- Kimi CLI respekterer prosjektets `.gitignore`
- `--yolo` flagget er automatisk aktivert for kode-verktøyet
- Ingen API-nøkler sendes til Perplexity - alt skjer lokalt

## Avansert konfigurasjon

### Begrens tilgang
For å begrense hvilke verktøy som er tilgjengelige, rediger `run-kimi-mcp-simple.mjs`:

```javascript
// Fjern verktøy du ikke vil skal være tilgjengelige
const tools = [
  // { name: "kimi_code", ... },  // ← Kommenter ut for å deaktivere
  { name: "kimi_ask", ... },      // ← Bare spørsmål tillatt
];
```

### Flere prosjekter
Du kan legge til flere Kimi-instaner for ulike prosjekter:

```json
{
  "mcpServers": {
    "kimi-klarpakke": {
      "command": "node",
      "args": ["/Users/taj/klarpakke/scripts/run-kimi-mcp-simple.mjs"]
    },
    "kimi-annet-prosjekt": {
      "command": "node", 
      "args": ["/Users/taj/annet-prosjekt/scripts/run-kimi-mcp-simple.mjs"]
    }
  }
}
```

## Utvikling

For å teste MCP-serveren manuelt:

```bash
# Start serveren
cd /Users/taj/klarpakke
node scripts/run-kimi-mcp-simple.mjs

# I en annen terminal, send en test-forespørsel:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node scripts/run-kimi-mcp-simple.mjs
```

## Se også

- [MCP Specification](https://modelcontextprotocol.io/)
- [Kimi CLI Dokumentasjon](https://github.com/moonshot-ai/Kimi-cli)
- [Perplexity Desktop](https://www.perplexity.ai/download)
