#!/usr/bin/env python3
"""Klarpakke Feiljeger - systematisk skanning av alle feilkilder"""
import os, sys, json, urllib.request, urllib.error, datetime, ssl

# --- Setup ---
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "")
SUPABASE_ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Fallback: les .env.local direkte hvis env mangler
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key == "NEXT_PUBLIC_SUPABASE_URL" and not SUPABASE_URL:
                    SUPABASE_URL = val
                elif key == "SUPABASE_PROJECT_REF" and not SUPABASE_PROJECT_REF:
                    SUPABASE_PROJECT_REF = val
                elif key == "SUPABASE_ACCESS_TOKEN" and not SUPABASE_ACCESS_TOKEN:
                    SUPABASE_ACCESS_TOKEN = val
                elif key == "SUPABASE_SERVICE_ROLE_KEY" and not SUPABASE_SERVICE_ROLE_KEY:
                    SUPABASE_SERVICE_ROLE_KEY = val

# Hent project ref fra URL hvis fortsatt mangler
if not SUPABASE_PROJECT_REF and SUPABASE_URL:
    parts = SUPABASE_URL.replace("https://", "").split(".")
    if len(parts) >= 1:
        SUPABASE_PROJECT_REF = parts[0]

if not all([SUPABASE_URL, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY]):
    print(f"ERROR: Mangler env-variabler. URL={bool(SUPABASE_URL)} REF={bool(SUPABASE_PROJECT_REF)} TOKEN={bool(SUPABASE_ACCESS_TOKEN)} KEY={bool(SUPABASE_SERVICE_ROLE_KEY)}", file=sys.stderr)
    sys.exit(1)

REST_URL = f"{SUPABASE_URL}/rest/v1"
MGMT_URL = f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT_REF}/database/query"

def mgmt_query(sql):
    """Kjor SQL via Supabase Management API"""
    req = urllib.request.Request(
        MGMT_URL,
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:500]}"}
    except Exception as e:
        return {"error": str(e)}

def rest_query(table, select="*", params=None):
    """Hent fra PostgREST med service role"""
    url = f"{REST_URL}/{table}?select={select}"
    if params:
        url += "&" + "&".join(params)
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:500]}"}
    except Exception as e:
        return {"error": str(e)}

def health_check():
    req = urllib.request.Request("https://www.klarpakke.no/api/health")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e)}

def edge_check(name, body=None):
    url = f"{SUPABASE_URL}/functions/v1/{name}"
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers={
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json" if body else None,
    }, method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"status": resp.status, "body": resp.read().decode()[:500]}
    except urllib.error.HTTPError as e:
        return {"status": e.code, "body": e.read().decode()[:500]}
    except Exception as e:
        return {"error": str(e)}

