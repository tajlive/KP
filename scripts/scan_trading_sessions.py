#!/usr/bin/env python3
import os, urllib.request, json, ssl, sys, datetime

base = os.environ['NEXT_PUBLIC_SUPABASE_URL']
srv  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
anon = os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
headers = {'apikey': anon, 'Authorization': 'Bearer ' + srv, 'Accept': 'application/json'}
ctx = ssl.create_default_context()

since = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat() + 'Z'

# trading_sessions crashed or stale active
url1 = base + '/rest/v1/trading_sessions?select=id,status,started_at,last_heartbeat,error_message,archived&status=eq.crashed&order=started_at.desc'
req1 = urllib.request.Request(url1, headers=headers)
with urllib.request.urlopen(req1, timeout=15, context=ctx) as r:
    crashed = json.loads(r.read())

# stale active (>10 min)
url2 = base + '/rest/v1/trading_sessions?select=id,status,started_at,last_heartbeat,error_message,archived&status=eq.active&last_heartbeat=lt.' + since.replace('Z','') + '&order=last_heartbeat.desc'
req2 = urllib.request.Request(url2, headers=headers)
with urllib.request.urlopen(req2, timeout=15, context=ctx) as r:
    stale = json.loads(r.read())

print(json.dumps({'crashed': crashed, 'stale_active': stale}, indent=2, default=str))
