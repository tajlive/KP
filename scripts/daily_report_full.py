#!/usr/bin/env python3
"""Hent JokerTrade-daglig rapport-data fra Supabase."""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path

# Les .env.local manuelt
env_path = Path('/Users/taj/klarpakke/.env.local')
for line in env_path.read_text().splitlines():
    line=line.strip()
    if line and not line.startswith('#') and '=' in line:
        key, val = line.split('=', 1)
        os.environ.setdefault(key, val.strip().strip('"').strip("'"))

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SRK = os.environ['SUPABASE_SERVICE_ROLE_KEY']
ACCESS_TOKEN = os.environ['SUPABASE_ACCESS_TOKEN']
PROJECT_REF = os.environ['SUPABASE_PROJECT_REF']

def rest_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SRK,
        "Authorization": f"Bearer {SRK}",
        "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def mgmt_query(sql):
    url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

print("=== 1. TRADING-STATISTIKK (siden 2026-07-30 11:00 UTC) ===")
trades = rest_get("trades", "select=created_at,trading_pair,side,status,realized_pnl&created_at=gt.2026-07-30T11:00:00Z&order=created_at.asc")
print(f"Totalt antall trades: {len(trades)}")

# Summer
wins = [t for t in trades if t.get('realized_pnl') is not None and t['realized_pnl'] > 0]
losses = [t for t in trades if t.get('realized_pnl') is not None and t['realized_pnl'] <= 0]
realized = [t for t in trades if t.get('realized_pnl') is not None]
total_pnl = sum(t['realized_pnl'] for t in realized)
avg_pnl = total_pnl / len(realized) if realized else 0

print(f"Trades med realized_pnl: {len(realized)}")
print(f"Wins (realized_pnl > 0): {len(wins)}")
print(f"Losses/flat (realized_pnl <= 0): {len(losses)}")
print(f"Sum realized PnL: {total_pnl:.2f} NOK")
print(f"Avg realized PnL per lukket trade: {avg_pnl:.2f} NOK")

# Per symbol
from collections import defaultdict
by_pair = defaultdict(lambda: {'trades': 0, 'pnl': 0.0, 'realized_count': 0})
for t in trades:
    p = t['trading_pair']
    by_pair[p]['trades'] += 1
    if t.get('realized_pnl') is not None:
        by_pair[p]['pnl'] += t['realized_pnl']
        by_pair[p]['realized_count'] += 1

print("\n--- Per symbol ---")
for pair, stats in sorted(by_pair.items(), key=lambda x: -x[1]['pnl']):
    print(f"  {pair}: {stats['trades']} trades, realized={stats['realized_count']}, PnL={stats['pnl']:.2f} NOK")

# Per dag
by_day = defaultdict(lambda: {'trades': 0, 'pnl': 0.0, 'realized': 0})
for t in trades:
    day = t['created_at'][:10]
    by_day[day]['trades'] += 1
    if t.get('realized_pnl') is not None:
        by_day[day]['pnl'] += t['realized_pnl']
        by_day[day]['realized'] += 1

print("\n--- Per dag ---")
for day in sorted(by_day.keys()):
    s = by_day[day]
    print(f"  {day}: {s['trades']} trades, realized={s['realized']}, PnL={s['pnl']:.2f} NOK")

print("\n=== 2. SESJONSHELSE ===")
sessions = rest_get("trading_sessions", "select=id,user_id,mode,status,created_at,last_heartbeat&mode=eq.paper&status=eq.active&order=last_heartbeat.desc")
print(f"Aktive paper-sesjoner: {len(sessions)}")
if sessions:
    freshest = max(s['last_heartbeat'] for s in sessions)
    stale = [s for s in sessions if s['last_heartbeat'] < '2026-08-01T05:00:00Z']
    print(f"Ferskeste heartbeat: {freshest}")
    print(f"Sesjoner med heartbeat eldre enn ~3t (stale): {len(stale)}")

new_sessions = rest_get("trading_sessions", f"select=count&created_at=gt.2026-07-31T08:17:00Z")
print(f"Nye sesjoner siste 24t: {len(new_sessions)}")

print("\n=== 3. CRON-HELSE (siste 24t) ===")
try:
    cron_health = mgmt_query("""
        SELECT status_code, job_name, COUNT(*) as count, MAX(created_at) as latest
        FROM public.cron_health_events
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY status_code, job_name
        ORDER BY latest DESC
    """)
    print(json.dumps(cron_health, indent=2, default=str))
except Exception as e:
    print(f"FEIL cron_health_events: {e}")

print("\n=== 4. CRON JOB_RUN_DETAILS (siste 24t) ===")
try:
    job_runs = mgmt_query("""
        SELECT jobid, jobname, start_time, end_time, status
        FROM cron.job_run_details
        WHERE jobname IN ('cron-health-collector','klarpakke-trading-tick','smart-trader-v3','reconcile-binance-trades')
          AND start_time > NOW() - INTERVAL '24 hours'
        ORDER BY start_time DESC
        LIMIT 30
    """)
    print(json.dumps(job_runs, indent=2, default=str))
except Exception as e:
    print(f"FEIL job_run_details: {e}")

print("\n=== 5. JOKERTRADE MONITOR ===")
try:
    monitor = mgmt_query("SELECT * FROM public.jokertrade_monitor LIMIT 5")
    print(json.dumps(monitor, indent=2, default=str))
except Exception as e:
    print(f"FEIL jokertrade_monitor (kan mangle): {e}")
