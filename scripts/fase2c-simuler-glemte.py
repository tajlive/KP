#!/usr/bin/env python3
"""Fase 2c + Fase 3 — SIMULERING (read-only, ingen skriving).

Bakgrunn:
- Fase 2 recomputet 388 sesjoner, men utvelgelsen brukte
  `current_capital_nok > initial_capital * 2`. Sesjoner der initial_capital
  (USDT-kolonnen) selv var blåst opp slapp gjennom.
- Dette skriptet finner gjenstående sesjoner med inflasjonssignatur
  (solgt > kjøpt ELLER kapital > 2× starting_capital_nok) uten Fase 2-audit,
  replayer dem med EKSAKT samme logikk som Fase 2, og viser gammel → ny verdi.
- Deretter beregnes Fase 3-kandidater for paper_accounts.current_balance
  per bruker (tre modeller), slik at produktbeslutningen kan tas på fakta.

Kjør: python3 scripts/fase2c-simuler-glemte.py
"""
import json
import statistics
import subprocess
from collections import defaultdict

TOKEN_CMD = "grep SUPABASE_ACCESS_TOKEN ~/.zshrc | head -1 | sed 's/.*=//' | tr -d \"\\\"'\""
FALLBACK_RATE = 10.5


def q(sql: str):
    token = subprocess.check_output(["bash", "-lc", TOKEN_CMD], text=True).strip()
    payload = json.dumps({"query": sql})
    out = subprocess.check_output(
        [
            "curl", "-s", "-X", "POST",
            "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/database/query",
            "-H", f"Authorization: Bearer {token}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        text=True,
    )
    data = json.loads(out)
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(data)
    return data


def num(v, default=0.0):
    try:
        f = float(v)
        return f if f == f else default
    except (TypeError, ValueError):
        return default


# ─── 1. Finn glemte sesjoner (ingen Fase 2-audit, inflasjonssignatur) ────────
print("Finner glemte sesjoner ...", flush=True)
MISSED_SQL = """
WITH agg AS (
  SELECT session_id,
    SUM(CASE WHEN side='buy' THEN quantity ELSE 0 END) AS bought,
    SUM(CASE WHEN side='sell' THEN quantity ELSE 0 END) AS sold
  FROM trades WHERE mode='paper' GROUP BY session_id
), audited AS (
  SELECT DISTINCT details->>'session_id' AS sid
  FROM balance_sync_audit WHERE check_type='phase2_recompute'
)
SELECT ts.id, ts.user_id, ts.status, ts.strategy_id, ts.trading_pair,
       ts.initial_capital, ts.starting_capital_nok,
       ts.current_capital, ts.current_capital_nok, ts.total_pnl,
       ts.total_trades, ts.open_position, ts.started_at
FROM trading_sessions ts
LEFT JOIN agg a ON a.session_id = ts.id
LEFT JOIN audited au ON au.sid = ts.id::text
WHERE ts.mode='paper'
  AND au.sid IS NULL
  AND COALESCE(ts.starting_capital_nok, 0) > 0
  AND ((a.sold > a.bought*1.001)
       OR (ts.current_capital_nok > ts.starting_capital_nok*2))
ORDER BY ts.user_id, ts.started_at;
"""
missed = q(MISSED_SQL)
print(f"  {len(missed)} glemte sesjoner")

# ─── 2. Hent trades og replay (samme logikk som Fase 2) ──────────────────────
session_ids = [s["id"] for s in missed]
trades_by_session = defaultdict(list)
for i in range(0, len(session_ids), 40):
    chunk = "','".join(session_ids[i : i + 40])
    rows = q(
        "SELECT session_id, side, quantity, price, total_value, fee, "
        "realized_pnl, usdt_nok_rate, executed_at "
        f"FROM trades WHERE mode='paper' AND session_id IN ('{chunk}') "
        "ORDER BY session_id, executed_at ASC;"
    )
    for r in rows:
        trades_by_session[r["session_id"]].append(r)

print(f"  {sum(len(v) for v in trades_by_session.values())} trades hentet", flush=True)

sim = {}  # session_id -> ny kapital
report_rows = []
for s in missed:
    sid = s["id"]
    trades = trades_by_session.get(sid, [])
    rates = [num(t["usdt_nok_rate"]) for t in trades if t.get("usdt_nok_rate")]
    rate = statistics.median(rates) if rates else FALLBACK_RATE

    start = num(s["starting_capital_nok"]) or num(s["initial_capital"]) or 100000.0
    capital = start
    lots = []
    total_pnl = 0.0
    for t in trades:
        qty = num(t["quantity"])
        if qty <= 0:
            continue
        conv = 1.0 if t.get("usdt_nok_rate") is not None else rate
        tv = num(t["total_value"]) * conv
        fee = num(t["fee"]) * conv
        if t["side"] == "buy":
            capital -= tv + fee
            lots.append([qty, tv / qty])
        else:
            held = sum(l[0] for l in lots)
            eff = min(qty, held)
            if eff <= 0:
                continue
            unit = tv / qty
            fee_eff = fee * (eff / qty)
            capital += unit * eff - fee_eff
            remaining, cost = eff, 0.0
            while remaining > 1e-12 and lots:
                lot = lots[0]
                take = min(lot[0], remaining)
                cost += take * lot[1]
                lot[0] -= take
                remaining -= take
                if lot[0] <= 1e-12:
                    lots.pop(0)
            total_pnl += unit * eff - cost - fee_eff
    if capital < 0:
        capital = 0.0
    sim[sid] = round(capital, 2)
    report_rows.append(
        {
            "user_id": s["user_id"],
            "id": sid,
            "status": s["status"],
            "trades": len(trades),
            "start": round(start, 2),
            "old": num(s["current_capital_nok"]),
            "new": round(capital, 2),
        }
    )

# ─── 3. Fase 3: paper_accounts-kandidater per bruker ─────────────────────────
print("Beregner Fase 3-kandidater ...", flush=True)
users = sorted({r["user_id"] for r in report_rows})
accounts = {}
for i in range(0, len(users), 50):
    chunk = "','".join(users[i : i + 50])
    for r in q(
        f"SELECT user_id, initial_balance, current_balance FROM paper_accounts WHERE user_id IN ('{chunk}');"
    ):
        accounts[r["user_id"]] = r

# Alle sesjoner for disse brukerne (prod-verdier; glemte erstattes av sim)
all_sessions = []
for i in range(0, len(users), 50):
    chunk = "','".join(users[i : i + 50])
    all_sessions += q(
        "SELECT id, user_id, status, current_capital_nok, starting_capital_nok "
        f"FROM trading_sessions WHERE mode='paper' AND user_id IN ('{chunk}');"
    )

per_user = defaultdict(lambda: {"aktive_kap": 0.0, "aktive_start": 0.0, "stoppet_kap": 0.0, "stoppet_start": 0.0})
for s in all_sessions:
    u = per_user[s["user_id"]]
    kap = sim.get(s["id"], num(s["current_capital_nok"]))
    start = num(s["starting_capital_nok"])
    if s["status"] == "active":
        u["aktive_kap"] += kap
        u["aktive_start"] += start
    else:
        u["stoppet_kap"] += kap
        u["stoppet_start"] += start

# ─── 4. Rapport ──────────────────────────────────────────────────────────────
print("\n## Fase 2c — glemte sesjoner (simulert recompute)\n")
print("| bruker | sesjon | status | trades | start | gammel kapital | **ny kapital** |")
print("|---|---|---|---|---|---|---|")
for r in sorted(report_rows, key=lambda x: x["old"] - x["new"], reverse=True):
    print(
        f"| {r['user_id'][:8]}… | {r['id'][:8]}… | {r['status']} | {r['trades']} "
        f"| {r['start']:,.0f} | {r['old']:,.0f} | **{r['new']:,.0f}** |"
    )
tot_old = sum(r["old"] for r in report_rows)
tot_new = sum(r["new"] for r in report_rows)
print(f"| **SUM** |  |  |  |  | {tot_old:,.0f} | **{tot_new:,.0f}** |")

print("\n## Fase 3 — paper_accounts.current_balance-kandidater (kun berørte brukere)\n")
print("| bruker | konto nå | konto start | M1 uallokert (start−aktiv start) | M2 formue (start+P&L alle) | M3 aktiv sesjon |")
print("|---|---|---|---|---|---|")
for uid in users:
    acc = accounts.get(uid) or {}
    start = num(acc.get("initial_balance"), 100000.0)
    now = num(acc.get("current_balance"))
    u = per_user[uid]
    m1 = start - u["aktive_start"]
    m2 = start + (u["aktive_kap"] - u["aktive_start"]) + (u["stoppet_kap"] - u["stoppet_start"])
    m3 = u["aktive_kap"]
    print(
        f"| {uid[:8]}… | {now:,.0f} | {start:,.0f} | {m1:,.0f} | {m2:,.0f} | {m3:,.0f} |"
    )

print("\nFerdig — INGEN data er endret (read-only simulering).")
