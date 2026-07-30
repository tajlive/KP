#!/usr/bin/env python3
"""Analyse av paper-trades: Tom vs alle brukere."""
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

SCRATCH = Path(__file__).parent

def parse_dt(s):
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))

def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

def fifo_match(trades):
    """Match buy->sell per (session_id, trading_pair) med FIFO. Returner lukkede handler."""
    closed = []
    lots = defaultdict(list)  # key -> list of [qty, price, dt, fee]
    open_buys = []
    for t in trades:
        key = (t.get("session_id"), t.get("trading_pair"))
        qty = f(t.get("quantity")) or 0
        price = f(t.get("price")) or 0
        fee = f(t.get("fee")) or 0
        dt = parse_dt(t.get("executed_at")) or parse_dt(t.get("created_at"))
        side = (t.get("side") or "").lower()
        if side == "buy":
            lots[key].append([qty, price, dt, fee])
            open_buys.append(t)
        elif side == "sell":
            remaining = qty
            while remaining > 1e-12 and lots[key]:
                lot = lots[key][0]
                take = min(lot[0], remaining)
                pnl = (price - lot[1]) * take - fee * (take / qty if qty else 0) - lot[3] * (take / lot[0] if lot[0] else 0)
                hold_h = (dt - lot[2]).total_seconds() / 3600 if dt and lot[2] else None
                closed.append({
                    "pair": t.get("trading_pair"),
                    "session_id": t.get("session_id"),
                    "qty": take,
                    "buy_price": lot[1],
                    "sell_price": price,
                    "pnl": pnl,
                    "hold_hours": hold_h,
                    "sell_dt": dt,
                    "buy_dt": lot[2],
                    "strategy": (t.get("strategy_signal") or {}).get("strategy") if isinstance(t.get("strategy_signal"), dict) else None,
                })
                lot[0] -= take
                remaining -= take
                if lot[0] <= 1e-12:
                    lots[key].pop(0)
    return closed, open_buys

def summarize(closed, label):
    if not closed:
        print(f"\n=== {label}: ingen lukkede handler ===")
        return {}
    wins = [c for c in closed if c["pnl"] > 0]
    losses = [c for c in closed if c["pnl"] <= 0]
    total_pnl = sum(c["pnl"] for c in closed)
    gross_win = sum(c["pnl"] for c in wins)
    gross_loss = abs(sum(c["pnl"] for c in losses))
    holds = [c["hold_hours"] for c in closed if c["hold_hours"] is not None]
    avg_hold = sum(holds) / len(holds) if holds else 0
    win_holds = [c["hold_hours"] for c in wins if c["hold_hours"] is not None]
    loss_holds = [c["hold_hours"] for c in losses if c["hold_hours"] is not None]
    print(f"\n=== {label} ===")
    print(f"Lukkede handler: {len(closed)} | Win-rate: {len(wins)/len(closed)*100:.1f}% | Totalt PnL: {total_pnl:,.2f}")
    print(f"Profit factor: {(gross_win/gross_loss if gross_loss else float('inf')):.2f} | Snitt gevinst: {(gross_win/len(wins) if wins else 0):,.2f} | Snitt tap: {(gross_loss/len(losses) if losses else 0):,.2f}")
    print(f"Snitt holdetid: {avg_hold:.1f}t | vinnere: {(sum(win_holds)/len(win_holds) if win_holds else 0):.1f}t | tapere: {(sum(loss_holds)/len(loss_holds) if loss_holds else 0):.1f}t")

    # Per par
    by_pair = defaultdict(list)
    for c in closed:
        by_pair[c["pair"]].append(c)
    print("\nPer par (sortert på PnL):")
    print(f"{'Par':<16}{'Handler':>8}{'Win%':>7}{'PnL':>14}{'SnittPnL':>12}{'SnittHold(t)':>13}")
    pair_rows = []
    for pair, cs in sorted(by_pair.items(), key=lambda kv: sum(c['pnl'] for c in kv[1])):
        pnl = sum(c["pnl"] for c in cs)
        wr = sum(1 for c in cs if c["pnl"] > 0) / len(cs) * 100
        hs = [c["hold_hours"] for c in cs if c["hold_hours"] is not None]
        ah = sum(hs)/len(hs) if hs else 0
        print(f"{pair:<16}{len(cs):>8}{wr:>6.0f}%{pnl:>14,.2f}{pnl/len(cs):>12,.2f}{ah:>13.1f}")
        pair_rows.append({"pair": pair, "n": len(cs), "win_rate": wr, "pnl": pnl, "avg_hold": ah})

    # Time/dag-mønster
    by_hour = defaultdict(list)
    by_dow = defaultdict(list)
    for c in closed:
        if c["buy_dt"]:
            by_hour[c["buy_dt"].hour].append(c)
            by_dow[c["buy_dt"].strftime("%a")].append(c)
    print("\nPnL per time på døgnet (kjøpstidspunkt, UTC):")
    for h in sorted(by_hour):
        cs = by_hour[h]
        print(f"  {h:02d}:00  n={len(cs):<4} PnL={sum(c['pnl'] for c in cs):>12,.2f}  win%={sum(1 for c in cs if c['pnl']>0)/len(cs)*100:.0f}")
    print("\nPnL per ukedag:")
    for d in ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]:
        if d in by_dow:
            cs = by_dow[d]
            print(f"  {d}  n={len(cs):<4} PnL={sum(c['pnl'] for c in cs):>12,.2f}  win%={sum(1 for c in cs if c['pnl']>0)/len(cs)*100:.0f}")

    # Holdetid-bøtter
    buckets = [(0,1,"<1t"),(1,4,"1-4t"),(4,24,"4-24t"),(24,72,"1-3d"),(72,168,"3-7d"),(168,10**9,">7d")]
    print("\nPnL per holdetid:")
    for lo, hi, lbl in buckets:
        cs = [c for c in closed if c["hold_hours"] is not None and lo <= c["hold_hours"] < hi]
        if cs:
            print(f"  {lbl:<6} n={len(cs):<4} PnL={sum(c['pnl'] for c in cs):>12,.2f}  win%={sum(1 for c in cs if c['pnl']>0)/len(cs)*100:.0f}")
    return {"total_pnl": total_pnl, "n": len(closed), "win_rate": len(wins)/len(closed)*100, "pairs": pair_rows}

