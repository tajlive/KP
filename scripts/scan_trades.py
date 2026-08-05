#!/usr/bin/env python3
import os, urllib.request, json, ssl, datetime

base = os.environ['NEXT_PUBLIC_SUPABASE_URL']
srv  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
anon = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
headers = {'apikey': anon, 'Authorization': 'Bearer ' + srv, 'Accept': 'application/json'}
ctx = ssl.create_default_context()

since = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat() + 'Z'

# trades failed/rejected and price mismatch
url1 = base + '/rest/v1/trades?select=id,symbol,side,price,quantity,status,handler,created_at&or=(status.eq.failed,status.eq.rejected)&created_at=gte.' + since + '&order=created_at.desc'
req1 = urllib.request.Request(url1, headers=headers)
try:
    with urllib.request.urlopen(req1, timeout=15, context=ctx) as r:
        failed = json.loads(r.read())
except Exception as e:
    print('ERROR trades failed:', e); failed=[]

# price mismatch: trades with open handlers whose price deviates >20% from coin_prices
# Use RPC or a simpler approach: fetch recent trades and coin_prices for same symbols
print(json.dumps({'failed_rejected': failed}, indent=2, default=str))
