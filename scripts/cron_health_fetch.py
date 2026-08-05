#!/usr/bin/env python3
"""Henter cron-helse-data fra Supabase."""

import sys, json, urllib.request, urllib.parse

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

events = rest_get("cron_health_events", {
    "select": "*",
    "created": "gte.2026-08-04T06:00:00Z",
    "order": "created.desc",
    "limit": "500",
})

print(f"=== CRON-HELSE SISTE 24T ===")
print(f"Totalt hendelser: {len(events)}")

jobs = {}
codes = {}
for e in events:
    job = e.get("job_name", "unknown")
    jobs[job] = jobs.get(job, 0) + 1
    sc = e.get("status_code")
    if sc is not None:
        codes[sc] = codes.get(sc, 0) + 1

print(f"\nPer jobb:")
for job, cnt in sorted(jobs.items(), key=lambda x: -x[1]):
    print(f"  {job}: {cnt}")

print(f"\nStatus-koder:")
for sc, cnt in sorted(codes.items()):
    print(f"  {sc}: {cnt}")

errs = [e for e in events if e.get("status_code") and e["status_code"] >= 400]
print(f"\nFeil (status >= 400): {len(errs)}")
if errs:
    print("Siste 5 feil:")
    for e in errs[:5]:
        print(f"  [{e.get('created')}] {e.get('job_name')} -> {e.get('status_code')}: {str(e.get('error_detail',''))[:120]}")

# Sjekk også nye hendelser ETTER 2026-07-30 15:20 UTC (når cron-helse ble satt opp)
post_fix = [e for e in events if e.get("created") and e["created"] >= "2026-07-30T15:20:00Z"]
post_fix_errs = [e for e in post_fix if e.get("status_code") and e["status_code"] >= 400]
print(f"\nHendelser etter 2026-07-30 15:20 UTC: {len(post_fix)}")
print(f"Feil etter fikstidspunkt: {len(post_fix_errs)}")