# --- Sjekk 1: cron_health_events siste 24t ---
print("=" * 60)
print("1. CRON_HEALTH_EVENTS siste 24t (ikke-200 / timeout)")
print("=" * 60)
res = mgmt_query("""
SELECT event_time, job_name, status_code, error_message
FROM cron_health_events
WHERE event_time > now() - interval '24 hours'
ORDER BY event_time DESC
LIMIT 50;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    if not rows:
        print("Ingen hendelser siste 24t.")
    else:
        for r in rows[:20]:
            print(f"  {r.get('event_time')} | {r.get('job_name')} | status={r.get('status_code')} | {r.get('error_message', '')[:80]}")
        if len(rows) > 20:
            print(f"  ... og {len(rows)-20} til")

# --- Sjekk 2: net._http_response direkte ---
print()
print("=" * 60)
print("2. NET._HTTP_RESPONSE siste 24t (ikke-200)")
print("=" * 60)
res = mgmt_query("""
SELECT status_code, content::text, timed_out, error_msg, time_start
FROM net._http_response
WHERE time_start > now() - interval '24 hours'
  AND (status_code IS NULL OR status_code >= 300)
ORDER BY time_start DESC
LIMIT 50;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    if not rows:
        print("Ingen ikke-200 responser siste 24t.")
    else:
        for r in rows[:20]:
            print(f"  {r.get('time_start')} | status={r.get('status_code')} | timed_out={r.get('timed_out')} | {str(r.get('error_msg',''))[:80]}")

# --- Sjekk 3: cron.job_run_details ---
print()
print("=" * 60)
print("3. CRON.JOB_RUN_DETAILS siste 24t (ikke succeeded/running)")
print("=" * 60)
res = mgmt_query("""
SELECT jobid, jobname, status, start_time, end_time, return_message
FROM cron.job_run_details
WHERE start_time > now() - interval '24 hours'
  AND status NOT IN ('succeeded', 'running')
ORDER BY start_time DESC
LIMIT 50;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    if not rows:
        print("Alle cron-jobber succeeded/running siste 24t.")
    else:
        for r in rows[:20]:
            print(f"  {r.get('start_time')} | {r.get('jobname')} | status={r.get('status')} | {str(r.get('return_message',''))[:80]}")

# --- Sjekk 4: bot_health ---
print()
print("=" * 60)
print("4. BOT_HEALTH status")
print("=" * 60)
res = mgmt_query("""
SELECT bot_name, status, last_heartbeat, error_count, last_error_message
FROM bot_health
ORDER BY last_heartbeat DESC NULLS LAST;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    for r in rows:
        stale = ""
        if r.get("last_heartbeat"):
            hb = datetime.datetime.fromisoformat(str(r["last_heartbeat"]).replace("Z", "+00:00"))
            age = datetime.datetime.now(datetime.timezone.utc) - hb
            if age > datetime.timedelta(minutes=10):
                stale = f" [STALE: {age}]"
        print(f"  {r.get('bot_name')} | status={r.get('status')} | heartbeats={r.get('error_count')}{stale}")
        if r.get("last_error_message"):
            print(f"    ERROR: {r['last_error_message'][:120]}")

# --- Sjekk 5: trading_sessions ---
print()
print("=" * 60)
print("5. TRADING_SESSIONS feil / crashed / stale")
print("=" * 60)
res = mgmt_query("""
SELECT id, user_id, status, mode, started_at, updated_at, error_message,
       now() - updated_at as stale_age
FROM trading_sessions
WHERE (
    (error_message IS NOT NULL)
    OR (status = 'crashed')
    OR (status IN ('active','running') AND updated_at < now() - interval '10 minutes')
)
AND started_at > now() - interval '24 hours'
ORDER BY started_at DESC
LIMIT 50;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    if not rows:
        print("Ingen problematiske sesjoner siste 24t.")
    else:
        for r in rows[:15]:
            print(f"  {r.get('id')} | user={r.get('user_id')[:8]}... | status={r.get('status')} | mode={r.get('mode')} | stale={r.get('stale_age')} | err={str(r.get('error_message',''))[:60]}")

# --- Sjekk 6: trades feil / enhetsavvik ---
print()
print("=" * 60)
print("6. TRADES failed/rejected + prisavvik")
print("=" * 60)
res = mgmt_query("""
SELECT t.id, t.symbol, t.status, t.side, t.price as trade_price, cp.price as market_price,
       ABS(t.price - cp.price) / NULLIF(cp.price, 0) * 100 as pct_diff,
       t.created_at
FROM trades t
LEFT JOIN coin_prices cp ON cp.symbol = t.symbol
WHERE t.created_at > now() - interval '24 hours'
  AND (t.status IN ('failed','rejected')
       OR (cp.price IS NOT NULL AND ABS(t.price - cp.price) / NULLIF(cp.price, 0) > 0.20))
ORDER BY t.created_at DESC
LIMIT 50;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    if not rows:
        print("Ingen feilhandler eller prisavvik siste 24t.")
    else:
        for r in rows[:20]:
            print(f"  {r.get('id')} | {r.get('symbol')} | {r.get('side')} | status={r.get('status')} | trade_price={r.get('trade_price')} | market={r.get('market_price')} | diff={r.get('pct_diff')}")

# --- Sjekk 7: error/alert/log-tabeller ---
print()
print("=" * 60)
print("7. ERROR/ALERT/LOG-tabeller")
print("=" * 60)
res = mgmt_query("""
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%error%' OR table_name ILIKE '%alert%' OR table_name ILIKE '%log%')
ORDER BY table_name;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    tables = res if isinstance(res, list) else res.get("result", [])
    for t in tables:
        tn = t["table_name"]
        cnt = mgmt_query(f'SELECT COUNT(*) as cnt FROM "{tn}" WHERE created_at > now() - interval \'24 hours\' OR TRUE;')
        c = cnt[0]["cnt"] if isinstance(cnt, list) and cnt else "?"
        print(f"  {tn}: {c} rader totalt")
        recent = mgmt_query(f'SELECT * FROM "{tn}" ORDER BY COALESCE(created_at, timestamp, now()) DESC LIMIT 5;')
        if isinstance(recent, list) and recent:
            for row in recent:
                print(f"    {json.dumps(row, default=str)[:200]}")

# --- Sjekk 8: API-helse ---
print()
print("=" * 60)
print("8. API HELSE (klarpakke.no/api/health)")
print("=" * 60)
health = health_check()
print(json.dumps(health, indent=2, default=str))

# --- Sjekk 9: Edge functions ---
print()
print("=" * 60)
print("9. EDGE FUNCTIONS test")
print("=" * 60)
for name in ["binance-proxy", "smart-trader-v3", "daily-pnl-report"]:
    r = edge_check(name)
    print(f"  {name}: {r}")

# --- Sjekk 10: Generell cron oversikt ---
print()
print("=" * 60)
print("10. CRON-JOBBER (aktive)")
print("=" * 60)
res = mgmt_query("SELECT jobname, schedule, active FROM cron.job WHERE active = true ORDER BY jobname;")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    for r in rows:
        print(f"  {r.get('jobname')} | {r.get('schedule')} | active={r.get('active')}")

# --- Sjekk 11: paper_accounts balansekonsistens ---
print()
print("=" * 60)
print("11. PAPER_ACCOUNTS / USER_PROFILES balansekonsistens")
print("=" * 60)
res = mgmt_query("""
SELECT pa.user_id, pa.current_balance as paper_balance, up.paper_balance as profile_balance,
       pa.current_balance - up.paper_balance as diff
FROM paper_accounts pa
JOIN user_profiles up ON up.user_id = pa.user_id
WHERE ABS(pa.current_balance - up.paper_balance) > 0.01;
""")
if "error" in res:
    print(f"FEIL: {res['error']}")
else:
    rows = res if isinstance(res, list) else res.get("result", [])
    if not rows:
        print("Alle balanser synkronisert.")
    else:
        for r in rows[:10]:
            print(f"  user={r.get('user_id')[:8]}... | paper={r.get('paper_balance')} | profile={r.get('profile_balance')} | diff={r.get('diff')}")

print()
print("=" * 60)
print("SKANNING FULLFORT")
print("=" * 60)
