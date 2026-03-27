#!/bin/bash
set -e
cd /Users/taj/klarpakke
git add playwright.config.ts
git add 'src/app/[locale]/(auth)/innlogging/InnloggingClient.tsx'
git commit -m "fix: E2E port 3000->3001 + a11y aria-label logo link + aria-invalid scope"
git push origin main
