#!/usr/bin/env python3
"""Dypere analyse: valutakonsistens + cross-session FIFO-matching."""
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SCRATCH = Path(__file__).parent

def parse_dt(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None

def f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None

tom = json.loads((SCRATCH / "tom-trades-raw.json").read_text())
trades = sorted(tom["trades"], key=lambda t: t.get("executed_at") or "")

# 1) Valutasjekk: se prisnivåer og total_value vs price*qty
print("=== VALUTASJEKK (10 tilfeldige trades) ===")
for t in trades[::18]:
    q, p, tv = f(t.get("quantity")), f(t.get("price")), f(t.get("total_value"))
    ratio = tv / (q * p) if q and p else None
    print(f"{t.get('executed_at','')[:10]} {t.get('trading_pair'):<10} {t.get('side'):<5} qty={q:<12.6g} price={p:<14,.2f} total={tv:<14,.2f} ratio={ratio:.4f}" if ratio else t)

# Sjekk usdt_nok_rate-felt om det finnes
rates = [f(t.get("usdt_nok_rate")) for t in trades if f(t.get("usdt_nok_rate"))]
print(f"\nusdt_nok_rate satt på {len(rates)} trades", f"(snitt {sum(rates)/len(rates):.2f})" if rates else "")

# 2) Cross-session FIFO per par
print("\n=== CROSS-SESSION FIFO (per par, hele kontoen) ===")
lots = defaultdict(list)
closed = []
for t in trades:
    pair = t.get("trading_pair")
    qty, price, fee = f(t.get("quantity")) or 0, f(t.get("price")) or 0, f(t.get("fee")) or 0
    dt = parse_dt(t.get("executed_at"))
    side = (t.get("side") or "").lower()
    if side == "buy":
        lots[pair].append([qty, price, dt, fee])
    elif side == "sell":
        remaining = qty
        while remaining > 1e-12 and lots[pair]:
            lot = lots[pair][0]
            take = min(lot[0], remaining)
            pnl = (price - lot[1]) * take
            hold = (dt - lot[2]).total_seconds() / 3600 if dt and lot[2] else None
            closed.append({"pair": pair, "qty": take, "pnl": pnl, "hold": hold, "sell_dt": dt, "buy_price": lot[1], "sell_price": price})
            lot[0] -= take
            remaining -= take
            if lot[0] <= 1e-12:
                lots[pair].pop(0)
        if remaining > 1e-12:
            closed.append({"pair": pair, "qty": remaining, "pnl": None, "hold": None, "sell_dt": dt, "unmatched_sell": True})

wins = [c for c in closed if c["pnl"] is not None and c["pnl"] > 0]
losses = [c for c in closed if c["pnl"] is not None and c["pnl"] <= 0]
unmatched_sells = [c for c in closed if c.get("unmatched_sell")]
pnl = sum(c["pnl"] for c in closed if c["pnl"] is not None)
print(f"Lukkede: {len(closed) - len(unmatched_sells)} | Win-rate: {len(wins)/(len(closed)-len(unmatched_sells) or 1)*100:.1f}% | PnL: {pnl:,.2f}")
print(f"Umatchede SELL (solgt uten kjøp): {len(unmatched_sells)}")
holds = [c["hold"] for c in closed if c["hold"] is not None]
print(f"Snitt holdetid: {sum(holds)/len(holds):.1f}t" if holds else "")

by_pair = defaultdict(list)
for c in closed:
    if c["pnl"] is not None:
        by_pair[c["pair"]].append(c)
print(f"\n{'Par':<12}{'n':>5}{'Win%':>7}{'PnL':>14}{'SnittHold':>10}")
for pair, cs in sorted(by_pair.items(), key=lambda kv: sum(c["pnl"] for c in kv[1])):
    p = sum(c["pnl"] for c in cs)
    wr = sum(1 for c in cs if c["pnl"] > 0)/len(cs)*100
    hs = [c["hold"] for c in cs if c["hold"] is not None]
    print(f"{pair:<12}{len(cs):>5}{wr:>6.0f}%{p:>14,.2f}{(sum(hs)/len(hs) if hs else 0):>9.1f}t")

# Gjenværende åpne posisjoner
print("\n=== ÅPNE POSISJONER (etter cross-session matching) ===")
tot = 0
for pair, ls in lots.items():
    qty = sum(l[0] for l in ls)
    cost = sum(l[0]*l[1] for l in ls)
    tot += cost
    print(f"  {pair:<12} qty={qty:<16.8g} kostbasis={cost:>14,.2f}")
print(f"  TOTAL kostbasis åpne: {tot:,.2f}")

# 3) Hvordan ser en typisk sesjon ut? (auto-trade-aktivitet)
print("\n=== SESJONS-EKSEMPLER ===")
for s in tom["sessions"][:3]:
    print({k: s.get(k) for k in ("id","name","status","mode","allocated_capital","current_capital","total_pnl","created_at","archived") if k in s})

# Sesjons-PnL fra DB (hvis felt finnes)
sess_pnl = [(s.get("total_pnl"), s.get("allocated_capital"), s.get("current_capital")) for s in tom["sessions"]]
nonnull = [x for x in sess_pnl if x[0] is not None]
print(f"\nSesjoner m/ total_pnl satt: {len(nonnull)} av {len(sess_pnl)}")
if nonnull:
    tot_pnl = sum(f(x[0]) or 0 for x in nonnull)
    print(f"Sum total_pnl fra sesjoner: {tot_pnl:,.2f}")
cap = [f(x[1]) for x in sess_pnl if f(x[1])]
print(f"Snitt allocated_capital: {sum(cap)/len(cap):,.2f}" if cap else "allocated_capital ikke satt")

# 4) Trades per dag (aktivitetsmønster)
by_day = defaultdict(int)
for t in trades:
    by_day[(t.get("executed_at") or "")[:10]] += 1
print("\n=== TRADES PER DAG ===")
for d in sorted(by_day):
    print(f"  {d}: {by_day[d]}")
print("\nOK")
