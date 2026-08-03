#!/usr/bin/env python3
"""JokerTrade Daily Status Report — data collector"""
import json, os, requests, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Read .env.local ourselves
env_path = Path(__file__).parent.parent / '.env.local'
for line in env_path.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    if '=' in line:
        key, val = line.split('=', 1)
        # Remove surrounding quotes if present
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        os.environ.setdefault(key, val)

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SERVICE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
MGMT_TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN')
PROJECT_REF = os.environ.get('SUPABASE_PROJECT_REF')

REST_BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'count=exact',
}

FIX_DATE = '2026-07-30T11:00:00Z'
NOW_UTC = datetime.now(timezone.utc)
ALARM_HEARTBEAT_MIN = 10
ALARM_NEW_SESSIONS = 5

def mgmt_query(sql: str):
    """Run SQL via Supabase Management API (requires SUPABASE_ACCESS_TOKEN)."""
    if not MGMT_TOKEN or not PROJECT_REF:
        return None, 'Missing MGMT_TOKEN or PROJECT_REF'
    url = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'
    resp = requests.post(url, headers={
        'Authorization': f'Bearer {MGMT_TOKEN}',
        'Content-Type': 'application/json',
    }, json={'query': sql})
    if resp.status_code != 200:
        return None, f"HTTP {resp.status_code}: {resp.text[:500]}"
    return resp.json(), None

def rest_get(table: str, params: dict):
    resp = requests.get(f"{REST_BASE}/{table}", headers=HEADERS, params=params)
    if not (200 <= resp.status_code < 300):
        return None, f"HTTP {resp.status_code}: {resp.text[:500]}"
    return resp.json(), None
    resp = requests.get(f"{REST_BASE}/{table}", headers=HEADERS, params=params)
    if resp.status_code != 200:
        return None, f"HTTP {resp.status_code}: {resp.text[:500]}"
    return resp.json(), None

# ============================================================
# 1. TRADING DATA
# ============================================================
print("=" * 60)
print("1. TRADING DATA (after fix)")
print("=" * 60)

# Get all trades after fix date
all_trades = []
offset = 0
limit = 1000
while True:
    batch, err = rest_get('trades', {
        'select': '*',
        'created_at': f'gte.{FIX_DATE}',
        'order': 'created_at.asc',
        'limit': limit,
        'offset': offset,
    })
    if err:
        print(f"ERROR fetching trades: {err}")
        sys.exit(1)
    if not batch:
        break
    all_trades.extend(batch)
    if len(batch) < limit:
        break
    offset += limit

print(f"Total trades fetched: {len(all_trades)}")

if all_trades:
    # Verify keys
    sample_keys = set(all_trades[0].keys())
    print(f"Trade fields: {sample_keys}")

    realized_key = 'realized_pnl' if 'realized_pnl' in sample_keys else 'pnl'
    pair_key = 'trading_pair' if 'trading_pair' in sample_keys else 'symbol'

    total = len(all_trades)
    wins = sum(1 for t in all_trades if t.get(realized_key, 0) is not None and t.get(realized_key, 0) > 0)
    total_pnl = sum(t.get(realized_key, 0) or 0 for t in all_trades)
    avg_pnl = total_pnl / total if total else 0

    print(f"\n--- TOTAL ---")
    print(f"Trades:     {total}")
    print(f"Wins:       {wins} ({100*wins/total:.1f}%)")
    print(f"Total PnL:  {total_pnl:.2f}")
    print(f"Avg PnL:    {avg_pnl:.2f}")

    # Per symbol
    from collections import defaultdict
    by_pair = defaultdict(lambda: {'trades': 0, 'wins': 0, 'pnl': 0.0})
    by_day = defaultdict(lambda: {'trades': 0, 'wins': 0, 'pnl': 0.0})

    for t in all_trades:
        pnl = t.get(realized_key, 0) or 0
        pair = t.get(pair_key, 'UNKNOWN')
        day = str(t.get('created_at', ''))[:10]  # YYYY-MM-DD

        by_pair[pair]['trades'] += 1
        by_pair[pair]['pnl'] += pnl
        if pnl > 0:
            by_pair[pair]['wins'] += 1

        by_day[day]['trades'] += 1
        by_day[day]['pnl'] += pnl
        if pnl > 0:
            by_day[day]['wins'] += 1

    print(f"\n--- PER SYMBOL ---")
    for pair, stats in sorted(by_pair.items(), key=lambda x: -x[1]['pnl']):
        wr = 100*stats['wins']/stats['trades'] if stats['trades'] else 0
        print(f"  {pair:>10}: {stats['trades']:>3} trades, {stats['wins']:>3} wins ({wr:>5.1f}%), PnL {stats['pnl']:>+10.2f}")

    print(f"\n--- PER DAY ---")
    for day in sorted(by_day.keys(), reverse=True):
        stats = by_day[day]
        wr = 100*stats['wins']/stats['trades'] if stats['trades'] else 0
        print(f"  {day}: {stats['trades']:>3} trades, {stats['wins']:>3} wins ({wr:>5.1f}%), PnL {stats['pnl']:>+10.2f}")
