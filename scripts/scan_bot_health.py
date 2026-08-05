#!/usr/bin/env python3
import os, urllib.request, json, ssl, datetime

base = os.environ['NEXT_PUBLIC_SUPABASE_URL']
srv  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
anon = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
headers = {'apikey': anon, 'Authorization': 'Bearer ' + srv, 'Accept': 'application/json'}
ctx = ssl.create_default_context()

# bot_health
url = base + '/rest/v1/bot_health?select=*&order=checked_at.desc'
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
        data = json.loads(r.read())
        print(json.dumps(data, indent=2, default=str))
except Exception as e:
    print('ERROR bot_health:', e)
