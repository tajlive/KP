#!/usr/bin/env bash
# safe-push.sh — Klarpakke trygg push
# Kjoer: bash ~/klarpakke/safe-push.sh ["commit-melding"]
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()   { echo -e "${GREEN}OK  $1${NC}"; }
warn() { echo -e "${YELLOW}ADV $1${NC}"; }
fail() { echo -e "${RED}STOPP: $1${NC}"; exit 1; }
info() { echo -e "${CYAN}--> $1${NC}"; }
hdr()  { echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}"; }

cd ~/klarpakke

echo ""
echo "=========================================="
echo "  KLARPAKKE SAFE PUSH  $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="

# 1. Branch
hdr "1/8 BRANCH"
BRANCH=$(git branch --show-current)
[ "$BRANCH" = "main" ] && ok "Pa main" || fail "Ikke pa main (er: $BRANCH)"

# 2. Vis endringer
hdr "2/8 ENDRINGER"
CHANGED=$(git diff --name-only HEAD 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
info "Endrede: $CHANGED | Untracked: $UNTRACKED"
git diff --name-only HEAD 2>/dev/null | sed 's/^/  ~ /'
git ls-files --others --exclude-standard 2>/dev/null | sed 's/^/  + /'

# 3. Stage alt
hdr "3/8 GIT ADD"
git add -A
ok "Alle filer staged"

# 4. Secret-sjekk
hdr "4/8 SECRET-SJEKK"
if npm run check:secrets-staged --silent 2>/dev/null; then
  ok "Ingen hemmeligheter i staged filer"
else
  fail "Hemmeligheter funnet! Fjern dem for push."
fi

# 5. Lint
hdr "5/8 ESLINT"
info "Kjorer lint..."
if npm run lint 2>&1 | tail -5; then
  ok "Lint: OK"
else
  warn "Lint-feil funnet"
  read -r -p "   Fortsett uansett? [y/N] " CONT
  [ "$CONT" = "y" ] || [ "$CONT" = "Y" ] || fail "Avbrutt pa lint"
fi

# 6. TypeScript
hdr "6/8 TYPE-CHECK"
info "Kjorer tsc --noEmit..."
if npm run type-check 2>&1 | tail -10; then
  ok "TypeScript: OK"
else
  warn "TypeScript-feil funnet"
  read -r -p "   Fortsett uansett? [y/N] " CONT
  [ "$CONT" = "y" ] || [ "$CONT" = "Y" ] || fail "Avbrutt pa type-check"
fi

# 7. Vitest
hdr "7/8 UNIT-TESTS"
info "Kjorer vitest run..."
if npx vitest run 2>&1 | tail -20; then
  ok "Vitest: alle tester bestod"
else
  warn "Noen vitest-tester feilet!"
  read -r -p "   Fortsett uansett? [y/N] " CONT
  [ "$CONT" = "y" ] || [ "$CONT" = "Y" ] || fail "Avbrutt pa tester"
fi

# 8. Commit + Push
hdr "8/8 COMMIT + PUSH"
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')

if [ "$STAGED" = "0" ]; then
  ok "Ingenting a committe - allerede up to date"
else
  if [ -n "$1" ]; then
    MSG="$1"
  else
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    MSG="chore: safe-push $TIMESTAMP ($STAGED filer endret)"
  fi

  info "Commit: $MSG"
  git commit -m "$MSG"
  ok "Commit OK: $(git log --oneline -1 | cut -c1-60)"

  info "Pusher til origin main..."
  git push origin main && ok "Push OK -> github.com" || fail "Push feilet. Proev: git pull --rebase origin main"
fi

echo ""
echo "=========================================="
echo "  SAFE PUSH FERDIG"
echo "  Vercel deployer automatisk innen 2 min"
echo "  https://vercel.com/tom-jensens-projects/klarpakke"
echo "  https://www.klarpakke.no"
echo "=========================================="
