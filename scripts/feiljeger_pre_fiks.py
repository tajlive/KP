#!/usr/bin/env python3
import os, requests, json

MGMT = os.environ['SUPABASE_ACCESS_TOKEN']
REF = os.environ.get('SUPABASE_PROJECT_REF', 'pskhryjzkobytnfwucrb')

def mgmt_query(sql):
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

print("=== trading_sessions kolonner (relevante) ===")
res = mgmt_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trading_sessions' AND column_name IN ('last_heartbeat','updated_at','created_at','status','mode','archived')")
print(json.dumps(res, indent=2, default=str))

print("\n=== Aktive paper-sesjoner med gammel heartbeat ===")
res = mgmt_query("""
SELECT COUNT(*) as count 
FROM trading_sessions 
WHERE status = 'active' AND mode = 'paper' AND archived = false
  AND COALESCE(last_heartbeat, updated_at) < NOW() - INTERVAL '5 minutes'
  AND created_at < NOW() - INTERVAL '15 minutes'
""")
print(json.dumps(res, indent=2, default=str))

print("\n=== Aktive paper-sesjoner uten heartbeat-kolonne (fallback til updated_at) ===")
res = mgmt_query("""
SELECT COUNT(*) as count 
FROM trading_sessions 
WHERE status = 'active' AND mode = 'paper' AND archived = false
  AND updated_at < NOW() - INTERVAL '10 minutes'
""")
print(json.dumps(res, indent=2, default=str))
