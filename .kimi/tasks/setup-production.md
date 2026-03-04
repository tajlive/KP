# 🤖 KIMI TASK: Produksjonsoppsett — Secrets + Deploy + Verifisering

> **KIMI Code 2.5** — Kjør dette automatisk med MCP + GitHub CLI.
> Les `.kimi/MASTER_PROMPT.md` før du starter.

---

## FORUTSETNINGER

- [ ] `gh` CLI er installert og autentisert (`gh auth status`)
- [ ] `.env.local` finnes i prosjektrooten med alle nøkler
- [ ] Du kjører fra prosjektrooten `~/klarpakke/`

---

## STEG 1 — Les verdier fra .env.local

```bash
# Verifiser at nødvendige variabler finnes
REQUIRED=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_SECRET_KEY
)

for VAR in "${REQUIRED[@]}"; do
  VAL=$(grep "^${VAR}=" .env.local | cut -d'=' -f2-)
  if [ -z "$VAL" ]; then
    echo "❌ MANGLER: $VAR"
    exit 1
  else
    echo "✅ Funnet: $VAR"
  fi
done
```

---

## STEG 2 — Sett GitHub Secrets automatisk

```bash
REPO="tomarnejensen/klarpakke"

# Les fra .env.local og sett som GitHub Secrets
for VAR in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY \
           NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY STRIPE_SECRET_KEY; do
  VAL=$(grep "^${VAR}=" .env.local | cut -d'=' -f2-)
  echo "$VAL" | gh secret set "$VAR" --repo "$REPO"
  echo "✅ Satt: $VAR"
done

# Sett Copilot MCP secret
SUPABASE_TOKEN=$(grep "^SUPABASE_ACCESS_TOKEN=" .env.local | cut -d'=' -f2-)
if [ -n "$SUPABASE_TOKEN" ]; then
  echo "$SUPABASE_TOKEN" | gh secret set "COPILOT_MCP_SUPABASE_TOKEN" --repo "$REPO"
  echo "✅ Satt: COPILOT_MCP_SUPABASE_TOKEN"
fi
```

---

## STEG 3 — Slett utdaterte secrets

```bash
OBSOLETE=(
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  VERCEL_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN
  BINANCE_API_KEY
  BINANCE_API_SECRET
  HUGGINGFACE_API_KEY
)

for VAR in "${OBSOLETE[@]}"; do
  gh secret delete "$VAR" --repo "$REPO" 2>/dev/null && echo "🗑️  Slettet: $VAR" || echo "⚠️  Fantes ikke: $VAR"
done
```

---

## STEG 4 — Trigger deploy og vent

```bash
echo "🚀 Starter deploy..."
gh workflow run deploy-cloudrun.yml \
  --repo "$REPO" \
  --ref main

echo "⏳ Venter 30 sekunder..."
sleep 30

# Vis status på siste workflow run
gh run list \
  --repo "$REPO" \
  --workflow deploy-cloudrun.yml \
  --limit 1
```

---

## STEG 5 — Vent på ferdig deploy (polling)

```bash
echo "⏳ Poller deploy-status..."
for i in {1..20}; do
  STATUS=$(gh run list \
    --repo "$REPO" \
    --workflow deploy-cloudrun.yml \
    --limit 1 \
    --json status,conclusion \
    --jq '.[0] | "\(.status) / \(.conclusion)"')
  echo "[$i/20] $STATUS"

  if echo "$STATUS" | grep -q "completed / success"; then
    echo "✅ Deploy fullført!"
    break
  elif echo "$STATUS" | grep -q "failure"; then
    echo "❌ Deploy feilet! Sjekk:"
    gh run list --repo "$REPO" --workflow deploy-cloudrun.yml --limit 1 --json url --jq '.[0].url'
    exit 1
  fi
  sleep 30
done
```

---

## STEG 6 — Verifiser produksjon

```bash
BASE_URL="https://www.klarpakke.no"

echo "🔍 Verifiserer produksjon..."

# Health check
HEALTH=$(curl -sf "$BASE_URL/api/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Health check OK: $HEALTH"
else
  echo "❌ Health check feilet!"
  exit 1
fi

# HTTP-status
HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Frontpage HTTP $HTTP_CODE OK"
else
  echo "⚠️ Frontpage returnerte HTTP $HTTP_CODE"
fi

echo ""
echo "🎉 ALT OK! klarpakke.no er i produksjon."
```

---

## KJAPP VERSJON — Alt i én kommando

```bash
bash .kimi/tasks/run-setup.sh
```

---

## FEILHÅNDTERING

| Feil | Løsning |
|------|---------|
| `gh: command not found` | `brew install gh && gh auth login` |
| `.env.local mangler` | Kopier fra `.env.example` og fyll ut |
| `deploy feiler` | Sjekk `gh run view --repo $REPO --log-failed` |
| `health check feiler` | Sjekk Cloud Run revisjoner i GCP Console |
