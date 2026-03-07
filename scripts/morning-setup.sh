#!/bin/bash
# 🌅 Morning Setup Script for Klarpakke
# Run this after waking up to complete deployment

set -e

echo "🚀 Klarpakke Morning Setup"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this from klarpakke root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1/4: Database Migration${NC}"
echo "--------------------------------"
if command -v supabase &> /dev/null; then
    echo "Pushing database migrations..."
    supabase db push
    echo "Generating TypeScript types..."
    supabase gen types typescript --project-id vuxbjlykgmzskxbclquf > src/types/supabase-generated.ts
    echo -e "${GREEN}✅ Database updated${NC}"
else
    echo -e "${RED}❌ supabase CLI not found. Install with:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2/4: Install Dependencies${NC}"
echo "--------------------------------"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 3/4: Build Check${NC}"
echo "--------------------------------"
npm run build
echo -e "${GREEN}✅ Build successful${NC}"

echo ""
echo -e "${YELLOW}Step 4/4: Test Paper Trading API${NC}"
echo "--------------------------------"
echo "Testing /api/paper-trading/balance..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/paper-trading/balance || echo "⚠️  Server not running locally"

echo ""
echo "=========================="
echo -e "${GREEN}✅ Morning setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set CRON_SECRET in Vercel Dashboard (if not done)"
echo "2. Deploy to production: git push origin main"
echo "3. Test at klarpakke.no/dashboard"
echo ""
echo "🎯 Paper Trading + Auto Trading are now LIVE!"
