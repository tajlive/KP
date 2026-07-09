# Deploy Decision Guide

## Which method?

### 🔵 I18n/tekst (messages/*.json)
**Method:** Push to main → Workers Builds (~15 min)
**Alternative:** `npm run cf:build && npx wrangler deploy --minify` (~10 min)

### 🟢 Code changes (src/*.ts, src/*.tsx)
**Method:** Push to main → GH Actions `deploy-production.yml` (~10 min)
**Note:** CI builds from scratch in clean environment

### 🟡 Supabase migrations (migrations/*.sql)
**Method:** `psql` direct (30 sec)
```bash
export $(grep "POSTGRES_" .env.local | xargs)
PGPASSWORD=$POSTGRES_PASSWORD psql "$POSTGRES_URL_NON_POOLING" -f <file>
```

### 🔴 Supabase Edge Functions
**Method:** `supabase functions deploy` (30 sec)
```bash
npx supabase functions deploy <name> --project-ref pskhryjzkobytnfwucrb
```

### ⚡ Emergency hotfix
1. Build locally: `rm -rf .open-next && npm run cf:build && npx wrangler deploy --minify`
2. Push to main: `git add -A && git commit -m "hotfix: ..." && git push`

## Cache notes
| Action | .open-next/ status |
|--------|-------------------|
| Push to main (GH Actions) | Built from scratch |
| Local `wrangler deploy` | Uses existing cache |
| `rm -rf .open-next` + build | Fresh cache |
| I18n change only | Requires rebuild |

## Post-deploy verification
```bash
curl -s https://www.klarpakke.no/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'v:{d[\"version\"]}')"
curl -s https://www.klarpakke.no/api/leaderboard?period=weekly | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} entries')"
```
