#!/bin/bash
# Update Cloudflare DNS to point to Vercel
set -e

DOMAIN="klarpakke.no"
VERCEL_A_RECORD="76.76.21.21"
VERCEL_CNAME="cname.vercel-dns.com"

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}Error: CLOUDFLARE_API_TOKEN is not set.${NC}"
    exit 1
fi

# 1. Get Zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ "$ZONE_ID" == "null" ]; then
    echo -e "${RED}Error: Could not find Zone ID for $DOMAIN${NC}"
    exit 1
fi

echo -e "${GREEN}Found Zone ID: $ZONE_ID${NC}"

# 2. Update Apex (A Record)
APEX_RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$DOMAIN&type=A" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r '.result[0].id')

if [ "$APEX_RECORD_ID" != "null" ]; then
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$APEX_RECORD_ID" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"type\":\"A\",\"name\":\"$DOMAIN\",\"content\":\"$VERCEL_A_RECORD\",\"ttl\":120,\"proxied\":false}"
    echo -e "${GREEN}Updated A record for $DOMAIN${NC}"
fi

# 3. Update WWW (CNAME Record)
WWW_RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=www.$DOMAIN&type=CNAME" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -r '.result[0].id')

if [ "$WWW_RECORD_ID" != "null" ]; then
    curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$WWW_RECORD_ID" \
         -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"type\":\"CNAME\",\"name\":\"www\",\"content\":\"$VERCEL_CNAME\",\"ttl\":120,\"proxied\":false}"
    echo -e "${GREEN}Updated CNAME record for www.$DOMAIN${NC}"
fi

echo -e "${GREEN}DNS update complete! 🚀${NC}"
