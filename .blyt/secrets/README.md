# Blyt Secret Registry — README (KLA-276)

## Hva dette er

Referanse-lag for ALLE secrets i Blyt-prosjekter. **Ingen verdier her** —
kun `secret://prosjekt/miljø/tjeneste/nøkkel`-referanser + hvor verdien bor.

## Hvordan agenter bruker secrets (v4.1 §5)

- **Oppslag:** `node scripts/blyt/secret-resolve.mjs secret://…` (hvor + hvordan)
- **Eksistenssjekk:** `… --check` (kun env.local-stores, exit-kode)
- **Audit:** `node scripts/blyt/secret-audit.mjs` / `--json` (CI) — aldri verdier
- **Bruk:** les fra riktig store (wrangler/bws/gh/~/.hermes/.env/.env.local) — aldri
  fra git/kode/markdown/chat/prompts

## Stores

| Store           | Hva                               | Hvem leser                                 |
| --------------- | --------------------------------- | ------------------------------------------ |
| `wrangler`      | Cloudflare Workers secrets        | prod-runtime                               |
| `bws`           | Bitwarden Secrets (BWS CLI)       | agenter, OKX                               |
| `gh`            | GitHub Actions secrets            | CI                                         |
| `hermes-dotenv` | `~/.hermes/.env` (chmod 600)      | Hermes (load_hermes_dotenv → `${env:VAR}`) |
| `env.local`     | repoets `.env.local` (gitignoret) | lokale scripts/dev                         |

## Hermes-config og secrets (KLA-276 Fase 4)

`~/.hermes/config.yaml` skal IKKE inneholde verdier. Bruk `${env:VAR}`-referanser:

```yaml
mcp_servers:
  github:
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: "${env:GITHUB_PERSONAL_ACCESS_TOKEN}" }
  supabase:
    headers: { Authorization: "Bearer ${env:SUPABASE_MCP_PAT}" }
```

Verdiene ligger i `~/.hermes/.env`. Migrert 2026-08-12; backup:
`~/.hermes/config.yaml.bak-kla276-*`. Smoke: `hermes mcp test github|supabase`.

## Hvem godkjenner endringer (v4.1 §5/§6)

- Ny secret i registry: agent (dokumentert i audit-log)
- Flytting av verdi mellom stores: agent ved verifisert smoke (backup først)
- **Rotasjon/produksjonssecret-endring: KUN Tom**
