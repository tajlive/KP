#!/usr/bin/env python3
"""
Fase 2-sanering: rekalkuler ærlig kapital for korrupte paper-sesjoner.

READ-ONLY mot prod. Produserer:
  1) supabase/migrations/20260727214000_phase2_recompute_sanering.sql (UTKAST)
  2) sanering-fase2-rapport.md (per-bruker-rapport for gjennomgang)

Regler (dokumentert for gjennomgang):
  - Korrupt sett: sold > bought*1.001 ELLER current_capital_nok > 2x initial.
  - Valuta: trades med usdt_nok_rate er NOK-denominerte; eldre uten rate er
    USDT og konverteres med sesjonens median-rate (fallback 9.6).
  - Replay: start = starting_capital_nok (>0) ellers initial_capital (>0)
    ellers 100 000. Kjøp debiterer total+fee. Salg krediteres kun
    min(solgt, beholdning) — samme invariant som Fase 1-triggeren.
  - P&L: FIFO mot faktiske lots. total_pnl = sum ærlig realisert P&L.
  - Negativ slutt-kapital floores til 0 (telles i rapporten).
  - initial_capital < 0 rettes til starting_capital_nok.
  - status røres ikke. Ingen brukerdata slettes — kun kapital/P&L/posisjon
    rekalkuleres, og hver endring logges til balance_sync_audit.
"""
import json
import statistics
import subprocess
import urllib.request
from collections import defaultdict

PROJECT = "pskhryjzkobytnfwucrb"
URL = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"
FALLBACK_RATE = 9.6

TOKEN = subprocess.run(
    ["bash", "-c", "grep SUPABASE_ACCESS_TOKEN ~/.zshrc | head -1 | sed 's/.*=//' | tr -d \"\\\"'\""],
    capture_output=True, text=True,
).stdout.strip()


