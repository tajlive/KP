#!/bin/bash
set -e

echo \"=========================================\"
echo \"KLARPAKKE - FORCE CLEAN GIT STATE\"
echo \"=========================================\"

cd /Users/taj/klarpakke

echo \"[1/5] Remove git lock...\"
rm -f .git/index.lock

echo \"[2/5] Reset ALL staging (hard)...\"
git reset --hard HEAD

echo \"[3/5] Clean untracked files...\"
git clean -fd

echo \"[4/5] Verify clean state...\"
git status

echo \"\"
echo \"[5/5] Verify staged files are gone...\"
if git diff --cached --exit-code > /dev/null 2>&1; then
  echo \"✅ No staged changes\"
else
  echo \"❌ WARNING: Staged changes still present\"
fi

echo \"\"
echo \"=========================================\"
echo \"Git state is CLEAN\"
echo \"Ready to diagnose paper trading saldo bug\"
echo \"=========================================\"
