#!/usr/bin/env python3
import os, urllib.request, json, ssl

token = os.environ['SUPABASE_ACCESS_TOKEN']
url = 'https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query'
headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
}

# List public tables
query = {
    "query": """
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
"""
}

ctx = ssl.create_default_context()
req = urllib.request.Request(url, data=json.dumps(query).encode(), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        data = json.loads(resp.read())
        for row in data:
            print(row.get('table_name'))
except Exception as e:
    print('ERROR:', e)
