# Secret Audit — 2026-08-12 (KLA-276 Fase 1)

## Dato

2026-08-12

## Metode

- Scanner: `scripts/arch/secret-audit.mjs` (10 mønstre: lin*api*, lin*vis*, ghp/gho/ghu/ghs/ghr,
  sk-, hch-(at|rt)-, Bearer, sbp\_, PRIVATE KEY, AKIA, xox) — read-only, aldri verdier.
- Kilder: repo (7639 filer), ~/.hermes/config.yaml (--config), GitHub/Cloudflare
  secrets (navn-nivå), .env-filer (nøkkelnavn-nivå).

## Funn

| Lokasjon                             | Type                                           | Risiko | Handling                                                                                                                                              |
| ------------------------------------ | ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~/.hermes/config.yaml:435            | GitHub OAuth-token (gho\_)                     | høy    | ✅ MIGRERT → ~/.hermes/.env (`GITHUB_PERSONAL_ACCESS_TOKEN`), config bruker `${env:GITHUB_PERSONAL_ACCESS_TOKEN}`. Smoke: `hermes mcp test github` ✅ |
| ~/.hermes/config.yaml:501            | Supabase PAT (sbp\_) i MCP-header              | høy    | ✅ MIGRERT → ~/.hermes/.env (`SUPABASE_MCP_PAT`), header `Bearer ${env:SUPABASE_MCP_PAT}`. Smoke: `hermes mcp test supabase` ✅                       |
| .env-templates/.env.local.example:74 | PEM-plassholder (79 tegn, ikke ekte nøkkel)    | lav    | ✅ Erstattet med inert plassholder-tekst                                                                                                              |
| .env.local.bak-20260809-000306       | Plaintext-backup (82 nøkler: sk-, sbp\_ m.fl.) | medium | ✅ SLETTET — alle levende nøkler finnes i .env.local (kun 6 døde Binance-nøkler manglet)                                                              |
| .env.mcp.local:28                    | Supabase PAT (lokal MCP-env, gitignoret)       | lav    | Notert — lovlig lokal store                                                                                                                           |
| .env.local                           | 98 nøkler, gitignoret lovlig store             | medium | Beholdes (designert store)                                                                                                                            |

## Resultat etter cleanup

`node scripts/security/secret-audit.mjs --check` → **{"status":"clean","files_scanned":7639,"findings":0}**

## Backup

`~/.hermes/config.yaml.bak-kla276-1786558665419` (før Fase 4-migrering).

## Ikke endret (krever Tom-godkjenning)

- Ingen rotasjon av produksjonstokens utført.
- GitHub Actions secrets / Cloudflare secrets: kun navnenivå verifisert — ingen endringer.
