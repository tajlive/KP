#!/bin/bash
# Kjør parallelle KIMI-agenter
TASKS=(
  "Fiks alle TypeScript strict-feil i src/components/ og commit"
  "Kjør Supabase SQL-diagnostikk og reparer alle trigger-feil"
  "Sjekk Vercel deploy-logs og fiks siste build-feil"
  "Oppdater alle i18n-manglende nøkler i no.json og en.json"
)

for task in "${TASKS[@]}"; do
  kimi --yolo "$task" &
done
wait
echo "✅ Alle agenter ferdige"
