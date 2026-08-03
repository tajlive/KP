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

print("=== pilot_guard_log skjema ===")
res = mgmt_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pilot_guard_log' ORDER BY ordinal_position")
print(json.dumps(res, indent=2, default=str))

print("\n=== jokertrade-health-guard cron SQL ===")
res = mgmt_query("SELECT jobid, jobname, command FROM cron.job WHERE jobname = 'jokertrade-health-guard'")
print(json.dumps(res, indent=2, default=str))

print("\n=== detect_crashed_sessions cron SQL ===")
res = mgmt_query("SELECT jobid, jobname, command FROM cron.job WHERE jobname LIKE '%crash%' OR command LIKE '%detect_crashed%'")
print(json.dumps(res, indent=2, default=str))
