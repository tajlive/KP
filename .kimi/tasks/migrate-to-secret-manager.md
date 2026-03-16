# 🤖 KIMI TASK: Migrer secrets til Google Secret Manager

> Kjør dette automatisk med shell + gcloud CLI.
> Les `.kimi/MASTER_PROMPT.md` før du starter.

---

## ARKITEKTUR ETTER MIGRERING

```
GitHub Secrets (kun build-tid)     GCP Secret Manager (runtime)
───────────────────────────   ───────────────────────────
NEXT_PUBLIC_SUPABASE_URL           STRIPE_SECRET_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY      SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY SUPABASE_DB_PASSWORD
GCP_SA_KEY (for deploy auth)       RESEND_API_KEY
```

> NEXT_PUBLIC_* MÅ være i GitHub — de bakes inn i JS-bundelen under bygg.

---

## STEG 1 — Sett prosjekt og finn service account

```bash
PROJECT_ID="klarpakke-universitet"
REGION="us-central1"
SERVICE="klarpakke"

gcloud config set project $PROJECT_ID

# Finn Cloud Run sin service account
SA=$(gcloud run services describe $SERVICE \
  --region=$REGION \
  --format='value(spec.template.spec.serviceAccountName)')

# Fallback til default compute SA
if [ -z "$SA" ]; then
  PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
  SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi

echo "✅ Service Account: $SA"
```

---

## STEG 2 — Aktiver Secret Manager API

```bash
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
echo "✅ Secret Manager API aktivert"
```

---

## STEG 3 — Opprett secrets fra .env.local

```bash
RUNTIME_SECRETS=(
  STRIPE_SECRET_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_DB_PASSWORD
  RESEND_API_KEY
)

for SECRET in "${RUNTIME_SECRETS[@]}"; do
  VALUE=$(grep "^${SECRET}=" .env.local | cut -d'=' -f2-)

  if [ -z "$VALUE" ]; then
    echo "⚠️  Hopper over $SECRET (ikke i .env.local)"
    continue
  fi

  # Opprett eller oppdater secret
  if gcloud secrets describe "$SECRET" --project=$PROJECT_ID &>/dev/null; then
    echo -n "$VALUE" | gcloud secrets versions add "$SECRET" \
      --data-file=- --project=$PROJECT_ID
    echo "🔄 Oppdatert: $SECRET"
  else
    echo -n "$VALUE" | gcloud secrets create "$SECRET" \
      --data-file=- \
      --replication-policy=automatic \
      --project=$PROJECT_ID
    echo "✅ Opprettet: $SECRET"
  fi

  # Gi Cloud Run SA tilgang
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID
  echo "🔐 IAM satt for $SECRET → $SA"
done
```

---

## STEG 4 — Oppdater Cloud Run til å bruke Secret Manager

```bash
gcloud run services update $SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --update-secrets=\
STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,\
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,\
RESEND_API_KEY=RESEND_API_KEY:latest

echo "✅ Cloud Run oppdatert med Secret Manager-referanser"
```

---

## STEG 5 — Slett runtime-secrets fra GitHub (holder kun build-vars)

```bash
REPO="tajlive/KP"

GH_REMOVE=(
  STRIPE_SECRET_KEY
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_DB_PASSWORD
  RESEND_API_KEY
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  VERCEL_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN
  BINANCE_API_KEY
  BINANCE_API_SECRET
  HUGGINGFACE_API_KEY
)

for VAR in "${GH_REMOVE[@]}"; do
  gh secret delete "$VAR" --repo "$REPO" 2>/dev/null \
    && echo "🗑️  Slettet fra GitHub: $VAR" \
    || echo "⚠️  Fantes ikke: $VAR"
done
```

---

## STEG 6 — Sørg for at GitHub kun har build-vars

```bash
REPO="tajlive/KP"

BUILD_SECRETS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  GCP_SA_KEY
)

for VAR in "${BUILD_SECRETS[@]}"; do
  VAL=$(grep "^${VAR}=" .env.local | cut -d'=' -f2-)
  if [ -n "$VAL" ]; then
    echo "$VAL" | gh secret set "$VAR" --repo "$REPO"
    echo "✅ GitHub Secret satt: $VAR"
  fi
done
```

---

## STEG 7 — Trigger deploy + verifiser

```bash
gh workflow run deploy-cloudrun.yml --repo "$REPO" --ref main
echo "⏳ Deploy startet. Sjekk: https://github.com/tajlive/KP/actions"

sleep 30
for i in {1..20}; do
  STATUS=$(gh run list --repo "$REPO" --workflow deploy-cloudrun.yml \
    --limit 1 --json status,conclusion --jq '.[0] | "\(.status)/\(.conclusion)"')
  echo "[$i/20] $STATUS"
  echo "$STATUS" | grep -q "completed/success" && break
  echo "$STATUS" | grep -q "failure" && exit 1
  sleep 30
done

curl -sf https://www.klarpakke.no/api/health | grep '"status":"ok"' \
  && echo "🎉 FERDIG — klarpakke.no kjører med GCP Secret Manager!"
```

---

## RESULTERENDE STRUKTUR

```
gcloud secrets list --project=klarpakke-universitet
┌──────────────────────────────┬────────────────
│ NAME                          │ CREATED         │
├──────────────────────────────┼────────────────│
│ STRIPE_SECRET_KEY             │ i dag           │
│ SUPABASE_SERVICE_ROLE_KEY     │ i dag           │
│ SUPABASE_DB_PASSWORD          │ i dag           │
│ RESEND_API_KEY                │ i dag           │
└──────────────────────────────┴────────────────┘
```
