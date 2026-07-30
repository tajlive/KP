#!/usr/bin/env python3
import os, sys, json

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local")
url = None
with open(env_path) as f:
    for line in f:
        if line.startswith("POSTGRES_URL_NON_POOLING="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

if not url:
    print("Fant ikke POSTGRES_URL_NON_POOLING")
    sys.exit(1)

import psycopg2
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

# Sjekk kolonner i cron_health_events først
print("Kolonnenavn i cron_health_events:")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'cron_health_events' ORDER BY ordinal_position;")
for row in cur.fetchall():
    print(f"  {row[0]}")

print("\nKolonnenavn i net._http_response:")
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'net' AND table_name = '_http_response' ORDER BY ordinal_position;")
for row in cur.fetchall():
    print(f"  {row[0]}")

cur.close()
conn.close()