else:
    print("No trades found after fix date.")

# ============================================================
# 2. SESSION HEALTH
# ============================================================
print("\n" + "=" * 60)
print("2. SESSION HEALTH")
print("=" * 60)

active, err = rest_get('trading_sessions', {
    'select': 'id,last_heartbeat,created_at,user_id,status,mode',
    'status': 'eq.active',
    'mode': 'eq.paper',
    'limit': 1000,
})
if err:
    print(f"ERROR: {err}")
else:
    print(f"Active paper sessions: {len(active)}")
    if active:
        heartbeats = [s.get('last_heartbeat') for s in active if s.get('last_heartbeat')]
        if heartbeats:
            freshest = max(heartbeats)
            print(f"Freshest heartbeat: {freshest}")
            # Calculate age in minutes
            try:
                hb_dt = datetime.fromisoformat(freshest.replace('Z', '+00:00'))
                age_min = (NOW_UTC - hb_dt).total_seconds() / 60
                print(f"Age: {age_min:.1f} minutes")
                if age_min > ALARM_HEARTBEAT_MIN:
                    print(f"ALARM: Heartbeat older than {ALARM_HEARTBEAT_MIN} min!")
            except Exception as e:
                print(f"Could not parse heartbeat: {e}")
        else:
            print("WARNING: No heartbeats on active sessions!")

# New sessions last 24h
new_sessions, err = rest_get('trading_sessions', {
    'select': 'id,created_at',
    'created_at': f'gte.{(NOW_UTC - timedelta(hours=24)).isoformat()}',
    'limit': 1000,
})
if err:
    print(f"ERROR fetching new sessions: {err}")
else:
    new_count = len(new_sessions)
    print(f"New sessions last 24h: {new_count}")
    if new_count > ALARM_NEW_SESSIONS:
        print(f"ALARM: More than {ALARM_NEW_SESSIONS} new sessions in 24h!")

# ============================================================
# 3. CRON HEALTH
# ============================================================
print("\n" + "=" * 60)
print("3. CRON HEALTH")
print("=" * 60)

# Try Management API for cron health events
if MGMT_TOKEN and PROJECT_REF:
    sql_events = """
SELECT status_code, job_name, count(*) as antall
FROM cron_health_events
WHERE created_at > now() - interval '24 hours'
GROUP BY status_code, job_name
ORDER BY antall DESC
"""
    events, err = mgmt_query(sql_events)
    if err:
        print(f"Management API error for events: {err}")
    else:
        print("Cron health events last 24h:")
        if events and len(events) > 0:
            for row in events:
                print(f"  {row.get('status_code')} | {row.get('job_name')} | {row.get('antall')}")
        else:
            print("  (none)")

    sql_jobs = """
SELECT jobid, jobname, start_time, status
FROM cron.job_run_details
WHERE jobname IN ('cron-health-collector', 'klarpakke-trading-tick', 'smart-trader-v3')
  AND start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 20
"""
    jobs, err = mgmt_query(sql_jobs)
    if err:
        print(f"Management API error for job details: {err}")
    else:
        print("\nKey cron job runs last 24h:")
        if jobs and len(jobs) > 0:
            for row in jobs:
                print(f"  {row.get('jobname')} | {row.get('start_time')} | {row.get('status')}")
        else:
            print("  (none found)")
else:
    print("Missing SUPABASE_ACCESS_TOKEN or PROJECT_REF — skipping Management API queries.")

# Also try REST for cron_health_events directly
cron_events, err = rest_get('cron_health_events', {
    'select': '*',
    'created_at': f'gte.{(NOW_UTC - timedelta(hours=24)).isoformat()}',
    'order': 'created_at.desc',
    'limit': 1000,
})
if err:
    print(f"REST error for cron_health_events: {err}")
else:
    print(f"\nREST: cron_health_events rows last 24h: {len(cron_events)}")
    if cron_events:
        by_status = {}
        for ev in cron_events:
            sc = ev.get('status_code', 'N/A')
            by_status[sc] = by_status.get(sc, 0) + 1
        for sc, cnt in sorted(by_status.items()):
            print(f"  status_code={sc}: {cnt}")

print("\n" + "=" * 60)
print("Done.")
