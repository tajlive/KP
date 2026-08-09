#!/bin/bash
# Max Aggressive Overvåkning — kjører hver 15. minutt
cd /Users/taj/klarpakke
node scripts/max-aggressive-monitor.mjs >> logs/max-aggressive.log 2>&1
