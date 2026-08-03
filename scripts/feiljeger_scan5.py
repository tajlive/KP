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

tables = ['system_flags', 'pilot_guard_log', 'jokertrade_guard_log']
for t in tables:
    res = mgmt_query(f"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{t}') as exists")
    print(f"{t}: {res}")

funcs = ['pilot_health_guard', 'pilot_emergency_stop', 'pilot_resume', 'detect_crashed_sessions']
for f in funcs:
    res = mgmt_query(f"SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = '{f}') as exists")
    print(f"{f}: {res}")
