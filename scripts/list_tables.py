#!/usr/bin/env python3
import os, urllib.request, json, ssl, urllib.parse

base = os.environ['NEXT_PUBLIC_SUPABASE_URL']
srv  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
anon = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
headers = {'apikey': anon, 'Authorization': 'Bearer ' + srv, 'Accept': 'application/json'}
ctx = ssl.create_default_context()

# List tables in public schema
url = base + '/rest/v1/'  # no table = list
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
        print(r.read().decode())
except Exception as e:
    print('ERROR list tables:', e)
