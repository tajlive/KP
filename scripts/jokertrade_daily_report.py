#!/usr/bin/env python3
"""Henter JokerTrade-data fra Supabase for daglig rapport."""

import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

SUPABASE_URL = sys.argv[1]
SERVICE_KEY = sys.argv[2]

def rest_get(table, params):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())

# --- 1. Trading-statistikk ---
# Hent alle trades med paging (1000 per side)
all_trades = []
offset = 0
limit = 1000
while True:
    page = rest_get("trades", {
        "select": "*",
        "created_at": "gte.2026-07-30T11:00:00Z",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    })
    if not page:
        break
    all_trades.extend(page)
    if len(page) < limit:
        break
    offset += limit
    if offset > 15000:  # safety
        break

# Kalkuler statistikk
pnl_list = [t["realized_pnl"] for t in all_trades if t.get("realized_pnl") is not None]
wins = [p for p in pnl_list if p > 0]
losses = [p for p in pnl_list if p < 0]

per_symbol = {}
per_day = {}
for t in all_trades:
    sym = t["trading_pair"]
    pnl = t.get("realized_pnl")
    if pnl is not None:
        per_symbol.setdefault(sym, {"trades": 0, "wins": 0, "losses": 0, "sum_pnl": 0.0})
        per_symbol[sym]["trades"] += 1
        per_symbol[sym]["sum_pnl"] += pnl
        if pnl > 0:
            per_symbol[sym]["wins"] += 1
        else:
            per_symbol[sym]["losses"] += 1
    
    day = t["created_at"][:10]
    per_day.setdefault(day, {"trades": 0, "wins": 0, "sum_pnl": 0.0})
    per_day[day]["trades"] += 1
    if pnl is not None:
        per_day[day]["sum_pnl"] += pnl
        if pnl > 0:
            per_day[day]["wins"] += 1

trading_stats = {
    "total_trades": len(all_trades),
    "trades_with_pnl": len(pnl_list),
    "wins": len(wins),
    "losses": len(losses),
    "win_rate_pct": round(len(wins) / len(pnl_list) * 100, 1) if pnl_list else 0,
    "sum_pnl": round(sum(pnl_list), 2) if pnl_list else 0,
    "avg_pnl": round(sum(pnl_list) / len(pnl_list), 2) if pnl_list else 0,
    "per_symbol": {k: {**v, "sum_pnl": round(v["sum_pnl"], 2)} for k, v in per_symbol.items()},
    "per_day": {k: {**v, "sum_pnl": round(v["sum_pnl"], 2)} for k, v in sorted(per_day.items())},
}

# --- 2. Sesjonshelse ---
active_sessions = rest_get("trading_sessions", {
    "select": "id,user_id,trading_pair,last_heartbeat,last_tick_at,status,created_at",
    "status": "eq.active",
    "mode": "eq.paper",
    "order": "last_heartbeat.desc",
    "limit": "200",
})

now = datetime.now(timezone.utc)
for s in active_sessions:
    if s.get("last_heartbeat"):
        lh = datetime.fromisoformat(s["last_heartbeat"].replace("Z", "+00:00"))
        s["heartbeat_min_ago"] = round((now - lh).total_seconds() / 60, 1)

new_sessions = rest_get("trading_sessions", {
    "select": "id,user_id,trading_pair,created_at,status",
    "created_at": "gte.2026-08-04T06:00:00Z",
    "order": "created_at.desc",
    "limit": "200",
})

# --- 3. Cron-helse ---
cron_events = rest_get("cron_health_events", {
    "select": "*",
    "created": "gte.2026-08-04T06:00:00Z",
    "order": "created.desc",
    "limit": "500",
})

# Aggreger per job_name og per status
job_agg = {}
status_agg = {}
for e in cron_events:
    job = e.get("job_name", "unknown")
    sc = e.get("status_code")
    job_agg.setdefault(job, {"count": 0, "errors": 0, "last": e.get("created")})
    job_agg[job]["count"] += 1
    if sc is not None and sc >= 400:
        job_agg[job]["errors"] += 1
    
    if sc is not None:
        status_agg.setdefault(sc, 0)
        status_agg[sc] += 1

result = {
    "generated_at": now.isoformat(),
    "trading": trading_stats,
    "sessions": {
        "active_count": len(active_sessions),
        "active_heartbeats": [s for s in active_sessions],
        "new_last_24h_count": len(new_sessions),
        "new_sessions": [{"id": s["id"], "user_id": s["user_id"], "pair": s["trading_pair"], "created_at": s["created_at"]} for s in new_sessions],
    },
    "cron": {
        "events_last_24h": len(cron_events),
        "per_job": job_agg,
        "status_codes": status_agg,
        "latest_errors": [e for e in cron_events if e.get("status_code") and e["status_code"] >= 400][:10],
        "latest_events": cron_events[:20],
    },
}

print(json.dumps(result, indent=2, default=str))
PYEOF