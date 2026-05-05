#!/usr/bin/env python3
"""
Final rollout decision engine for 48h observation.
Usage: python3 scripts/monitor/rollout-decision.py baseline.json final.json
"""
import sys
import json

# STRICT thresholds for rollout approval
ROLLOUT_GATES = {
    'win_rate': {'min': 0.55, 'absolute_min': 0.52},
    'max_drawdown_pct': {'max': 6.0, 'absolute_max': 8.0},
    'sharpe_ratio': {'min': 1.5, 'absolute_min': 1.0},
    'mtf_block_pct': {'min': 20, 'max': 40},
    'avg_position_size_pct': {'max': 2.5, 'absolute_max': 3.0},
    'p0_errors': {'max': 5, 'absolute_max': 10},
}

def load_json(path):
    with open(path) as f:
        return json.load(f)

def evaluate_gate(metric, value, gates):
    """Returns (passed, status, message)"""
    status = 'PASS'
    messages = []

    if 'min' in gates and value < gates['min']:
        if 'absolute_min' in gates and value < gates['absolute_min']:
            status = 'FAIL'
            messages.append(f"{metric}: {value:.2f} < absolute_min {gates['absolute_min']}")
        else:
            status = 'WARN'
            messages.append(f"{metric}: {value:.2f} < target_min {gates['min']}")

    if 'max' in gates and value > gates['max']:
        if 'absolute_max' in gates and value > gates['absolute_max']:
            status = 'FAIL'
            messages.append(f"{metric}: {value:.2f} > absolute_max {gates['absolute_max']}")
        else:
            status = 'WARN'
            messages.append(f"{metric}: {value:.2f} > target_max {gates['max']}")

    return status != 'FAIL', status, messages

def main():
    if len(sys.argv) < 3:
        print("Usage: rollout-decision.py <baseline.json> <final.json>")
        sys.exit(1)

    baseline = load_json(sys.argv[1])
    final = load_json(sys.argv[2])

    print("=" * 75)
    print("   🚀 KLARPAKKE TRADING OVERHAUL — 48H ROLLOUT DECISION")
    print(f"   Baseline: {baseline.get('timestamp', 'N/A')}")
    print(f"   Final:    {final.get('timestamp', 'N/A')}")
    print("=" * 75)

    results = []
    all_pass = True
    has_warnings = False

    for metric, gates in ROLLOUT_GATES.items():
        value = final.get(metric, 0)
        passed, status, msgs = evaluate_gate(metric, value, gates)

        if not passed:
            all_pass = False
        if status == 'WARN':
            has_warnings = True

        if metric == 'win_rate':
            val_str = f"{value*100:.1f}%"
        elif metric in ['mtf_block_pct', 'avg_position_size_pct', 'max_drawdown_pct']:
            val_str = f"{value:.2f}%"
        else:
            val_str = f"{value:.0f}"

        icon = '✅' if status == 'PASS' else ('⚠️' if status == 'WARN' else '🔴')
        label = metric.replace('_', ' ').upper()
        print(f"  {icon} {label:25s}: {val_str:>10s}  [{status}]")
        for m in msgs:
            print(f"      → {m}")

        results.append({'metric': metric, 'value': value, 'status': status, 'messages': msgs})

    # Delta summary
    print("\n📊 DELTA FROM BASELINE")
    print("-" * 75)
    for metric in ['win_rate', 'max_drawdown_pct', 'sharpe_ratio', 'total_trades']:
        b = baseline.get(metric, 0)
        c = final.get(metric, 0)
        delta = c - b
        if metric == 'win_rate':
            print(f"  {metric:25s}: {b*100:.1f}% → {c*100:.1f}% ({delta*100:+.1f}%)")
        elif metric == 'total_trades':
            print(f"  {metric:25s}: {b:.0f} → {c:.0f} ({delta:+.0f})")
        else:
            print(f"  {metric:25s}: {b:.2f} → {c:.2f} ({delta:+.2f})")

    print("\n" + "=" * 75)

    if all_pass and not has_warnings:
        print("\n🎉 ROLLOUT APPROVED — ALL GATES GREEN")
        print("\n📋 NEXT STEPS:")
        print("   1. Enable Dark Fleet + MTF for premium users (50 users)")
        print("   2. Monitor for 12h")
        print("   3. Full rollout to pro+premium if stable")
        print("   4. Post KLA-241 Linear comment")
        sys.exit(0)
    elif all_pass and has_warnings:
        print("\n⚠️ CONDITIONAL APPROVAL — WARNINGS PRESENT")
        print("\n📋 NEXT STEPS:")
        print("   1. Review warnings with team")
        print("   2. Consider phased rollout (10% users)")
        print("   3. Extended monitoring (24h additional)")
        sys.exit(1)
    else:
        print("\n🔴 ROLLOUT BLOCKED — CRITICAL FAILURES")
        print("\n📋 NEXT STEPS:")
        print("   1. Investigate failures")
        print("   2. Consider rollback to pre-overhaul state")
        print("   3. Schedule war room")
        sys.exit(2)

if __name__ == '__main__':
    main()
