#!/bin/bash
# scripts/modernize-linear-2025.sh
# Modernizes Klarpakke Linear issues to 2025 Standard.

KEY=$(grep "LINEAR_API_KEY" .env.local | cut -d'=' -f2 | tr -d '"')
API="https://api.linear.app/graphql"
TEAM_ID="a2b657ba-6d13-48b0-8570-25cbcb69f9c4"

# IDs
DONE_STATE="92e62835-ad13-4451-af66-b4a6d33c3e8a"
TODO_STATE="6579a9cf-8a37-4294-b01a-ea8a8d303e32"
IN_PROGRESS_STATE="2e83a200-a55f-4b06-a2d1-e87e3f7c8fc8"

LABEL_AI="ac9fc072-3f5c-4def-99d3-af66c50ea5cf"
LABEL_UX="9b65587f-ca5b-4fcb-9196-742aed8a9374"
LABEL_PERF="3c9d7935-31ab-49c5-8d5e-650d21119903"
LABEL_FEATURE="7aef567f-17f0-4ef6-a28c-9664ca42a522"

gql() {
  curl -s -H "Authorization: $KEY" -H "Content-Type: application/json" -d "{\"query\": $1}" "$API"
}

update_issue() {
  local id="$1"
  local state="$2"
  local labels="$3"
  echo "Updating $id..."
  gql "\"mutation { issueUpdate(id: \\\"$id\\\", input: { stateId: \\\"$state\\\", labelIds: [$labels] }) { success } }\""
}

create_issue() {
  local title="$1"
  local desc="$2"
  local state="$3"
  local labels="$4"
  local priority="$5"
  echo "Creating: $title"
  gql "\"mutation { issueCreate(input: { teamId: \\\"$TEAM_ID\\\", title: \\\"$title\\\", description: \\\"$desc\\\", stateId: \\\"$state\\\", labelIds: [$labels], priority: $priority }) { issue { identifier } } }\""
}

# 1. Sync completed items (KLA-18 to KLA-25)
# Note: I need the IDs from the previous query for these identifiers.
# KLA-25: f6f02afd-e059-4524-9d3a-59ed18608e4a
# KLA-24: a63bdf19-f29e-46bc-920d-d6cb49e3d8ae
# KLA-23: 3fe62515-409b-4be9-bec5-c73a2413c6b1
# KLA-22: f254514a-abce-4224-98b5-c99c943f3b69
# KLA-21: 5addd0a7-aefa-4edd-ad78-0be966d2aa55
# KLA-20: 26384b0e-8be2-484b-82cf-716a44bbb6ea
# KLA-19: 9db6bbc3-6da3-4f3e-9b55-dc9257932c68
# KLA-18: 3b02c25d-fbf2-4fcb-b37f-0d059f2d63cf

IDS=("f6f02afd-e059-4524-9d3a-59ed18608e4a" "a63bdf19-f29e-46bc-920d-d6cb49e3d8ae" "3fe62515-409b-4be9-bec5-c73a2413c6b1" "f254514a-abce-4224-98b5-c99c943f3b69" "5addd0a7-aefa-4edd-ad78-0be966d2aa55" "26384b0e-8be2-484b-82cf-716a44bbb6ea" "9db6bbc3-6da3-4f3e-9b55-dc9257932c68" "3b02c25d-fbf2-4fcb-b37f-0d059f2d63cf")
for id in "${IDS[@]}"; do
  update_issue "$id" "$DONE_STATE" "\\\"$LABEL_PERF\\\""
done

# 2. Inject 2025 Standard Issues
create_issue "📧 Automated Emails: Resend + Branded Templates" "Implementer branded e-postmaler med premium design. Koble send-notifications Edge Function til malbiblioteket." "$IN_PROGRESS_STATE" "\\\"$LABEL_UX\\\", \\\"$LABEL_FEATURE\\\"" 1
create_issue "💳 Billing & Recovery: Stripe Webhook Integration" "Automatisk utsendelse av kvitteringer og feilmeldinger ved feilet betaling via Stripe webhooks." "$TODO_STATE" "\\\"$LABEL_FEATURE\\\"" 1
create_issue "📊 Documentation: Modern engineering-standards.md" "Etablere Source of Truth for koding, i18n og ytelse." "$DONE_STATE" "\\\"$LABEL_PERF\\\"" 2
create_issue "🏆 Gamification: Level Up Database Triggers" "Automatisk XP/Nivå varsling via e-post når en bruker klatrer på leaderboardet." "$TODO_STATE" "\\\"$LABEL_UX\\\", \\\"$LABEL_FEATURE\\\"" 2

echo "Modernization Complete."
