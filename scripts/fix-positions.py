#!/usr/bin/env python3
path = '/Users/taj/klarpakke/src/app/api/trading/conditional-order/route.ts'
with open(path) as f:
    content = f.read()

# Simple single-line replacement - the only eq("session_id" in the file
if '.eq("session_id", session_id)' in content:
    content = content.replace(
        '.eq("session_id", session_id)',
        '.eq("user_id", user.id)  // positions has no session_id column',
        1
    )
    with open(path, 'w') as f:
        f.write(content)
    print('FIXED: positions.eq(session_id) -> user_id')
else:
    print('Already fixed or pattern not found')
    # Show all .eq() calls
    for i, line in enumerate(content.split('\n'), 1):
        if '.eq(' in line:
            print(f'  {i}: {line.rstrip()}')
