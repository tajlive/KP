#!/usr/bin/env bash
# =============================================================================
# Klarpakke MCP Architect Setup
# Kjør: bash .mcp/mcp-setup.sh
# Setter opp full MCP-tilgang for Perplexity/Claude som hovedarkitekt
# =============================================================================

set -e

BOLD=$(tput bold)
RESET=$(tput sgr0)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
CYAN=$(tput setaf 6)
RED=$(tput setaf 1)

echo ""
echo "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${RESET}"
echo "${BOLD}${CYAN}║   Klarpakke MCP Architect Setup              ║${RESET}"
echo "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ---------------------------------------------------------------------------
# 1. Finn MCP-konfig-fil basert på hvilken klient som er installert
# ---------------------------------------------------------------------------
detect_mcp_client() {
  if command -v cursor &>/dev/null || [ -f "$HOME/.cursor/mcp.json" ]; then
    MCP_FILE="$HOME/.cursor/mcp.json"
    CLIENT="Cursor"
  elif [ -f "$HOME/Library/Application Support/Claude/claude_desktop_config.json" ]; then
    MCP_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    CLIENT="Claude Desktop (Mac)"
  elif [ -f "$APPDATA/Claude/claude_desktop_config.json" ]; then
    MCP_FILE="$APPDATA/Claude/claude_desktop_config.json"
    CLIENT="Claude Desktop (Windows)"
  else
    # Fallback: lag Cursor-config
    mkdir -p "$HOME/.cursor"
    MCP_FILE="$HOME/.cursor/mcp.json"
    CLIENT="Cursor (ny konfig opprettet)"
  fi
  echo "${GREEN}✓ MCP-klient oppdaget: ${CLIENT}${RESET}"
  echo "  Konfig-fil: ${MCP_FILE}"
  echo ""
}

# ---------------------------------------------------------------------------
# 2. Samle inn tokens interaktivt
# ---------------------------------------------------------------------------
collect_tokens() {
  echo "${BOLD}Steg 1/4 — Supabase Access Token${RESET}"
  echo "  ${CYAN}→ Åpne: https://supabase.com/dashboard/account/tokens${RESET}"
  echo "  Klikk 'Generate new token', navn: klarpakke-mcp-architect"
  echo -n "  Lim inn token (sbp_...): "
  read -r SUPABASE_TOKEN
  echo ""

  echo "${BOLD}Steg 2/4 — Vercel Token${RESET}"
  echo "  ${CYAN}→ Åpne: https://vercel.com/account/tokens${RESET}"
  echo "  Klikk 'Create Token', navn: klarpakke-mcp"
  echo -n "  Lim inn token: "
  read -r VERCEL_TOKEN
  echo ""

  echo "${BOLD}Steg 3/4 — Stripe Restricted Key${RESET}"
  echo "  ${CYAN}→ Åpne: https://dashboard.stripe.com/apikeys${RESET}"
  echo "  Klikk 'Create restricted key'"
  echo "  Gi tilgang: Products(R/W), Prices(R/W), Webhooks(R/W), Customers(R)"
  echo "  IKKE gi: Charges, Payouts, Balance"
  echo -n "  Lim inn nøkkel (rk_live_...): "
  read -r STRIPE_KEY
  echo ""

  echo "${BOLD}Steg 4/4 — Sentry Auth Token${RESET}"
  echo "  ${CYAN}→ Åpne: https://sentry.io/settings/account/api/auth-tokens/${RESET}"
  echo "  Scopes: project:read, project:write, org:read, event:read"
  echo -n "  Lim inn token: "
  read -r SENTRY_TOKEN
  echo ""
}

