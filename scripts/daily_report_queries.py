#!/usr/bin/env python3
import os, json, urllib.request, urllib.error

ref = os.environ['SUPABASE_PROJECT_REF']
token = os.environ['SUPABASE_ACCESS_TOKEN']

queries = {
    "cron_health_events": """
        SELECT status_code, job_name, COUNT(*) as count, MAX(created_at) as latest
        FROM public.cron_health_events
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY status_code, job_name
        ORDER BY latest DESC
    """,
    "cron_job_run_details": """
        SELECT jobid, jobname, start_time, end_time, status
        FROM cron.job_run_details
        WHERE jobname IN ('cron-health-collector','klarpakke-trading-tick','smart-trader-v3','reconcile-binance-trades')
          AND start_time > NOW() - INTERVAL '24 hours'
        ORDER BY start_time DESC
        LIMIT 30
    """,
    "session_heartbeat_check": """
        SELECT COUNT(*) as active_count,
               MAX(last_heartbeat) as freshest_heartbeat,
               COUNT(*) FILTER (WHERE last_heartbeat < NOW() - INTERVAL '10 minutes') as stale_count
        FROM trading_sessions
        WHERE status = 'active' AND mode = 'paper'
    """,
    "new_sessions_24h_count": """
        SELECT COUNT(*) as new_sessions_24h
        FROM trading_sessions
        WHERE created_at > NOW() - INTERVAL '24 hours'
    """,
    "trade_stats": """
        SELECT
            COUNT(*) as total_trades,
            COUNT(*) FILTER (WHERE realized_pnl > 0) as wins,
            COUNT(*) FILTER (WHERE realized_pnl <= 0) as losses_or_flat,
            SUM(realized_pnl) as total_pnl,
            AVG(realized_pnl) as avg_pnl
        FROM trades
        WHERE created_at > '2026-07-30T11:00:00Z'
    """,
    "trade_by_pair": """
        SELECT trading_pair,
               COUNT(*) as trades,
               SUM(realized_pnl) as total_pnl,
               AVG(realized_pnl) as avg_pnl
        FROM trades
        WHERE created_at > '2026-07-30T11:00:00Z'
        GROUP BY trading_pair
        ORDER BY total_pnl DESC
    """,
    "trade_by_day": """
        SELECT DATE(created_at) as day,
               COUNT(*) as trades,
               SUM(realized_pnl) as daily_pnl,
               AVG(realized_pnl) as avg_pnl
        FROM trades
        WHERE created_at > '2026-07-30T11:00:00Z'
        GROUP BY DATE(created_at)
        ORDER BY day DESC
    """
}

url = f"https://api.supabase.com/v1/projects/{ref}/database/query"
results = {}

for name, query in queries.items():
    payload = json.dumps({"query": query.strip()}).encode()
    req = urllib.request.Request(url, data=payload, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            results[name] = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        results[name] = {"error": f"HTTP {e.code}: {body}"}
    except Exception as e:
        results[name] = {"error": str(e)}

print(json.dumps(results, indent=2, default=str))
