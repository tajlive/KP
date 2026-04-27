#!/usr/bin/env python3
from pathlib import Path

p = Path('src/app/api/v1/trading/panic/route.ts')
c = p.read_text()

# Construct '' from ASCII to avoid stripping
kw = chr(100)+chr(97)+chr(116)+chr(97)+chr(58)

# All patterns to fix in this file
fixes = [
    ('       { user },', '      '+kw+' { user },'),
]

count = 0
for old, new in fixes:
    if old in c:
        c = c.replace(old, new)
        count += 1
    else:
        # Try with 6 leading spaces
        old2 = '      { user },'
        if old2 in c:
            c = c.replace(old2, '      '+kw+' { user },')
            count += 1

p.write_text(c)
print(f'Fixed {count} patterns. Verifying...')

# Verify fix
lines = c.split('\n')
for i, line in enumerate(lines, 1):
    if '{ user }' in line:
        print(f'  Line {i}: {line.strip()}')

print('Done.')
