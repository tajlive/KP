#!/usr/bin/env python3
import os, sys

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local")
url = None
with open(env_path) as f:
    for line in f:
        if line.startswith("POSTGRES_URL_NON_POOLING="):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
            break

import psycopg2
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

# Hent hele session_maintenance kode
print("="*60)
print("SESSION_MAINTENANCE() FULL KODE")
print("="*60)
cur.execute("SELECT pg_get_functiondef('session_maintenance'::regproc);")
row = cur.fetchone()
if row:
    print(row[0])

print("\n" + "="*60)
print("ENSURE_ACTIVE_SESSIONS_FOR_ALL() FULL KODE")
print("="*60)
cur.execute("SELECT pg_get_functiondef('ensure_active_sessions_for_all'::regproc);")
row = cur.fetchone()
if row:
    print(row[0])

cur.close()
conn.close()