# --- Last data ---
tom = json.loads((SCRATCH / "tom-trades-raw.json").read_text())
alld = json.loads((SCRATCH / "all-trades-raw.json").read_text())

tom_trades = sorted(tom["trades"], key=lambda t: t.get("executed_at") or "")
all_trades = sorted(alld["allTrades"], key=lambda t: t.get("executed_at") or "")

# Konto & sesjoner
print("=== KONTO (Tom) ===")
for a in tom["accounts"]:
    print({k: a.get(k) for k in ("id","current_balance","starting_balance","currency","created_at","updated_at")})
prof = tom["profile"][0] if tom["profile"] else {}
print("Profil:", {k: prof.get(k) for k in ("display_name","tier","paper_balance","default_risk_level")})

sessions = tom["sessions"]
print(f"\nSesjoner: {len(sessions)} totalt")
mode_count = defaultdict(int)
strat_count = defaultdict(int)
arch = 0
for s in sessions:
    mode_count[s.get("mode")] += 1
    strat_count[s.get("strategy")] += 1
    if s.get("archived"):
        arch += 1
print("Modes:", dict(mode_count))
print("Strategier:", dict(strat_count))
print(f"Arkivert: {arch}")

# Rå trade-statistikk
print(f"\nRå trades: {len(tom_trades)}")
sides = defaultdict(int)
status = defaultdict(int)
for t in tom_trades:
    sides[t.get("side")] += 1
    status[t.get("status")] += 1
print("Sider:", dict(sides), "| Status:", dict(status))
fees = sum(f(t.get("fee")) or 0 for t in tom_trades)
print(f"Totale gebyrer: {fees:,.2f}")
if tom_trades:
    print("Første trade:", tom_trades[0].get("executed_at"), "| Siste:", tom_trades[-1].get("executed_at"))

closed_tom, open_tom = fifo_match(tom_trades)
print(f"\nÅpne (umatchede) kjøp: {len(open_tom)}")
open_val = sum((f(t.get("quantity")) or 0) * (f(t.get("price")) or 0) for t in open_tom)
print(f"Verdi åpne posisjoner (kostbasis): {open_val:,.2f}")
by_pair_open = defaultdict(float)
for t in open_tom:
    by_pair_open[t.get("trading_pair")] += (f(t.get("quantity")) or 0) * (f(t.get("price")) or 0)
for p, v in sorted(by_pair_open.items(), key=lambda kv: -kv[1]):
    print(f"  {p}: {v:,.2f}")

res_tom = summarize(closed_tom, "TOM — lukkede handler")

# --- Alle brukere ---
closed_all, _ = fifo_match(all_trades)
res_all = summarize(closed_all, "ALLE BRUKERE — lukkede handler")

# Per bruker (alle)
by_user = defaultdict(list)
for t in all_trades:
    by_user[t.get("user_id")].append(t)
print("\n=== PER BRUKER (alle, sortert på lukket PnL) ===")
print(f"{'Bruker':<38}{'Trades':>7}{'Lukket':>7}{'Win%':>6}{'PnL':>14}")
rows = []
for uid, ts in by_user.items():
    cl, _ = fifo_match(ts)
    if not cl:
        continue
    pnl = sum(c["pnl"] for c in cl)
    wr = sum(1 for c in cl if c["pnl"] > 0)/len(cl)*100
    rows.append((uid, len(ts), len(cl), wr, pnl))
for uid, n, nc, wr, pnl in sorted(rows, key=lambda r: r[4]):
    mark = " <-- TOM" if uid == tom["userId"] else ""
    print(f"{uid:<38}{n:>7}{nc:>7}{wr:>5.0f}%{pnl:>14,.2f}{mark}")

# Strategi på tvers av alle (fra strategy_signal)
by_strat = defaultdict(list)
for c in closed_all:
    by_strat[c.get("strategy") or "ukjent"].append(c)
print("\n=== STRATEGI (alle brukere, fra strategy_signal) ===")
for s, cs in sorted(by_strat.items(), key=lambda kv: sum(c['pnl'] for c in kv[1])):
    pnl = sum(c["pnl"] for c in cs)
    wr = sum(1 for c in cs if c["pnl"] > 0)/len(cs)*100
    print(f"  {s:<25} n={len(cs):<5} PnL={pnl:>14,.2f}  win%={wr:.0f}")

(json_out := SCRATCH / "analysis-result.json").write_text(json.dumps({"tom": res_tom, "all": {"total_pnl": res_all.get("total_pnl"), "n": res_all.get("n"), "win_rate": res_all.get("win_rate")}}, indent=2, default=str))
print("\nOK")
