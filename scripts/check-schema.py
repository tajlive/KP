#!/usr/bin/env python3
with open('/Users/taj/klarpakke/src/types/supabase-generated.ts') as f:
    content = f.read()

# marketplace_subscriptions
idx = content.find('marketplace_subscriptions')
print('--- marketplace_subscriptions ---')
print(content[idx:idx+1400])

# strategies
target = 'strategies: {'
idx2 = content.find(target)
print('\n--- strategies ---')
print(content[idx2:idx2+900])
