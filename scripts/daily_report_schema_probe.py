#!/usr/bin/env python3
import json, os, urllib.request
from pathlib import Path

env_path = Path('/Users/taj/klarpakke/.env.local')
for line in env_path.read_text().splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        key, val = line.split('=', 1)
        os.environ.setdefault(key, val.strip().strip('"').strip("'"))

URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']

def get(path, params=""):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}?{params}", headers={
        "apikey": SRK, "Authorization": f"Bearer {SRK}", "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:200]}"}

# Sjekk schema for cron_health_events
print("=== cron_health_events (limit 1, alle kolonner) ===")
print(json.dumps(get("cron_health_events", "limit=1"), indent=2, default=str))

print("\n=== jokertrade_guard_log (limit 1) ===")
print(json.dumps(get("jokertrade_guard_log", "limit=1"), indent=2, default=str))
