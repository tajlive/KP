# MCP-tilgang i worktrees

## Hvor ligger MCP-tilgang?

| Plassering | Fil / miljø |
|------------|-------------|
| **Hovedrepo** | `/Users/taj/klarpakke/.env.mcp.local` (finnes) |
| **Cursor MCP-config** | `.cursor/mcp.json` bruker `"${SUPABASE_ACCESS_TOKEN}"` og andre env-variabler |
| **Lasting av tokens** | `source .env.mcp.local` eller start Cursor fra terminal der du har kjørt det |

## Worktree (f.eks. jyv)

Git ignorerer `.env.mcp.local`, så **nye worktrees får ikke filen automatisk**.

For at Supabase MCP (og andre) skal fungere fra denne mappen:

```bash
# Fra worktree-rot (jyv)
cp /Users/taj/klarpakke/.env.mcp.local .env.mcp.local
```

Deretter: start Cursor fra en terminal hvor du har kjørt `source .env.mcp.local` (eller `source .cursor/worktrees/klarpakke/jyv/.env.mcp.local`), **eller** sørg for at Cursor får miljøvariablene (f.eks. via Cursor Settings → MCP → env for serverne).

## Verifisere at token er lastet

```bash
# I terminal (etter source .env.mcp.local)
echo ${SUPABASE_ACCESS_TOKEN:0:10}...
# Skal vise noe som sbp_xxxxx...

# Eller kjør MCP-status
./scripts/mcp-status.sh
```

## ensure-mcp-env.sh

Kjør fra worktree-rot for å kopiere `.env.mcp.local` fra hovedrepo hvis den mangler:

```bash
./scripts/ensure-mcp-env.sh
```

## Referanser

- `scripts/mcp-with-auth.sh` – laster `.env.mcp.local` og aktiverer Cursor MCP-config
- `scripts/setup-mcp-auth.sh` – oppretter `.env.mcp.local` fra template
- `.env.mcp` – template (uten hemmelige verdier)
