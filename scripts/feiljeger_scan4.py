#!/usr/bin/env python3
import os, requests, json
from datetime import datetime, timedelta, timezone

MGMT = os.environ['SUPABASE_ACCESS_TOKEN']
REF = os.environ.get('SUPABASE_PROJECT_REF', 'pskhryjzkobytnfwucrb')

def mgmt_query(sql):
    h = {'Authorization': f'Bearer {MGMT}', 'Content-Type': 'application/json'}
    r = requests.post(f"https://api.supabase.com/v1/projects/{REF}/database/query", headers=h, json={"query": sql})
    try:
        return r.json()
    except Exception:
        return {"raw": r.text[:500], "status": r.status_code}

since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

print("=== cron.job_run_details feil (siste 24t) ===")
res = mgmt_query(f"SELECT jobid, job_pid, status, COUNT(*) as count FROM cron.job_run_details WHERE start_time > '{since}' GROUP BY jobid, job_pid, status HAVING status <> 'succeeded' ORDER BY count DESC LIMIT 20")
print(json.dumps(res, indent=2, default=str))

print("\n=== jokertrade tabeller i alle schemas ===")
res = mgmt_query("SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%jokertrade%' OR tablename LIKE '%kill_switch%' ORDER BY schemaname, tablename")
print(json.dumps(res, indent=2, default=str))

print("\n=== Funksjoner med jokertrade i navnet ===")
res = mgmt_query("SELECT proname, prorettype::regtype FROM pg_proc WHERE proname LIKE '%jokertrade%'")
print(json.dumps(res, indent=2, default=str))

print("\n=== Vault secrets (navn, IKKE verdier) ===")
res = mgmt_query("SELECT name FROM vault.decrypted_secrets ORDER BY name")
print(json.dumps(res, indent=2, default=str))
