#!/bin/bash
# Setup GitHub Secrets for Cloudflare Workers Deploy
# Usage: ./scripts/setup-github-secrets.sh <GITHUB_PAT>
#
# Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID to be set in the environment.

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <GITHUB_PAT>"
  echo ""
  echo "Get your PAT from: https://github.com/settings/tokens"
  echo "Required scopes: repo, workflow"
  exit 1
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set"
  exit 1
fi

if [ -z "${CLOUDFLARE_ZONE_ID:-}" ]; then
  echo "❌ CLOUDFLARE_ZONE_ID is not set"
  exit 1
fi

GITHUB_TOKEN="$1"
OWNER="tajlive"
REPO="KP"

echo "🔐 Setting up GitHub Secrets for Cloudflare Workers..."
echo ""

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI not found"
  echo ""
  echo "Install it:"
  echo "  brew install gh"
  echo "  gh auth login"
  exit 1
fi

if ! gh auth status &> /dev/null; then
  echo "❌ Not logged in. Run: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI found"

echo "Setting CLOUDFLARE_API_TOKEN..."
echo "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R "$OWNER/$REPO"

echo "Setting CLOUDFLARE_ZONE_ID..."
echo "$CLOUDFLARE_ZONE_ID" | gh secret set CLOUDFLARE_ZONE_ID -R "$OWNER/$REPO"

echo ""
echo "✅ All secrets set successfully!"
echo ""
echo "Verify at: https://github.com/$OWNER/$REPO/settings/secrets/actions"
