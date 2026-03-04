#!/bin/bash
# Setup GitHub Secrets for Vercel Deploy
# Usage: ./scripts/setup-github-secrets.sh <GITHUB_PAT>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <GITHUB_PAT>"
  echo ""
  echo "Get your PAT from: https://github.com/settings/tokens"
  echo "Required scopes: repo, workflow"
  exit 1
fi

GITHUB_TOKEN="$1"
OWNER="tomarnejensen"
REPO="klarpakke"

echo "🔐 Setting up GitHub Secrets for Vercel..."
echo ""

# Function to set a secret
set_secret() {
  local name="$1"
  local value="$2"
  
  echo "Setting $name..."
  
  # Get public key for encryption
  response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/$OWNER/$REPO/actions/secrets/public-key")
  
  key_id=$(echo "$response" | grep -o '"key_id": "[^"]*"' | cut -d'"' -f4)
  key=$(echo "$response" | grep -o '"key": "[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$key_id" ] || [ -z "$key" ]; then
    echo "❌ Failed to get public key. Check your token permissions."
    exit 1
  fi
  
  # Note: In production, we'd encrypt the value with libsodium
  # For now, we'll use the GitHub CLI if available
  
  if command -v gh &> /dev/null; then
    echo "$value" | gh secret set "$name" -R "$OWNER/$REPO" 
    echo "✅ $name set via GitHub CLI"
  else
    echo "⚠️  GitHub CLI not found. Install it:"
    echo "   brew install gh"
    echo "   gh auth login"
    echo ""
    echo "Then run:"
    echo "   echo '$value' | gh secret set $name -R $OWNER/$REPO"
  fi
}

# Alternative: Use gh CLI directly if available
if command -v gh &> /dev/null; then
  echo "✅ GitHub CLI found"
  
  # Check if logged in
  if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in. Run: gh auth login"
    exit 1
  fi
  
  echo "Setting VERCEL_ORG_ID..."
  echo "team_JH76folkKg0SaSV9OtANlQ6L" | gh secret set VERCEL_ORG_ID -R "$OWNER/$REPO"
  
  echo "Setting VERCEL_PROJECT_ID..."
  echo "prj_TIvFmpMttYsHLC4eFkxxCEoILLEY" | gh secret set VERCEL_PROJECT_ID -R "$OWNER/$REPO"
  
  echo ""
  echo "✅ All secrets set successfully!"
  echo ""
  echo "Verify at: https://github.com/$OWNER/$REPO/settings/secrets/actions"
  
else
  echo "❌ GitHub CLI not found"
  echo ""
  echo "Install it:"
  echo "  brew install gh"
  echo "  gh auth login"
  echo ""
  echo "Then run this script again."
  echo ""
  echo "Or set secrets manually:"
  echo "1. Go to: https://github.com/$OWNER/$REPO/settings/secrets/actions"
  echo "2. Click 'New repository secret'"
  echo "3. Add:"
  echo "   Name: VERCEL_ORG_ID"
  echo "   Value: team_JH76folkKg0SaSV9OtANlQ6L"
  echo "4. Add:"
  echo "   Name: VERCEL_PROJECT_ID"
  echo "   Value: prj_TIvFmpMttYsHLC4eFkxxCEoILLEY"
fi
