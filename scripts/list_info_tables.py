#!/usr/bin/env python3
import os, urllib.request, json, ssl

base = os.environ['NEXT_PUBLIC_SUPABASE_URL']
srv  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
anon = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
headers = {'apikey': anon, 'Authorization': 'Bearer ' + srv, 'Accept': 'application/json'}
ctx = ssl.create_default_context()

# Query information_schema for table names with cron/net/health/trade/error/alert/log
url = base + "/rest/v1/" + urllib.parse.quote("information_schema.tables") + "?select=table_schema,table_name&table_schema=eq.public&order=table_name"
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
        data = json.loads(r.read())
        for row in data:
            print(f"{row['table_schema']}.{row['table_name']}")
except Exception as e:
    print('ERROR:', e)
