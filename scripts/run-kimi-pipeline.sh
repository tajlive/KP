#!/bin/bash
set -e

echo "========================================="
echo "🚀 KIMI AUTO-PIPELINE: KLARPAKKE"
echo "========================================="

echo -e "\n[1/4] 📦 Sjekker Database Status..."
npm run db:status

echo -e "\n[2/4] 🧪 Kjører CI Pipeline (Lint, Type-check, Unit-tests)..."
npm run lint -- --max-warnings 0
npm run type-check
npm run test:unit

echo -e "\n[3/4] 🩺 Verifiserer System Health..."
npm run signals:health || echo "⚠️ Signals health check returnerte warning, sjekk logger."
# Kjører en basic pre-flight sjekk før deploy
npm run auto:preflight || echo "⚠️ Automation preflight gav warnings."

echo -e "\n[4/4] 🚀 Vercel Preview Deploy..."
npm run deploy:preview

echo -e "\n========================================="
echo "✅ KIMI PIPELINE FULLFØRT SUKSESSFULLT!"
echo "========================================="
