import os, json, urllib.request

# Hent token
cmd = "grep SUPABASE_ACCESS_TOKEN ~/.zshrc | head -1 | sed 's/.*=//' | tr -d \"\\\"'\" 2>&1"
token = os.popen(cmd).read().strip()
print(f"TOKEN len: {len(token)}")

def q(query):
    url = "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query"
    req = urllib.request.Request(
        url,
        data=json.dumps({"query": query}).encode(),
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        r = urllib.request.urlopen(req, timeout=15)
        return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()}

print("=== PRISER ===")
print(q("select max(updated_at) as siste_sync, count(*) as antall_coins from coin_prices;"))

print("=== TRADING ===")
print(q("select count(*) filter (where status='active') as aktive, max(last_tick_at) as siste_tick from trading_sessions;"))

print("=== ORPHANS ===")
print(q("select count(*) from trading_sessions where status='stopped' and open_position is not null and (open_position->>'quantity')::numeric > 0;"))
