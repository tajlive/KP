#!/usr/bin/env python3
"""Hent JokerTrade data fra Supabase Postgres for daglig rapport."""
import os
from datetime import datetime, timezone
import psycopg2
from urllib.parse import urlparse
from collections import defaultdict
from decimal import Decimal

url = urlparse(os.environ["DATABASE_URL"])
conn = psycopg2.connect(
    host=url.hostname,
    port=url.port or 5432,
    dbname=url.path[1:] if url.path else "postgres",
    user=url.username,
    password=url.password,
    sslmode="require"
)

def to_float(v):
    return float(v) if isinstance(v, Decimal) else v

def query(sql, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall() if cur.description else []
        return [dict(zip(cols, r)) for r in rows]

FIX_DATE = "2026-07-30T11:00:00+00"

# 1. TRADES
print("=== TRADES ===")
trades = query("SELECT trading_pair, realized_pnl, created_at FROM public.trades WHERE created_at >= %s ORDER BY created_at DESC", (FIX_DATE,))
print(f"Total trades siden fiks: {len(trades)}")

if trades:
    for t in trades:
        t["realized_pnl"] = to_float(t.get("realized_pnl"))
    wins = [t for t in trades if t.get("realized_pnl") is not None and t["realized_pnl"] > 0]
    losses = [t for t in trades if t.get("realized_pnl") is not None and t["realized_pnl"] <= 0]
    pnl_vals = [t["realized_pnl"] for t in trades if t.get("realized_pnl") is not None]
    print(f"Wins: {len(wins)}, Losses: {len(losses)}, Uten PnL: {len(trades)-len(wins)-len(losses)}")
    print(f"Sum realized_pnl: {sum(pnl_vals):.2f}, Avg: {sum(pnl_vals)/len(pnl_vals):.4f}")

    sym = defaultdict(lambda: {"count":0, "wins":0, "pnl":0.0})
    for t in trades:
        s = t.get("trading_pair", "unknown")
        sym[s]["count"] += 1
        pnl = t.get("realized_pnl")
        if pnl is not None:
            sym[s]["pnl"] += pnl
            if pnl > 0:
                sym[s]["wins"] += 1
    print("\nPer symbol:")
    for s, v in sorted(sym.items(), key=lambda x: x[1]["count"], reverse=True):
        print(f"  {s}: {v['count']} handler, wins {v['wins']}, PnL {v['pnl']:.2f}")

    daily = defaultdict(lambda: {"count":0, "wins":0, "pnl":0.0})
    for t in trades:
        d = t["created_at"].isoformat()[:10] if hasattr(t["created_at"], 'isoformat') else str(t["created_at"])[:10]
        daily[d]["count"] += 1
        pnl = t.get("realized_pnl")
        if pnl is not None:
            daily[d]["pnl"] += pnl
            if pnl > 0:
                daily[d]["wins"] += 1
    print("\nPer dag:")
    for d in sorted(daily.keys()):
        v = daily[d]
        print(f"  {d}: {v['count']} handler, wins {v['wins']}, PnL {v['pnl']:.2f}")

# 2. SESSION HEALTH
print("\n=== SESSION HEALTH ===")
sessions = query("SELECT user_id, status, mode, last_heartbeat, started_at FROM public.trading_sessions WHERE status = 'active' AND mode = 'paper'")
print(f"Aktive paper-sesjoner: {len(sessions)}")
now = datetime.now(timezone.utc)
stale = 0
for s in sessions:
    hb = s.get("last_heartbeat")
    if hb:
        mins = (now - hb).total_seconds() / 60 if hasattr(hb, 'year') else 0
        if mins > 10:
            stale += 1
            print(f"  STALE {s.get('user_id')[:8]}... heartbeat {mins:.0f} min siden")
if stale == 0:
    print("  OK: alle hjerteslag friske")
else:
    print(f"  ALARM: {stale} sesjon(er) med heartbeat > 10 min")

new_sessions = query("SELECT COUNT(*) as cnt FROM public.trading_sessions WHERE started_at >= now() - interval '24 hours'")
new_cnt = new_sessions[0]["cnt"] if new_sessions else 0
print(f"\nNye sesjoner siste 24t: {new_cnt}")
if new_cnt > 5:
    print("  ALARM: >5 nye sesjoner siste 24t (bølge-guard)")
else:
    print("  OK: bølge-guard passert")

# 3. CRON HEALTH
print("\n=== CRON HEALTH ===")
cron_events = query("SELECT status_code, job_name, COUNT(*) as cnt FROM public.cron_health_events WHERE created >= now() - interval '24 hours' GROUP BY status_code, job_name ORDER BY cnt DESC")
if cron_events:
    print("Cron-hendelser siste 24t:")
    for r in cron_events:
        print(f"  {r.get('job_name') or 'N/A'} status={r.get('status_code')}: {r.get('cnt')} hendelser")
else:
    print("Ingen hendelser i cron_health_events siste 24t")

post_fix_events = query("SELECT COUNT(*) as cnt FROM public.cron_health_events WHERE created >= '2026-07-30T15:20:00+00'::timestamptz")
pf_cnt = post_fix_events[0]["cnt"] if post_fix_events else 0
print(f"\nHendelser etter 2026-07-30 15:20 UTC: {pf_cnt}")
if pf_cnt > 0:
    print("  ALARM: nye cron-feil etter fiks-tidspunkt")
else:
    print("  OK: ingen nye feil etter fiks-tidspunkt")

job_runs = query("SELECT jobid, jobname, status, start_time, end_time FROM cron.job_run_details WHERE jobname IN ('cron-health-collector','klarpakke-trading-tick','smart-trader-v3') AND start_time >= now() - interval '24 hours' ORDER BY start_time DESC")
print(f"\nJob runs siste 24t: {len(job_runs)}")
for j in job_runs[:20]:
    print(f"  {j.get('jobname')}: {j.get('status')} @ {j.get('start_time')}")

latest_jobs = query("SELECT DISTINCT ON (jobname) jobname, status, start_time, end_time FROM cron.job_run_details WHERE jobname IN ('cron-health-collector','klarpakke-trading-tick','smart-trader-v3') ORDER BY jobname, start_time DESC")
print("\nSiste kjøring per nøkkeljobb:")
for j in latest_jobs:
    print(f"  {j.get('jobname')}: {j.get('status')} @ {j.get('start_time')}")

conn.close()
print("\n=== FERDIG ===")
