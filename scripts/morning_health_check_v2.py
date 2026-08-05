import os, subprocess, re

# Les .env.local
with open('/Users/taj/klarpakke/.env.local', 'r') as f:
    env_text = f.read()

m = re.search(r'^DATABASE_URL=(.+)$', env_text, re.MULTILINE)
if not m:
    print('DATABASE_URL ikke funnet')
    exit(1)

db_url = m.group(1).strip().strip('"').strip("'")

queries = [
    ("PRISER", "select max(updated_at) as siste_sync, count(*) as antall_coins from coin_prices;"),
    ("TRADING", "select count(*) filter (where status='active') as aktive, max(last_tick_at) as siste_tick from trading_sessions;"),
    ("ORPHANS", "select count(*) from trading_sessions where status='stopped' and open_position is not null and (open_position->>'quantity')::numeric > 0;"),
]

for name, sql in queries:
    print(f"=== {name} ===")
    result = subprocess.run(
        ['psql', db_url, '-c', sql],
        capture_output=True, text=True, timeout=20
    )
    if result.returncode != 0:
        print(f"ERROR: {result.stderr}")
    else:
        print(result.stdout)
