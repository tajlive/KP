#!/bin/bash
# Setup Claude Desktop MCP configuration for Klarpakke

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "============================================================================="
echo "🔗 KLARPAKKE MCP - Claude Desktop Setup"
echo "============================================================================="

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CONFIG_DIR="$HOME/.config/Claude"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

echo "📁 Config directory: $CONFIG_DIR"
echo "📄 Config file: $CONFIG_FILE"

# Create directory if needed
mkdir -p "$CONFIG_DIR"

# Load environment variables
if [ -f "$REPO_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$REPO_ROOT/.env.local" | xargs)
fi

# Create/update config
MCP_CONFIG=$(cat <<EOJSON
{
  "mcpServers": {
    "klarpakke": {
      "command": "npx",
      "args": ["tsx", "$REPO_ROOT/mcp-server/src/index.ts"],
      "env": {
        "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY:-}",
        "LINKEDIN_ACCESS_TOKEN": "${LINKEDIN_ACCESS_TOKEN:-}",
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL:-}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_ROLE_KEY:-}"
      }
    }
  }
}
EOJSON
)

if [ -f "$CONFIG_FILE" ]; then
    echo "⚠️  Config file exists. Creating backup..."
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d%H%M%S)"
fi

echo "$MCP_CONFIG" > "$CONFIG_FILE"
echo "✅ Claude Desktop config updated!"

echo ""
echo "============================================================================="
echo "📋 Available Tools:"
echo "============================================================================="
echo "💳 Stripe:"
echo "   - stripe_list_products, stripe_create_product"
echo "   - stripe_list_prices, stripe_create_price"
echo "   - stripe_list_webhook_endpoints"
echo ""
echo "🔗 LinkedIn:"
echo "   - linkedin_get_profile, linkedin_get_network_stats"
echo "   - linkedin_create_post, linkedin_get_post_analytics"
echo "   - linkedin_search_people, linkedin_send_connection_request"
echo "   - linkedin_generate_content_ideas, linkedin_schedule_content_calendar"
echo ""
echo "🛠️  Utilities:"
echo "   - git_status, git_commit, git_push"
echo "   - read_file, list_files"
echo ""
echo "⚡ Restart Claude Desktop to apply changes"
echo "============================================================================="
