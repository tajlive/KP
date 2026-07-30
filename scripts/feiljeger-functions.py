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

def run(title, sql):
    print(f"\n{'='*60}")
    print(title)
    print('='*60)
    try:
        cur.execute(sql)
        if cur.description is None:
            print("  OK (ingen resultat)")
            return
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        if not rows:
            print("  Ingen rader funnet.")
        else:
            for row in rows[:30]:
                d = dict(zip(cols, row))
                parts = []
                for k, v in d.items():
                    if v is None:
                        continue
                    if isinstance(v, str) and len(v) > 300:
                        parts.append(f"{k}={v[:300]}...")
                    else:
                        parts.append(f"{k}={v}")
                print("  " + " | ".join(parts[:5]))
    except Exception as e:
        print(f"  FEIL: {e}")

# 1. Se session_maintenance kode
run("1. SESSION_MAINTENANCE() kildekode", """
SELECT pg_get_functiondef('session_maintenance'::regproc);
""")

# 2. Se ensure_active_sessions_for_all kode
run("2. ENSURE_ACTIVE_SESSIONS_FOR_ALL() kildekode", """
SELECT pg_get_functiondef('ensure_active_sessions_for_all'::regproc);
""")

# 3. Se hvilke cron-jobber som kaller session_maintenance
run("3. CRON-JOBBER som kaller session_maintenance", """
SELECT jobname, schedule, active, command
FROM cron.job
WHERE command ILIKE '%session_maintenance%'
ORDER BY jobname;
""")

# 4. Se sync-prices cron
run("4. SYNC-PRICES CRON", """
SELECT jobname, schedule, active, command
FROM cron.job
WHERE command ILIKE '%price%' OR command ILIKE '%sync%'
ORDER BY jobname;
""")

# 5. Se klarpakke-ai-engine cron (hva den faktisk kaller)
run("5. AI-ENGINE CRON", """
SELECT jobname, schedule, active, command
FROM cron.job
WHERE command ILIKE '%ai-engine%'
ORDER BY jobname;
""")

# 6. Se cron som ga 401 (de som kaller Edge Functions direkte)
run("6. CRON-JOBBER som kaller Edge Functions", """
SELECT jobname, schedule, active, command
FROM cron.job
WHERE command ILIKE '%functions%'
ORDER BY jobname;
""")

# 7. Se alle cron-kommandoer (de 50 siste unike)
run("7. ALLE AKTIVE CRON-KOMMANDOER", """
SELECT jobname, schedule, active, LEFT(command, 200) as cmd
FROM cron.job
WHERE active = true
ORDER BY jobname;
""")

# 8. Se kildekode for funksjoner som brukes av cron
run("8. KLARPAKKE_TRIGGER_CRON() kildekode", """
SELECT pg_get_functiondef('klarpakke_trigger_cron'::regproc);
""")

# 9. Se om det finnes en sync-prices funksjon
run("9. FUNKSJONER med 'sync' og 'price' i navnet", """
SELECT proname, pg_get_function_arguments(oid) as args
FROM pg_proc
WHERE proname ILIKE '%sync%price%' OR proname ILIKE '%price%sync%'
ORDER BY proname;
""")

# 10. Sjekk når session_maintenance sist feilet og om den noen gang har lyktes
run("10. SESSION_MAINTENANCE cron-historikk siste 24t", """
SELECT start_time, status, return_message
FROM cron.job_run_details
WHERE command ILIKE '%session_maintenance%'
  AND start_time > now() - interval '24 hours'
ORDER BY start_time DESC
LIMIT 5;
""")

# 11. Sjekk om daily_integrity_check cron finnes
run("11. DAILY_INTEGRITY_CHECK CRON", """
SELECT jobname, schedule, active, command
FROM cron.job
WHERE command ILIKE '%integrity%'
ORDER BY jobname;
""")

cur.close()
conn.close()
print("\n\nSKANNING FULLFORT")
