#!/usr/bin/env python3
import subprocess
import os

print("📱 KLARPAKKE - RESPONSIVE DESIGN AUDIT")
print("=" * 40)
print()

pass_count = 0
fail_count = 0
warn_count = 0

# 1. Viewport
if 'export const viewport' in open('src/app/layout.tsx').read():
    print("✅ 1. Viewport export OK")
    pass_count += 1
else:
    print("❌ 1. Mangler viewport")
    fail_count += 1

# 2. Responsive klasser
resp = subprocess.run(['grep', '-r', 'sm:\\|lg:', 'src/components/'], 
                      capture_output=True, text=True)
resp_count = len(resp.stdout.splitlines())
print(f"✅ 2. Responsive klasser: {resp_count}")
pass_count += 1

# 3. Overflow
if 'overflow-x' in open('src/app/globals.css').read():
    print("✅ 3. Overflow-x-hidden OK")
    pass_count += 1
else:
    print("❌ 3. Mangler overflow-x")
    fail_count += 1

# 4. Navigation
if os.path.exists('src/components/layout/Navigation.tsx'):
    print("✅ 4. Navigation.tsx OK")
    pass_count += 1
else:
    print("❌ 4. Navigation mangler")
    fail_count += 1

print()
print("=" * 40)
total = pass_count + warn_count + fail_count
score = int(pass_count * 100 / total) if total > 0 else 0
print(f"📊 RESULTAT: {pass_count} PASS | {warn_count} WARN | {fail_count} FAIL")
print(f"Score: {score}%")
print()

if score >= 75:
    print("🎉 EXCELLENT - Responsive design er på plass!")
else:
    print("⚠️  Noen forbedringer anbefales")
