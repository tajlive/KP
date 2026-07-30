#!/usr/bin/env python3
"""Valuta-normalisert analyse: konverter alt til NOK via usdt_nok_rate, så FIFO."""
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SCRATCH = Path(__file__).parent
DEFAULT_RATE = 9.75

def parse_dt(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None

def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

# Grov USD-pris-referanse for å detektere valuta per trade
USD_REF = {"BTC": 65000, "ETH": 3200, "SOL": 150, "BNB": 580, "XRP": 0.55, "DOGE": 0.12, "AVAX": 28, "DOT": 6, "ADA": 0.45}

def base_symbol(pair):
    p = (pair or "").upper().replace("/", "")
    for s in ("USDT", "NOK", "USD"):
        if p.endswith(s):
            return p[: -len(s)]
    return p

def detect_and_normalize(t):
    """Returner (price_nok, valuta)."""
    pair = t.get("trading_pair") or ""
    price = f(t.get("price")) or 0
    base = base_symbol(pair)
    ref = USD_REF.get(base)
    rate = f(t.get("usdt_nok_rate")) or DEFAULT_RATE
    if pair.upper().endswith("NOK"):
        return price, "NOK-par"
    if not ref:
        return price, "ukjent"
    # Hvis prisen er nær USD-referansen -> USDT; nær USD*rate -> NOK
    if price < ref * 3:  # klart nærmere USDT-nivå
        return price * rate, "USDT->NOK"
    return price, "NOK"

def analyze(trades, label):
    trades = sorted(trades, key=lambda t: t.get("executed_at") or "")
    cur_count = defaultdict(int)
    lots = defaultdict(list)
    closed = []
    for t in trades:
        pair = t.get("trading_pair")
        qty = f(t.get("quantity")) or 0
        fee = f(t.get("fee")) or 0
        dt = parse_dt(t.get("executed_at"))
        price_nok, cur = detect_and_normalize(t)
        cur_count[cur] += 1
        side = (t.get("side") or "").lower()
        if side == "buy":
            lots[pair].append([qty, price_nok, dt])
        elif side == "sell":
            remaining = qty
            while remaining > 1e-12 and lots[pair]:
                lot = lots[pair][0]
                take = min(lot[0], remaining)
                pnl = (price_nok - lot[1]) * take
                hold = (dt - lot[2]).total_seconds() / 3600 if dt and lot[2] else None
                closed.append({"pair": pair, "pnl": pnl, "hold": hold, "sell_dt": dt, "qty": take, "value": price_nok * take})
                lot[0] -= take
                remaining -= take
                if lot[0] <= 1e-12:
                    lots[pair].pop(0)
    print(f"\n=== {label} (NOK-normalisert) ===")
    print("Valutadeteksjon:", dict(cur_count))
    if not closed:
        print("Ingen lukkede handler")
        return None
    wins = [c for c in closed if c["pnl"] > 0]
    losses = [c for c in closed if c["pnl"] <= 0]
    pnl = sum(c["pnl"] for c in closed)
    gw = sum(c["pnl"] for c in wins)
    gl = abs(sum(c["pnl"] for c in losses))
    holds = [c["hold"] for c in closed if c["hold"] is not None]
    print(f"Lukkede: {len(closed)} | Win-rate: {len(wins)/len(closed)*100:.1f}% | PnL: {pnl:,.2f} NOK | PF: {(gw/gl if gl else 0):.2f}")
    print(f"Snitt gevinst: {(gw/len(wins) if wins else 0):,.2f} | Snitt tap: {(gl/len(losses) if losses else 0):,.2f} | Snitt hold: {(sum(holds)/len(holds) if holds else 0):.1f}t")
    by_pair = defaultdict(list)
    for c in closed:
        by_pair[c["pair"]].append(c)
    print(f"{'Par':<12}{'n':>5}{'Win%':>7}{'PnL (NOK)':>14}{'SnittHold':>10}")
    for pair, cs in sorted(by_pair.items(), key=lambda kv: sum(c["pnl"] for c in kv[1])):
        p = sum(c["pnl"] for c in cs)
        wr = sum(1 for c in cs if c["pnl"] > 0)/len(cs)*100
        hs = [c["hold"] for c in cs if c["hold"] is not None]
        print(f"{pair:<12}{len(cs):>5}{wr:>6.0f}%{p:>14,.2f}{(sum(hs)/len(hs) if hs else 0):>9.1f}t")
    # Åpne posisjoner i NOK
    open_cost = sum(l[0]*l[1] for ls in lots.values() for l in ls)
    print(f"Åpne posisjoner (kostbasis NOK): {open_cost:,.2f}")
    # Holdetidsbøtter
    for lo, hi, lbl in [(0,1,"<1t"),(1,24,"1-24t"),(24,168,"1-7d"),(168,10**9,">7d")]:
        cs = [c for c in closed if c["hold"] is not None and lo <= c["hold"] < hi]
        if cs:
            print(f"  {lbl:<6} n={len(cs):<4} PnL={sum(c['pnl'] for c in cs):>12,.2f}  win%={sum(1 for c in cs if c['pnl']>0)/len(cs)*100:.0f}")
    return {"pnl": pnl, "n": len(closed), "win_rate": len(wins)/len(closed)*100, "open_cost": open_cost}

tom = json.loads((SCRATCH / "tom-trades-raw.json").read_text())
alld = json.loads((SCRATCH / "all-trades-raw.json").read_text())

r_tom = analyze(tom["trades"], "TOM")

# Alle brukere ekskl. outlier
OUTLIER = "814b8c67-1534-4a47-8c66-40a3f80870cd"
others = [t for t in alld["allTrades"] if t.get("user_id") != OUTLIER]
r_all = analyze(others, "ALLE BRUKERE (ekskl. outlier 814b8c67)")
r_out = analyze([t for t in alld["allTrades"] if t.get("user_id") == OUTLIER], "OUTLIER 814b8c67")

# Per bruker normalisert
print("\n=== PER BRUKER (NOK-normalisert, ekskl. outlier) ===")
by_user = defaultdict(list)
for t in others:
    by_user[t["user_id"]].append(t)
rows = []
for uid, ts in by_user.items():
    lots = defaultdict(list); pnl = 0; n = 0; w = 0
    for t in sorted(ts, key=lambda x: x.get("executed_at") or ""):
        pair = t.get("trading_pair"); qty = f(t.get("quantity")) or 0
        price_nok, _ = detect_and_normalize(t)
        side = (t.get("side") or "").lower()
        if side == "buy":
            lots[pair].append([qty, price_nok])
        elif side == "sell":
            rem = qty
            while rem > 1e-12 and lots[pair]:
                lot = lots[pair][0]; take = min(lot[0], rem)
                pnl += (price_nok - lot[1]) * take; n += 1
                if price_nok > lot[1]: w += 1
                lot[0] -= take; rem -= take
                if lot[0] <= 1e-12: lots[pair].pop(0)
    if n:
        rows.append((uid, len(ts), n, w/n*100, pnl))
print(f"{'Bruker':<38}{'Trades':>7}{'Lukket':>7}{'Win%':>6}{'PnL NOK':>14}")
for uid, nt, n, wr, pnl in sorted(rows, key=lambda r: r[4]):
    mark = " <-- TOM" if uid == tom["userId"] else ""
    print(f"{uid:<38}{nt:>7}{n:>7}{wr:>5.0f}%{pnl:>14,.2f}{mark}")

print("\nOK")
