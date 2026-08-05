#!/usr/bin/env python3
import os, urllib.request, json, ssl

base = os.environ['NEXT_PUBLIC_SUPABASE_URL']
srv  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
anon = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
headers = {'apikey': anon, 'Authorization': 'Bearer ' + srv, 'Content-Type': 'application/json'}
ctx = ssl.create_default_context()

for name in ['binance-proxy','smart-trader-v3','daily-pnl-report']:
    url = f"{base}/functions/v1/{name}"
    req = urllib.request.Request(url, data=b'{}', headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            body = r.read().decode()[:300]
            print(f"{name}: HTTP {r.status} | {body[:200]}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        print(f"{name}: HTTP {e.code} | {body[:200]}")
    except Exception as e:
        print(f"{name}: ERR {e}")
