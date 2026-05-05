#!/usr/bin/env python3
"""
Compare trading metrics between baseline and current snapshot.
Usage: python3 scripts/monitor/compare-metrics.py baseline.json current.json
"""
import sys
import json
from datetime import datetime

# Thresholds from monitoring spec
THRESHOLDS = {
    'win_rate': {'min': 0.52, 'target': 0.55},
    'max_drawdown_pct': {'max': 8.0, 'target': 6.0},
    'avg_drawdown_pct': {'max': 6.0, 'target': 4.0},
    'sharpe_ratio': {'min': 1.5, 'target': 1.5},
    'mtf_block_pct': {'min': 20, 'max': 40, 'target': 30},
    'avg_position_size_pct': {'max': 2.5, 'target': 2.0},
    'p0_errors': {'max': 5, 'target': 0},
}

CRITICAL = ['win_rate', 'max_drawdown_pct', 'sharpe_ratio', 'p0_errors']

def load_json(path):
    with open(path) as f:
        return json.load(f)

def color(text, status):
    """Simple ANSI colors."""
    colors = {
        'green': '\033[32m',
        'yellow': '\033[33m',
        'red': '\033[31m',
        'reset': '\033[0m',
    }
    return f"{colors.get(status, '')}{text}{colors['reset']}"

def main():
    if len(sys.argv) < 3:
        print("Usage: compare-metrics.py <baseline.json> <current.json>")
        sys.exit(1)

    baseline = load_json(sys.argv[1])
    current = load_json(sys.argv[2])

    print("=" * 70)
    print("  KLARPAKKE TRADING OVERHAUL — 48H OBSERVATION REPORT")
    print(f"  Baseline: {baseline.get('timestamp', 'N/A')}")
    print(f"  Current:  {current.get('timestamp', 'N/A')}")
    print("=" * 70)

    alerts = []
    warnings = []
    improvements = []

    def check(metric, current_val, baseline_val):
        t = THRESHOLDS.get(metric, {})
        delta = current_val - baseline_val if baseline_val is not None else 0
        delta_str = f" ({delta:+.2f})" if baseline_val is not None else ""

        # Determine status
        status = 'green'
        reason = None

        if 'min' in t and current_val < t['min']:
            status = 'red'
            reason = f"below minimum {t['min']}"
        elif 'max' in t and current_val > t['max']:
            status = 'red'
            reason = f"above maximum {t['max']}"
        elif 'min' in t and current_val < t.get('target', t['min']):
            status = 'yellow'
            reason = f"below target {t.get('target', t['min'])}"
        elif 'max' in t and current_val > t.get('target', t['max']):
            status = 'yellow'
            reason = f"above target {t.get('target', t['max'])}"

        label = metric.replace('_', ' ').upper()
        if metric == 'win_rate':
            val_str = f"{current_val*100:.1f}%"
            base_str = f"{baseline_val*100:.1f}%" if baseline_val is not None else "N/A"
        elif metric in ['mtf_block_pct', 'avg_position_size_pct', 'max_drawdown_pct', 'avg_drawdown_pct']:
            val_str = f"{current_val:.2f}%"
            base_str = f"{baseline_val:.2f}%" if baseline_val is not None else "N/A"
        else:
            val_str = f"{current_val:.2f}"
            base_str = f"{baseline_val:.2f}" if baseline_val is not None else "N/A"

        icon = '✅' if status == 'green' else ('⚠️' if status == 'yellow' else '🔴')
        print(f"  {icon} {label:25s}: {val_str:>10s} (was {base_str}){delta_str:>12s}", end="")
        if reason:
            print(f"  ← {reason}")
        else:
            print()

        if status == 'red' and metric in CRITICAL:
            alerts.append(f"{label}: {val_str} — {reason}")
        elif status == 'red':
            warnings.append(f"{label}: {val_str} — {reason}")
        elif status == 'yellow':
            warnings.append(f"{label}: {val_str} — {reason}")
        elif delta > 0 and metric in ['win_rate', 'sharpe_ratio']:
            improvements.append(f"{label}: {val_str} (+{delta:.2f})")

    print("\n📊 CORE METRICS")
    print("-" * 70)
    check('win_rate', current.get('win_rate', 0), baseline.get('win_rate'))
    check('max_drawdown_pct', current.get('max_drawdown_pct', 0), baseline.get('max_drawdown_pct'))
    check('sharpe_ratio', current.get('sharpe_ratio', 0), baseline.get('sharpe_ratio'))
    check('mtf_block_pct', current.get('mtf_block_pct', 0), baseline.get('mtf_block_pct'))
    check('avg_position_size_pct', current.get('avg_position_size_pct', 0), baseline.get('avg_position_size_pct'))
    check('p0_errors', current.get('p0_errors', 0), baseline.get('p0_errors'))

    print("\n📈 TRADE VOLUME")
    print("-" * 70)
    ct = current.get('total_trades', 0)
    bt = baseline.get('total_trades', 0)
    print(f"  Total trades: {ct} (was {bt})")
    print(f"  Wins: {current.get('total_wins', 0)} | Losses: {current.get('total_losses', 0)}")

    # Strategy breakdown
    print("\n🎯 STRATEGY BREAKDOWN")
    print("-" * 70)
    sb = current.get('strategy_breakdown', [])
    if sb:
        for s in sb:
            wr = s.get('win_rate', 0)
            wr_str = f"{wr*100:.0f}%"
            status = '🔴' if wr < 0.5 else ('🟡' if wr < 0.55 else '🟢')
            print(f"  {status} {s['strategy_id'][:8]}...: {s['trades']}T W{s['wins']}L{s['losses']} WR={wr_str}")
    else:
        print("  No strategy breakdown available")

    print("\n" + "=" * 70)

    # Summary
    if alerts:
        print(color("\n🔴 CRITICAL ALERTS (ROLLBACK TRIGGERS)", 'red'))
        for a in alerts:
            print(color(f"   • {a}", 'red'))
        print(color("\n⛔ RECOMMENDATION: PAUSE ROLLOUT — MANUAL REVIEW REQUIRED", 'red'))
        sys.exit(2)
    elif warnings:
        print(color("\n⚠️ WARNINGS", 'yellow'))
        for w in warnings:
            print(color(f"   • {w}", 'yellow'))
        print(color("\n📋 RECOMMENDATION: MONITOR CLOSELY — Consider delaying rollout", 'yellow'))
        sys.exit(1)
    else:
        print(color("\n✅ ALL CLEAR", 'green'))
        if improvements:
            print("\n📈 Improvements:")
            for i in improvements:
                print(f"   • {i}")
        print(color("\n🚀 RECOMMENDATION: PROCEED WITH ROLLOUT", 'green'))
        sys.exit(0)

if __name__ == '__main__':
    main()
