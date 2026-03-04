# Leaderboard System Documentation

**Purpose:** "Beste elever" - Monthly recognition based on learning, not just profit  
**Core Principle:** This is an education platform, not a gambling site

---

## Philosophy

The Klarpakke leaderboard emphasizes **education and risk discipline** over raw profit. This aligns with our mission to teach responsible trading.

### Why Not Just PnL?

| Problem with PnL-only | Our Solution |
|----------------------|--------------|
| Encourages gambling | Points for completing modules |
| Rewards risky behavior | Points for following risk rules |
| Ignores learning | Points for quiz completion |
| Short-term focus | Monthly resets encourage consistency |

---

## Point System

### Learning Events & Points

| Event | Points | Rationale |
|-------|--------|-----------|
| **module_completed** | 10 | Reward education progress |
| **quiz_passed** | 25 | Validate understanding |
| **quiz_perfect_score** | 50 | Mastery bonus (100%) |
| **risk_rule_followed** | 15 | Discipline recognition |
| **paper_trade_closed_profit** | 20 | Successful application |
| **paper_trade_closed_loss** | 5 | Learning from mistakes |
| **daily_login** | 2 | Consistency bonus |
| **referral_signup** | 100 | Community growth |

### Scoring Formula

```sql
-- Monthly score calculation
WITH user_points AS (
  SELECT 
    user_id,
    SUM(points) as total_points,
    jsonb_build_object(
      'modules_completed', COUNT(*) FILTER (WHERE event_type = 'module_completed'),
      'quizzes_passed', COUNT(*) FILTER (WHERE event_type = 'quiz_passed'),
      'trades_count', COUNT(*) FILTER (WHERE event_type LIKE 'paper_trade_%'),
      'win_rate', calculate_win_rate(user_id),
      'risk_score', calculate_risk_score(user_id)
    ) as stats
  FROM learning_events
  WHERE created_at >= DATE_TRUNC('month', NOW())
    AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  GROUP BY user_id
)
SELECT 
  user_id,
  total_points,
  stats,
  RANK() OVER (ORDER BY total_points DESC) as rank
FROM user_points;
```

---

## Leaderboard Tiers

### Monthly Competition

- **Duration:** Calendar month (resets 1st of each month)
- **Participants:** All users (free and paid)
- **Visibility:** Public (anonymized, display names only)

### Prize Structure (Optional)

| Rank | Reward |
|------|--------|
| 1st | 1 month free upgrade + featured profile |
| 2nd | 2 weeks free upgrade |
| 3rd | 1 week free upgrade |
| Top 10 | Badge on profile |
| Top 100 | "Active Learner" badge |

---

## Anti-Gaming Measures

### 1. Rate Limiting

```sql
-- Prevent spam events
CREATE UNIQUE INDEX idx_daily_login_per_day 
ON learning_events(user_id, DATE(created_at)) 
WHERE event_type = 'daily_login';
```

### 2. Module Completion Validation

- Must spend minimum time (e.g., 5 min) on module
- Quiz required after module for points
- Can't complete same module multiple times for points

### 3. Trade Validation

- Paper trades must be open for minimum duration (e.g., 1 hour)
- Rapid open/close cycles flagged
- Reviewed if >10 trades/day pattern

### 4. Quiz Integrity

- Questions randomized
- Time limits per question
- Multiple attempts allowed but no extra points for retakes

---

## Implementation

### Database Tables

See migration: `supabase/migrations/20260201120000_subscription_leaderboard_system.sql`

Key tables:
- `learning_events` - Raw point events
- `leaderboard_monthly` - Computed rankings

### Edge Function

```bash
# Compute leaderboard
POST /functions/v1/compute-leaderboard-monthly

# Request
{
  "month": "2026-02-01",  // Optional, defaults to current month
  "dry_run": false        // Optional, for testing
}

# Response
{
  "success": true,
  "month": "2026-02-01",
  "users_processed": 42,
  "top_10": [
    { "rank": 1, "display_name": "TraderOla", "points": 450 }
  ]
}
```

