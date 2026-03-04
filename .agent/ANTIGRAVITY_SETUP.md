# Antigravity (Gemini CLI) MCP Setup

> **Masterpromt:** Les alltid `.kimi/MASTER_PROMPT.md` før du starter arbeid på dette prosjektet.

## Installasjon

```bash
# Kopier MCP-config til Gemini Antigravity
mkdir -p ~/.gemini/antigravity
cp .agent/mcp_config.json ~/.gemini/antigravity/mcp_config.json
```

Rediger `~/.gemini/antigravity/mcp_config.json` og bytt ut:
- `YOUR_CONTEXT7_API_KEY` → din Context7 API-nøkkel
- `YOUR_SUPABASE_ACCESS_TOKEN` → din Supabase access token
- `YOUR_GITHUB_PAT` → ditt GitHub Personal Access Token

## AI-verktøy og konfig

| Verktøy | Konfigurasjonsfil |
|---------|------------------|
| **KIMI** | `.kimi/MASTER_PROMPT.md` |
| **Claude** | `CLAUDE.md` → redirect til `.kimi/MASTER_PROMPT.md` |
| **Perplexity Pro** | Space-innstillinger peker til `github.com/tomarnejensen/klarpakke` |
| **Antigravity (Gemini)** | `~/.gemini/antigravity/mcp_config.json` (fra `.agent/mcp_config.json`) |
| **GitHub Copilot** | `.github/copilot-instructions.md` → redirect |
