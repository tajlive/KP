# Opik MCP Setup for Klarpakke

[Opik](https://www.comet.com/site/) fra Comet ML er en LLM observability-plattform som gir deg innsikt i AI-applikasjoner gjennom traces, metrics og evaluering.

## Hva er Opik MCP?

Opik MCP-serveren lar deg:
- **Trace management**: Se og analysere LLM-kall
- **Prompt management**: Organiser og versjoner prompts
- **Metrics**: Overvåk ytelse og kostnader
- **Projects/Workspaces**: Organiser etter team/applikasjon

## Oppsett

### 1. Skaff Opik API-nøkkel

1. Gå til https://www.comet.com/site/
2. Lag konto eller logg inn
3. Naviger til API-keys/Settings
4. Kopier nøkkelen

### 2. Legg til i `.env.local`

```bash
OPIK_API_KEY="din-opik-api-key-her"
```

### 3. MCP-konfigurasjon

Opik er allerede konfigurert i `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "opik": {
      "description": "Opik MCP - LLM observability, traces, metrics",
      "command": "node",
      "args": ["scripts/run-opik-mcp.mjs"]
    }
  }
}
```

## Tilgjengelige verktøy

| Verktøy | Beskrivelse |
|---------|-------------|
| `opik_list_projects` | List alle prosjekter |
| `opik_create_project` | Opprett nytt prosjekt |
| `opik_list_prompts` | List alle prompts |
| `opik_create_prompt` | Opprett ny prompt |
| `opik_get_trace` | Hent spesifikk trace |
| `opik_list_traces` | List traces med filtre |
| `opik_get_metrics` | Hent metrics for prosjekt |

## Bruk i Kimi CLI

Når Opik er konfigurert:

```
> Analyser traces fra siste time i Klarpakke-prosjektet
> Hent metrics for token-bruk denne uken
> List alle prompts i trading-modulen
```

## Alternativ: Lokal installasjon

Hvis npx ikke fungerer:

```bash
npm install -g @comet-ml/opik-mcp
opik-mcp login
```

## Ressurser

- [Opik Documentation](https://www.comet.com/docs/opik/)
- [Opik MCP GitHub](https://github.com/comet-ml/opik-mcp)
- [Comet ML](https://www.comet.com/site/)
