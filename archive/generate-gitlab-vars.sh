#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Generate GitLab CI Variables (Interactive)
# Outputs JSON that can be imported via GitLab API
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load local env
if [[ -f ".env.local" ]]; then
  source .env.local
else
  echo -e "${RED}✗ .env.local not found${NC}"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   GITLAB CI VARIABLES GENERATOR                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# Collect variables interactively
# ============================================================
declare -A VARS

echo -e "${YELLOW}1. Supabase - Database Connection${NC}"
read -p "  SUPABASE_DB_URL (postgresql://...): " VARS[SUPABASE_DB_URL] || true
echo ""

echo -e "${YELLOW}2. Supabase - API Keys${NC}"
VARS[NEXT_PUBLIC_SUPABASE_URL]="${NEXT_PUBLIC_SUPABASE_URL:-}"
VARS[NEXT_PUBLIC_SUPABASE_ANON_KEY]="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
read -p "  SUPABASE_SERVICE_ROLE_KEY (eyJ...): " VARS[SUPABASE_SERVICE_ROLE_KEY] || true
echo ""

echo -e "${YELLOW}3. Stripe - Payment${NC}"
read -p "  STRIPE_SECRET_KEY (sk_test_...): " VARS[STRIPE_SECRET_KEY] || true
read -p "  STRIPE_WEBHOOK_SECRET (whsec_...): " VARS[STRIPE_WEBHOOK_SECRET] || true
read -p "  NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID (price_...): " VARS[NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID] || true
read -p "  NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID (price_...): " VARS[NEXT_PUBLIC_STRIPE_MASTER_PRICE_ID] || true
read -p "  NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID (price_...): " VARS[NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ID] || true
echo ""

echo -e "${YELLOW}4. Push Notifications (Optional)${NC}"
read -p "  NEXT_PUBLIC_VAPID_PUBLIC_KEY (BJ...): " VARS[NEXT_PUBLIC_VAPID_PUBLIC_KEY] || true
read -p "  VAPID_PRIVATE_KEY (base64): " VARS[VAPID_PRIVATE_KEY] || true
echo ""

# ============================================================
# Generate output
# ============================================================
OUTPUT_FILE=".gitlab-ci.env.json"

echo -e "${BLUE}┌─ Generating ${OUTPUT_FILE}${NC}"

# Start JSON
cat > "$OUTPUT_FILE" << 'EOF'
{
  "variables": [
EOF

# Add variables
FIRST=true
for key in "${!VARS[@]}"; do
  value="${VARS[$key]}"
  if [[ -n "$value" ]]; then
    if [[ "$FIRST" == "true" ]]; then
      FIRST=false
    else
      echo "," >> "$OUTPUT_FILE"
    fi

    # Check if protected
    if [[ "$key" =~ SECRET|PASSWORD|KEY|TOKEN|ROLE ]]; then
      PROTECTED="true"
      MASKED="true"
    else
      PROTECTED="false"
      MASKED="false"
    fi

    cat >> "$OUTPUT_FILE" << VARS_JSON
    {
      "key": "$key",
      "value": "$value",
      "protected": $PROTECTED,
      "masked": $MASKED
    }
VARS_JSON
  fi
done

cat >> "$OUTPUT_FILE" << 'EOF'
  ]
}
EOF

log_ok "Variables saved to $OUTPUT_FILE"
echo ""

# ============================================================
# Show import instructions
# ============================================================
echo -e "${BLUE}┌─ Manual Import to GitLab${NC}"
echo ""
echo "Option A - Via UI (recommended for first setup):"
echo "  1. Go to https://gitlab.com/YOUR_GROUP/klarpakke"
echo "  2. Settings → CI/CD → Variables"
echo "  3. Add each variable below:"
echo ""

for key in "${!VARS[@]}"; do
  value="${VARS[$key]}"
  if [[ -n "$value" ]]; then
    if [[ "$key" =~ SECRET|PASSWORD|KEY|TOKEN ]]; then
      echo "  [$key] = ****"
    else
      echo "  [$key] = ${value:0:50}..."
    fi
  fi
done

echo ""
echo "Option B - Via GitLab API:"
cat << 'CURL_EXAMPLE'
  for var in $(jq -r '.variables[] | @base64' .gitlab-ci.env.json); do
    _jq() {
     echo ${var} | base64 --decode | jq -r ${1}
    }

    curl --request POST \
      --header "PRIVATE-TOKEN: YOUR_GITLAB_TOKEN" \
      "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/variables" \
      --form "key=$(_jq '.key')" \
      --form "value=$(_jq '.value')" \
      --form "protected=$(_jq '.protected')" \
      --form "masked=$(_jq '.masked')"
  done
CURL_EXAMPLE

echo ""
log_ok "Run .gitlab-ci.yml"
echo "  git add .gitlab-ci.yml .gitlab-ci.env.json"
echo "  git commit -m 'ci: automated setup'"
echo "  git push origin main"
echo ""
