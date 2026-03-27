#!/bin/bash
cd /Users/taj/klarpakke
python3 .kimi-scripts/check-i18n.py 2>&1 | tee .kimi-scripts/i18n-report.txt
echo ""
echo "Rapport lagret til: .kimi-scripts/i18n-report.txt"
