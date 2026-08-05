import os, subprocess, re
env = open('/Users/taj/klarpakke/.env.local').read()
db = re.search(r'^DATABASE_URL=(.+)$', env, re.M).group(1).strip().strip('"').strip("'")
r = subprocess.run(['psql', db, '-c', 'select max(created_at) as siste_sync, count(*) as antall_coins from coin_prices;'], capture_output=True, text=True, timeout=20)
print(r.stdout if r.returncode==0 else r.stderr)