# ---------------------------------------------------------------------------
# 3. Verifiser tokens (enkel sjekk)
# ---------------------------------------------------------------------------
verify_tokens() {
  echo "${BOLD}Verifiserer tokens...${RESET}"

  # Supabase
  if [[ "$SUPABASE_TOKEN" == sbp_* ]]; then
    echo "  ${GREEN}✓ Supabase token format OK${RESET}"
  else
    echo "  ${YELLOW}⚠ Supabase token ser ikke riktig ut (forventet sbp_...)${RESET}"
  fi

  # Vercel
  if [[ ${#VERCEL_TOKEN} -gt 10 ]]; then
    echo "  ${GREEN}✓ Vercel token format OK${RESET}"
  else
    echo "  ${YELLOW}⚠ Vercel token virker for kort${RESET}"
  fi

  # Stripe
  if [[ "$STRIPE_KEY" == rk_live_* ]] || [[ "$STRIPE_KEY" == rk_test_* ]]; then
    echo "  ${GREEN}✓ Stripe restricted key format OK${RESET}"
  else
    echo "  ${YELLOW}⚠ Stripe-nøkkel bør starte med rk_live_ eller rk_test_${RESET}"
  fi

  # Sentry
  if [[ ${#SENTRY_TOKEN} -gt 10 ]]; then
    echo "  ${GREEN}✓ Sentry token format OK${RESET}"
  else
    echo "  ${YELLOW}⚠ Sentry token virker for kort${RESET}"
  fi

  echo ""
}

# ---------------------------------------------------------------------------
# 4. Skriv MCP-konfig
# ---------------------------------------------------------------------------
write_config() {
  echo "${BOLD}Skriver MCP-konfig til ${MCP_FILE}...${RESET}"

  # Les eksisterende konfig eller start med tomt objekt
  if [ -f "$MCP_FILE" ]; then
    EXISTING=$(cat "$MCP_FILE")
  else
    EXISTING='{"mcpServers":{}}'
  fi

  # Bruk Python (tilgjengelig på alle systemer) for å merge JSON
  python3 - <<PYTHON
import json, os, sys

config_file = """$MCP_FILE"""

try:
    with open(config_file, 'r') as f:
        config = json.load(f)
except:
    config = {}

if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Legg til nye MCP-servere
config['mcpServers']['supabase'] = {
    'command': 'npx',
    'args': [
        '-y',
        '@supabase/mcp-server-supabase@latest',
        '--access-token', '$SUPABASE_TOKEN',
        '--project-ref', 'pskhryjzkobytnfwucrb'
    ]
}

config['mcpServers']['vercel'] = {
    'command': 'npx',
    'args': ['-y', '@vercel/mcp-adapter@latest'],
    'env': {'VERCEL_TOKEN': '$VERCEL_TOKEN'}
}

config['mcpServers']['stripe'] = {
    'command': 'npx',
    'args': ['-y', '@stripe/agent-toolkit@latest'],
    'env': {'STRIPE_SECRET_KEY': '$STRIPE_KEY'}
}

config['mcpServers']['sentry'] = {
    'command': 'npx',
    'args': ['-y', '@sentry/mcp-server@latest'],
    'env': {
        'SENTRY_AUTH_TOKEN': '$SENTRY_TOKEN',
        'SENTRY_ORG': 'klarpakke'
    }
}

config['mcpServers']['playwright'] = {
    'command': 'npx',
    'args': ['-y', '@playwright/mcp@latest']
}

os.makedirs(os.path.dirname(config_file), exist_ok=True)
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)

print('  Konfig skrevet OK')
PYTHON

  echo "  ${GREEN}✓ ${MCP_FILE} oppdatert${RESET}"
  echo ""
}

# ---------------------------------------------------------------------------
# 5. Sett opp .env.local med nye verdier (valgfritt)
# ---------------------------------------------------------------------------
check_gitignore() {
  echo "${BOLD}Sjekker sikkerhet...${RESET}"
  GITIGNORE="$(git rev-parse --show-toplevel 2>/dev/null)/.gitignore"

  if grep -q ".env.production" "$GITIGNORE" 2>/dev/null; then
    echo "  ${GREEN}✓ .env.production er i .gitignore${RESET}"
  else
    echo "  ${RED}✗ ADVARSEL: .env.production mangler i .gitignore!${RESET}"
    echo '  Fikser automatisk...'
    echo '.env.production' >> "$GITIGNORE"
    echo "  ${GREEN}✓ Fikset${RESET}"
  fi

  if grep -q ".env.local" "$GITIGNORE" 2>/dev/null; then
    echo "  ${GREEN}✓ .env.local er i .gitignore${RESET}"
  else
    echo '.env.local' >> "$GITIGNORE"
    echo "  ${GREEN}✓ .env.local lagt til .gitignore${RESET}"
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# 6. Ferdig — vis sammendrag
# ---------------------------------------------------------------------------
print_summary() {
  echo "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${RESET}"
  echo "${BOLD}${GREEN}║   Setup fullført! 🚀                          ║${RESET}"
  echo "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${RESET}"
  echo ""
  echo "${BOLD}MCP-servere aktivert:${RESET}"
  echo "  ${GREEN}✓${RESET} Supabase  — DB-migrasjoner, RLS, Edge Functions"
  echo "  ${GREEN}✓${RESET} Vercel    — Deploys, env vars, logs"
  echo "  ${GREEN}✓${RESET} Stripe    — Produkter, priser, webhooks"
  echo "  ${GREEN}✓${RESET} Sentry    — Feil, alerts, releases"
  echo "  ${GREEN}✓${RESET} Playwright — E2E-testing, skjermbilder"
  echo ""
  echo "${BOLD}Neste steg:${RESET}"
  echo "  1. ${YELLOW}Restart ${CLIENT} helt (Cmd+Q / Ctrl+Q)${RESET}"
  echo "  2. Åpne ny samtale"
  echo "  3. Perplexity har nå full arkitekt-tilgang ✅"
  echo ""
  echo "${BOLD}Husk manuelt:${RESET}"
  echo "  • Roter Supabase-nøkler: https://supabase.com/dashboard/project/pskhryjzkobytnfwucrb/settings/api"
  echo "  • Roter Stripe live-nøkler: https://dashboard.stripe.com/apikeys"
  echo ""
}

# ---------------------------------------------------------------------------
# RUN
# ---------------------------------------------------------------------------
detect_mcp_client
collect_tokens
verify_tokens
write_config
check_gitignore
print_summary
