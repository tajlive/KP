#!/usr/bin/env python3
import os, requests, json

SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']
URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
MGMT = os.environ['SUPABASE_ACCESS_TOKEN']
REF = os.environ.get('SUPABASE_PROJECT_REF', 'pskhryjzkobytnfwucrb')

HEAD = {'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json'}

def rest_get(path, params=None):
    r = requests.get(f"{URL}/rest/v1/{path}", headers=HEAD, params=params)
    return r.json()

def mgmt_query(sql):
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

print("=== Verifikasjon 1: Legacy-sesjoner ===")
rows = rest_get("trading_sessions", {"id": "in.(2a1a6cc1-587b-482a-8efb-d363a88b0ede,3e26f863-fc6a-41ca-972f-4a6139bd785a)", "select": "id,status,error_message"})
print(json.dumps(rows, indent=2, default=str))

print("\n=== Verifikasjon 2: detect_crashed_sessions cron ===")
res = mgmt_query("SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'detect-crashed-sessions'")
print(json.dumps(res, indent=2, default=str))

print("\n=== Verifikasjon 3: daily_integrity_check ===")
rows = rest_get("bot_health", {"bot_name": "eq.daily_integrity_check", "select": "*"})
print(json.dumps(rows, indent=2, default=str))
