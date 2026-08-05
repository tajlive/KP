#!/usr/bin/env python3
import os, urllib.request, json, ssl, sys

url = os.environ['NEXT_PUBLIC_SUPABASE_URL'] + '/rest/v1/cron_health_events'
headers = {
    'apikey': os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    'Authorization': 'Bearer ' + os.environ['SUPABASE_SERVICE_ROLE_KEY'],
    'Accept': 'application/json',
    'Content-Type': 'application/json',
}

# last 24h
import datetime
since = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat() + 'Z'
params = '?select=*&start_time=gte.' + since + '&order=start_time.desc'

ctx = ssl.create_default_context()
req = urllib.request.Request(url + params, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
        data = json.loads(resp.read())
        print(json.dumps(data, indent=2, default=str))
except Exception as e:
    print('ERROR:', e)
