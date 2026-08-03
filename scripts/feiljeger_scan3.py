#!/usr/bin/env python3
"""Klarpakke Feiljeger — del 3: cron og kill switch"""
import os, requests, json
from datetime import datetime, timedelta, timezone

SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']
URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
MGMT = os.environ['SUPABASE_ACCESS_TOKEN']
REF = os.environ.get('SUPABASE_PROJECT_REF', 'pskhryjzkobytnfwucrb')

HEAD = {'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json'}

def mgmt_query(sql):
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

print("=== cron.job_run_details feil (siste 24t) ===")
res = mgmt_query(f"SELECT jobid, jobpid, status, COUNT(*) as count FROM cron.job_run_details WHERE start_time > '{since}' GROUP BY jobid, jobpid, status HAVING status <> 'succeeded' ORDER BY count DESC LIMIT 20")
print(json.dumps(res, indent=2, default=str))

print("\n=== jokertrade_kill_switch eller guard tabeller ===")
res = mgmt_query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%jokertrade%'")
print(json.dumps(res, indent=2, default=str))

print("\n=== Alle aktive paper-sesjoner (antall) ===")
res = mgmt_query("SELECT COUNT(*) as active_paper FROM trading_sessions WHERE status = 'active' AND mode = 'paper'")
print(json.dumps(res, indent=2, default=str))

print("\n=== Legacy high-capital sessions som fortsatt er active ===")
res = mgmt_query("SELECT id, user_id, status, error_message, updated_at FROM trading_sessions WHERE status = 'active' AND error_message IS NOT NULL")
print(json.dumps(res, indent=2, default=str))

print("\n=== Siste trading tick timestamp ===")
res = mgmt_query("SELECT MAX(executed_at) as last_trade FROM trades WHERE executed_at > NOW() - INTERVAL '6 hours'")
print(json.dumps(res, indent=2, default=str))

print("\n=== Ferskeste handler per time siste 6t ===")
res = mgmt_query("""
SELECT date_trunc('hour', executed_at) as hour, COUNT(*) as trades
FROM trades WHERE executed_at > NOW() - INTERVAL '6 hours'
GROUP BY date_trunc('hour', executed_at) ORDER BY hour DESC
""")
print(json.dumps(res, indent=2, default=str))