def q(sql: str):
    payload = json.dumps({"query": sql})
    out = subprocess.run(
        [
            "curl", "-s", "-X", "POST", URL,
            "-H", f"Authorization: Bearer {TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        capture_output=True, text=True, timeout=120,
    )
    data = json.loads(out.stdout)
    if isinstance(data, dict) and "message" in data:
        raise RuntimeError(data["message"])
    return data


def num(v, default=0.0):
    try:
        f = float(v)
        return f if f == f else default  # NaN (Postgres 'NaN'::numeric) → default
    except (TypeError, ValueError):
        return default


# ─── 1. Hent korrupt sett ────────────────────────────────────────────────────
CORRUPT_SQL = """
WITH agg AS (
  SELECT session_id,
    SUM(CASE WHEN side='buy' THEN quantity ELSE 0 END) AS bought,
    SUM(CASE WHEN side='sell' THEN quantity ELSE 0 END) AS sold
  FROM trades WHERE mode='paper' GROUP BY session_id
)
SELECT ts.id, ts.user_id, ts.status, ts.strategy_id, ts.trading_pair,
       ts.initial_capital, ts.starting_capital_nok,
       ts.current_capital, ts.current_capital_nok, ts.total_pnl,
       ts.winning_trades, ts.losing_trades, ts.total_trades,
       ts.open_position, ts.started_at
FROM trading_sessions ts
LEFT JOIN agg a ON a.session_id = ts.id
WHERE ts.mode='paper'
  AND ((a.sold > a.bought*1.001) OR (ts.current_capital_nok > ts.initial_capital*2))
ORDER BY ts.user_id, ts.started_at;
"""

print("Henter korrupte sesjoner ...", flush=True)
sessions = q(CORRUPT_SQL)
print(f"  {len(sessions)} sesjoner")

user_ids = sorted({s["user_id"] for s in sessions})
emails = {}
for i in range(0, len(user_ids), 50):
    chunk = "','".join(user_ids[i : i + 50])
    rows = q(f"SELECT id, email FROM user_profiles WHERE id IN ('{chunk}');")
    emails.update({r["id"]: r.get("email") for r in rows})

# ─── 2. Hent alle trades for settet (chunket) ────────────────────────────────
print("Henter trades ...", flush=True)
session_ids = [s["id"] for s in sessions]
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
    print(f"  ... {min(i + 40, len(session_ids))}/{len(session_ids)} sesjoner", flush=True)

total_trades = sum(len(v) for v in trades_by_session.values())
print(f"  {total_trades} trades totalt")

# ─── 3. Replay per sesjon ────────────────────────────────────────────────────
results = []
floored_sessions = []
fallback_rate_sessions = []

for s in sessions:
    sid = s["id"]
    trades = trades_by_session.get(sid, [])

    rates = [num(t["usdt_nok_rate"]) for t in trades if t.get("usdt_nok_rate")]
    rate = statistics.median(rates) if rates else FALLBACK_RATE
    if not rates:
        fallback_rate_sessions.append(sid)

    start = num(s["starting_capital_nok"])
    if start <= 0:
        start = num(s["initial_capital"])
    if start <= 0:
        start = 100000.0

    capital = start
    lots = []  # [qty, unit_price_nok, executed_at]
    total_pnl = 0.0
    wins = 0
    losses = 0

    for t in trades:
        side = t["side"]
        qty = num(t["quantity"])
        is_nok = t.get("usdt_nok_rate") is not None
        conv = 1.0 if is_nok else rate
        total_value_nok = num(t["total_value"]) * conv
        fee_nok = num(t["fee"]) * conv
        if qty <= 0:
            continue

        if side == "buy":
            capital -= total_value_nok + fee_nok
            lots.append([qty, total_value_nok / qty, t["executed_at"]])
        else:  # sell — clamp til beholdning (Fase 1-invariant)
            held = sum(l[0] for l in lots)
            eff = min(qty, held)
            if eff <= 0:
                continue
            unit_price = total_value_nok / qty
            fee_eff = fee_nok * (eff / qty)
            capital += unit_price * eff - fee_eff
            remaining = eff
            cost = 0.0
            while remaining > 1e-12 and lots:
                lot = lots[0]
                take = min(lot[0], remaining)
                cost += take * lot[1]
                lot[0] -= take
                remaining -= take
                if lot[0] <= 1e-12:
                    lots.pop(0)
            trade_pnl = unit_price * eff - cost - fee_eff
            total_pnl += trade_pnl
            if trade_pnl > 0:
                wins += 1
            elif trade_pnl < 0:
                losses += 1

    was_negative = capital < 0
    if was_negative:
        floored_sessions.append(sid)
        capital = 0.0

    # Posisjon fra gjenværende lots (NOK, samme shape som triggeren skriver)
    position = None
    held_qty = sum(l[0] for l in lots)
    if held_qty > 1e-12:
        wavg = sum(l[0] * l[1] for l in lots) / held_qty
        position = {
            "side": "long",
            "quantity": round(held_qty, 10),
            "entry_price": round(wavg, 8),
            "entry_time": lots[0][2],
            "highest_price": round(max(l[1] for l in lots), 8),
        }

    initial_fixed = num(s["initial_capital"])
    if initial_fixed < 0:
        initial_fixed = start  # starting_capital_nok (10 000 for begge i prod)

    results.append(
        {
            "id": sid,
            "user_id": s["user_id"],
            "status": s["status"],
            "strategy_id": s["strategy_id"],
            "old_capital_nok": num(s["current_capital_nok"]),
            "new_capital": round(capital, 2),
            "old_pnl": num(s["total_pnl"]),
            "new_pnl": round(total_pnl, 2),
            "wins": wins,
            "losses": losses,
            "n_trades": len(trades),
            "position": position,
            "initial_fixed": round(initial_fixed, 2),
            "start": round(start, 2),
            "was_negative_floored": was_negative,
            "email": emails.get(s["user_id"]),
        }
    )

# ─── 4. Rapport ──────────────────────────────────────────────────────────────
by_user = defaultdict(list)
for r in results:
    by_user[r["user_id"]].append(r)

lines = []
lines.append("# Fase 2-sanering — per-bruker-rapport (UTKAST, ingenting kjørt)")
lines.append("")
lines.append(f"Generert: 2026-07-27 · Korrupte sesjoner: **{len(results)}** · Brukere: **{len(by_user)}** · Trades replayet: **{total_trades}**")
lines.append("")
lines.append("Regler: start = `starting_capital_nok`; salg clampet til beholdning (Fase 1-invariant); FIFO-P&L; valuta via `usdt_nok_rate` (USDT-æra konvertert m/ sesjon-median).")
lines.append("")
lines.append("| Bruker | Sesjoner | Gammel Σ kapital (NOK) | Ny Σ kapital (NOK) | Endring |")
lines.append("|---|---|---|---|---|")

tot_old = 0.0
tot_new = 0.0
for uid, rows in sorted(by_user.items(), key=lambda kv: -sum(r["old_capital_nok"] for r in kv[1])):
    old_sum = sum(r["old_capital_nok"] for r in rows)
    new_sum = sum(r["new_capital"] for r in rows)
    tot_old += old_sum
    tot_new += new_sum
    label = rows[0]["email"] or f"(profil-løs {uid[:8]}…)"
    lines.append(f"| {label} | {len(rows)} | {old_sum:,.0f} | {new_sum:,.0f} | {new_sum - old_sum:,.0f} |")

lines.append(f"| **TOTALT** | **{len(results)}** | **{tot_old:,.0f}** | **{tot_new:,.0f}** | **{tot_new - tot_old:,.0f}** |")
lines.append("")
lines.append(f"Sesjoner floored fra negativ kapital til 0: **{len(floored_sessions)}**")
lines.append(f"Sesjoner uten rate-data (fallback {FALLBACK_RATE}): **{len(fallback_rate_sessions)}**")
lines.append("")
lines.append("## Største enkelt-endringer")
lines.append("")
lines.append("| Sesjon | Bruker | Status | Gammel kapital | Ny kapital | Gammel P&L | Ny P&L | Trades |")
lines.append("|---|---|---|---|---|---|---|---|")
for r in sorted(results, key=lambda r: -(r["old_capital_nok"] - r["new_capital"]))[:15]:
    label = (r["email"] or r["user_id"][:8] + "…")
    lines.append(
        f"| `{r['id'][:8]}…` ({r['strategy_id']}) | {label} | {r['status']} | {r['old_capital_nok']:,.0f} | {r['new_capital']:,.0f} | {r['old_pnl']:,.0f} | {r['new_pnl']:,.0f} | {r['n_trades']} |"
    )
lines.append("")

with open("/Users/taj/klarpakke/sanering-fase2-rapport.md", "w") as f:
    f.write("\n".join(lines))

# ─── 5. SQL-migrasjon (UTKAST) ───────────────────────────────────────────────
def sql_lit(v):
    if v is None:
        return "NULL"
    return str(v)

values_rows = []
audit_rows = []
for r in results:
    pos_sql = "NULL" if r["position"] is None else "'" + json.dumps(r["position"]).replace("'", "''") + "'::jsonb"
    values_rows.append(
        f"  ('{r['id']}', {r['new_capital']}, {r['new_capital']}, {r['new_pnl']}, {r['wins']}, {r['losses']}, {r['initial_fixed']}, {pos_sql})"
    )
    details = json.dumps(
        {
            "old_capital_nok": r["old_capital_nok"],
            "new_capital_nok": r["new_capital"],
            "old_pnl": r["old_pnl"],
            "new_pnl": r["new_pnl"],
            "trades_replayed": r["n_trades"],
            "floored_from_negative": r["was_negative_floored"],
            "start_capital": r["start"],
        }
    ).replace("'", "''")
    audit_rows.append(
        f"  ('{r['user_id']}', 'phase2_recompute', 'ok', '{details}'::jsonb)"
    )

migration = f"""-- ============================================================================
-- 20260727214000: FASE 2 data-sanering — rekalkulert kapital for 388 korrupte
-- paper-sesjoner (UTKAST — krever Toms godkjenning før apply)
--
-- Metode: deterministisk trade-replay (scripts/phase2-sanering-recompute.py)
-- med samme invariant som Fase 1-triggeren: salg krediteres kun
-- min(solgt, beholdning). Verdiene under er FERDIGREGNET og reviewbare —
-- ingen prosedyre kjøres i databasen.
-- Rapport: sanering-fase2-rapport.md (per-bruker før/etter).
--
-- Totalt: {len(results)} sesjoner · gammel Σ {tot_old:,.0f} NOK → ny Σ {tot_new:,.0f} NOK
-- ({tot_new - tot_old:,.0f} NOK fantom-verdi fjernes).
--
-- status røres ikke. Ingen trades slettes. Hver sesjon logges til
-- balance_sync_audit med gamle/nye verdier (check_type='phase2_recompute').
-- Idempotent: WHERE-guard gjør re-kjøring til no-op.
-- ============================================================================

BEGIN;

-- Tillat nye audit-typer (Fase 1 + Fase 2). Additivt: eksisterende rader
-- berøres ikke. Fase 1-triggerne INSERTer disse typene — uten denne
-- utvidelsen ville CHECK-constrainten fått selve trade-INSERTen til å feile.
ALTER TABLE public.balance_sync_audit
  DROP CONSTRAINT IF EXISTS balance_sync_audit_check_type_check;
ALTER TABLE public.balance_sync_audit
  ADD CONSTRAINT balance_sync_audit_check_type_check
  CHECK (check_type = ANY (ARRAY[
    'balance_mismatch'::text,
    'autopilot_health'::text,
    'bot_count'::text,
    'sell_oversell_clamped'::text,
    'pnl_skipped_implausible_basis'::text,
    'phase2_recompute'::text
  ]));

UPDATE public.trading_sessions ts
SET
  current_capital = v.capital,
  current_capital_nok = v.capital_nok,
  total_pnl = v.pnl,
  winning_trades = v.wins,
  losing_trades = v.losses,
  initial_capital = v.initial_capital,
  open_position = v.open_position,
  updated_at = now()
FROM (VALUES
{",\n".join(values_rows)}
) AS v(id, capital, capital_nok, pnl, wins, losses, initial_capital, open_position)
WHERE ts.id = v.id::uuid
  AND ts.mode = 'paper'
  AND (
       ts.current_capital_nok IS DISTINCT FROM v.capital_nok
    OR ts.total_pnl IS DISTINCT FROM v.pnl
    OR ts.initial_capital IS DISTINCT FROM v.initial_capital
  );

INSERT INTO public.balance_sync_audit (user_id, check_type, status, details)
VALUES
{",\n".join(audit_rows)};

COMMIT;

-- VERIFIKASJON etter apply:
-- SELECT count(*) FROM trading_sessions WHERE mode='paper'
--   AND current_capital_nok > initial_capital * 2;  -- forventet ~0
-- SELECT count(*) FROM balance_sync_audit WHERE check_type='phase2_recompute'; -- {len(results)}
"""

with open("/Users/taj/klarpakke/supabase/migrations/20260727214000_phase2_recompute_sanering.sql", "w") as f:
    f.write(migration)

print()
print(f"Korrupte sesjoner: {len(results)}")
print(f"Gammel Σ kapital: {tot_old:,.0f} NOK")
print(f"Ny Σ kapital:     {tot_new:,.0f} NOK")
print(f"Fantom fjernet:   {tot_new - tot_old:,.0f} NOK")
print(f"Floored fra negativ: {len(floored_sessions)} · fallback-rate: {len(fallback_rate_sessions)}")
print("Skrev: sanering-fase2-rapport.md + supabase/migrations/20260727214000_phase2_recompute_sanering.sql")
