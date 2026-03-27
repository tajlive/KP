#!/bin/bash
# Henter build-log fra siste Vercel Error-deploy
set -e
cd /Users/taj/klarpakke

DEPLOY_URL="https://klarpakke-ermlm7s6d-klarpakke.vercel.app"

echo "=== Vercel build-log: $DEPLOY_URL ==="
vercel logs "$DEPLOY_URL" 2>&1 | grep -i "type error\|error TS\|Failed to compile\|Argument of type\|Property.*does not exist" | head -30
echo "=== RAW tail ==="
vercel inspect "$DEPLOY_URL" 2>&1 | tail -40
