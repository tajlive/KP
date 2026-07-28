#!/usr/bin/env python3
"""KLARPAKKE Trade-helse -> Widget-artifact (selvhelbredende).

1. Kjører scripts/trade-quality-monitor.mjs --apply (auto-fiks m/ backup).
2. Kjører deretter dry-run for post-fiks-status.
3. Beregner win-rate per par siste 30 dager via Supabase REST og emitter
   ett artifact som matcher Widget slots.main.
"""
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

REPO = "/Users/taj/klarpakke"
SERVICE_KEY = ""


def load_env():
    env = {}
    for name in (".env.local", ".env"):
        path = os.path.join(REPO, name)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def run_monitor(apply=False):
    args = ["node", "scripts/trade-quality-monitor.mjs"]
    if apply:
        args.append("--apply")
    proc = subprocess.run(
        args,
        cwd=REPO, capture_output=True, text=True, timeout=300,
    )
    out = proc.stdout or ""
    # dotenv tip-linjer inneholder "{ override: true }" - finn foerste linje
    # som starter med "{" i kolonne 0 (starten paa selve rapporten).
    start = -1
    for match in (__import__("re").finditer(r"(?m)^\{", out)):
        start = match.start()
        break
    if start < 0:
        raise RuntimeError("monitor ga ikke JSON: %s" % (proc.stderr or out)[:300])
    report, _ = json.JSONDecoder().raw_decode(out[start:])
    return report


def supabase_get(env, path, offset=0):
    url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path
    req = urllib.request.Request(url, headers={
        "apikey": env["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": "Bearer " + env["SUPABASE_SERVICE_ROLE_KEY"],
        "Range-Unit": "items",
        "Range": "%d-%d" % (offset, offset + 999),
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def win_rates_30d(env):
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    query = ("trades?select=trading_pair,realized_pnl"
             "&realized_pnl=not.is.null&executed_at=gte." + urllib.parse.quote(since))
    rows, offset = [], 0
    while True:
        batch = supabase_get(env, query, offset)
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    agg = {}
    for row in rows:
        pair = row.get("trading_pair") or "UKJENT"
        pnl = row.get("realized_pnl")
        if pnl is None:
            continue
        bucket = agg.setdefault(pair, [0, 0])
        bucket[1] += 1
        if float(pnl) > 0:
            bucket[0] += 1
    result = [
        {"pair": pair, "winRate": round(wins / closed, 4), "closed": closed}
        for pair, (wins, closed) in agg.items() if closed >= 3
    ]
    result.sort(key=lambda item: -item["closed"])
    return result[:6]


def empty_artifact(warning):
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "health": "issues",
        "openIssues": 0,
        "stats": {
            "mockRows": 0, "usdtRows": 0, "ambiguousRows": 0,
            "usersOverSessionLimit": 0, "balanceDriftUsers": 0,
            "tradesLast7d": 0, "totalSessions": 0,
        },
        "winRates30d": [],
        "warnings": [warning],
    }


def build_artifact():
    # 1. Selvhelbredende: kjoer monitor MED auto-fiks foerst (tar backup av
    #    alt som slettes/konverteres til backups/trade-monitor/).
    auto_fixes = []
    try:
        applied = run_monitor(apply=True)
        fixes = applied.get("fixes", {})
        if fixes:
            auto_fixes.append(
                "AUTO-FIKS: " + ", ".join("%s=%s" % (k, v) for k, v in fixes.items())
            )
    except Exception as exc:
        auto_fixes.append("auto-fiks feilet: %s" % exc)

    # 2. Deretter dry-run for aerlig post-fiks-status til widgeten.
    try:
        report = run_monitor(apply=False)
    except Exception as exc:
        return empty_artifact("monitor feilet: %s" % exc)

    stats = report.get("stats", {})
    warnings = auto_fixes + list(report.get("warnings", []))

    win_rates = []
    try:
        win_rates = win_rates_30d(load_env())
    except Exception as exc:
        warnings.append("win-rate utilgjengelig: %s" % exc)

    open_issues = (
        stats.get("is_mock_rows", 0)
        + stats.get("usdt_rows_found", 0)
        + stats.get("users_over_session_limit", 0)
        + stats.get("balance_drift_users", 0)
    )
    return {
        "generatedAt": report.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "health": "clean" if open_issues == 0 else "issues",
        "openIssues": open_issues,
        "stats": {
            "mockRows": stats.get("is_mock_rows", 0),
            "usdtRows": stats.get("usdt_rows_found", 0),
            "ambiguousRows": stats.get("ambiguous_rows", 0),
            "usersOverSessionLimit": stats.get("users_over_session_limit", 0),
            "balanceDriftUsers": stats.get("balance_drift_users", 0),
            "tradesLast7d": stats.get("trades_last_7d", 0),
            "totalSessions": stats.get("total_sessions", 0),
        },
        "winRates30d": win_rates,
        "warnings": warnings,
    }


def run(ctx):
    """Managed Python runner-entrypoint (Blueprint code Automation)."""
    return {"artifact": build_artifact()}


def main():
    json.load(sys.stdin)  # lokal test: les request fra stdin
    print(json.dumps(run(None)))


if __name__ == "__main__":
    main()