### Automated Computation

**Recommended:** Schedule via Supabase Cron or external scheduler

```sql
-- Run on 1st of each month at 00:00
SELECT compute_leaderboard_monthly(
  DATE_TRUNC('month', NOW() - INTERVAL '1 month')::DATE
);
```

Or using GitHub Actions (see `.github/workflows/leaderboard-cron.yml`)

---

## Displaying Leaderboard

### API Response

```json
{
  "month": "2026-02-01",
  "leaderboard": [
    {
      "rank": 1,
      "display_name": "CryptoStudent",
      "points": 450,
      "stats": {
        "modules_completed": 15,
        "quizzes_passed": 3,
        "trades_count": 12,
        "win_rate": 65.5
      },
      "tier": "pluss"
    }
  ],
  "current_user": {
    "rank": 23,
    "points": 180,
    "stats": { /* ... */ }
  }
}
```

### UI Components

```typescript
// LeaderboardTable.tsx
interface LeaderboardEntry {
  rank: number;
  display_name: string;
  points: number;
  stats: {
    modules_completed: number;
    quizzes_passed: number;
    trades_count: number;
    win_rate: number;
  };
}

// Highlight current user
// Show top 10 + current user position if outside top 10
// Animate rank changes from previous month
```

---

## Privacy & Ethics

### Data Shown Publicly

✅ **Shown:**
- Display name (user-chosen)
- Points total
- Stats (modules, quizzes, trades)
- Rank

❌ **Never Shown:**
- Email address
- Real name
- Actual trading PnL
- Account balance
- API connection details

### User Control

Users can:
- Opt-out of leaderboard (hide from public)
- Change display name
- Delete learning history (GDPR)

---

## Integration with Other Systems

### Profile Page

Show user's:
- Current rank
- Monthly points
- All-time points
- Badges earned
- Learning progress

### Notifications

- "You're in the top 10!"
- "New badge earned: Quiz Master"
- "Monthly leaderboard closes in 2 days"

### Copy Trading

Users can filter copy-trading leaders by:
- Leaderboard rank
- Risk score
- Consistency streak

---

## Testing

### Test Scenarios

```typescript
// Award points
describe('Leaderboard', () => {
  it('awards points for module completion', async () => {
    const eventId = await awardLearningPoints(user.id, 'module_completed');
    expect(eventId).toBeDefined();
  });

  it('prevents duplicate daily login points', async () => {
    await awardLearningPoints(user.id, 'daily_login');
    const second = await awardLearningPoints(user.id, 'daily_login');
    // Should fail or return existing event
  });

  it('computes monthly leaderboard correctly', async () => {
    const count = await computeLeaderboard('2026-02-01');
    expect(count).toBeGreaterThan(0);
  });
});
```

### Manual Testing

1. Complete module → Verify 10 points added
2. Pass quiz → Verify 25 points
3. Wait next day → Verify daily login bonus
4. Check leaderboard → Verify ranking
5. Simulate month end → Verify reset/rollover

---

## Future Enhancements

### Potential Additions

- [ ] Weekly mini-leaderboards
- [ ] Team/Group leaderboards
- [ ] Seasonal competitions
- [ ] Achievement badges
- [ ] Streak tracking (consecutive days)
- [ ] Peer comparison ("You scored higher than 80%")

### Anti-Gaming ML

- Pattern detection for suspicious activity
- Automatic flagging of bot-like behavior
- Manual review queue for edge cases

---

## Related Documentation

- [PRICING.md](./PRICING.md) - Subscription tiers
- [PAYWALL.md](./PAYWALL.md) - Conversion optimization
- Migration: `supabase/migrations/20260201120000_subscription_leaderboard_system.sql`
- Edge Function: `supabase/functions/compute-leaderboard-monthly/`
