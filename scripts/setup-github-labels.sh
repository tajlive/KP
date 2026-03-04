#!/bin/bash

# =============================================================================
# GitHub Labels Setup Script
# =============================================================================
# Usage: ./scripts/setup-github-labels.sh
# Requirements: GitHub CLI (gh) must be installed and authenticated
# =============================================================================

set -e

REPO="klarpakke/klarpakke"

echo "🏷️  Setting up GitHub labels for $REPO"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "   Install: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "   Run: gh auth login"
    exit 1
fi

# Type labels
echo "📋 Creating type labels..."
gh label create "bug" --description "Noe fungerer ikke" --color "d73a4a" --force
gh label create "enhancement" --description "Ny feature" --color "a2eeef" --force
gh label create "documentation" --description "Dokumentasjon" --color "0075ca" --force
gh label create "refactor" --description "Kodeoptimalisering" --color "fbca04" --force

# Priority labels
echo "📊 Creating priority labels..."
gh label create "priority:critical" --description "Må fikses umiddelbart" --color "b60205" --force
gh label create "priority:high" --description "Viktig" --color "ff9f1c" --force
gh label create "priority:medium" --description "Middels prioritet" --color "fbca04" --force
gh label create "priority:low" --description "Lav prioritet" --color "d4c5f9" --force

# Status labels
echo "📌 Creating status labels..."
gh label create "in-progress" --description "Jobbes med nå" --color "0e8a16" --force
gh label create "needs-review" --description "Trenger code review" --color "5319e7" --force
gh label create "needs-triage" --description "Trenger triage" --color "fef2c0" --force
gh label create "blocked" --description "Blokkert av annet" --color "d93f0b" --force

# Component labels
echo "🔧 Creating component labels..."
gh label create "component:ui" --description "UI-relatert" --color "c5def5" --force
gh label create "component:api" --description "API-relatert" --color "1d76db" --force
gh label create "component:database" --description "Database" --color "0e8a16" --force
gh label create "component:ai" --description "AI/ML" --color "5319e7" --force

# Effort labels
echo "⏱️  Creating effort labels..."
gh label create "effort:small" --description "< 1 dag" --color "0e8a16" --force
gh label create "effort:medium" --description "1-3 dager" --color "fbca04" --force
gh label create "effort:large" --description "> 3 dager" --color "d93f0b" --force

# Automation labels
echo "🤖 Creating automation labels..."
gh label create "dependencies" --description "Dependency updates" --color "0366d6" --force
gh label create "automated" --description "Automated PR" --color "ededed" --force

echo ""
echo "✅ All labels configured successfully!"
echo ""
echo "Labels created:"
echo "  Type: bug, enhancement, documentation, refactor"
echo "  Priority: priority:critical, priority:high, priority:medium, priority:low"
echo "  Status: in-progress, needs-review, needs-triage, blocked"
echo "  Component: component:ui, component:api, component:database, component:ai"
echo "  Effort: effort:small, effort:medium, effort:large"
echo "  Automation: dependencies, automated"
