#!/bin/bash
# Fix all TypeScript errors in Klarpakke project

echo "🔧 Fixing TypeScript errors..."
cd ~/klarpakke

# Run Python fix script
python3 fix-all-ts-errors.py

echo ""
echo "📊 Running final type check..."
npm run type-check
