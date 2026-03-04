# Klarpakke Site Map & Architecture

**Version:** 1.5.0  
**Last Updated:** 2026-02-01  
**Total Pages:** 26 (9 app pages, 15 public pages, 2 quiz pages)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     WEBFLOW (All Pages)                      │
├─────────────────────────────────────────────────────────────┤
│  Public (No Auth)    │  App (Auth Required)                  │
│  ─────────────────   │  ────────────────────                 │
│  /                   │  /app/dashboard                       │
│  /pricing            │  /app/settings                        │
│  /leaderboard        │  /app/kalkulator                      │
│  /onboarding         │  /app/history                         │
│  /help               │  /app/profile                         │
│  /about              │  /app/paywall                         │
│  /terms              │  /app/billing                         │
│  /privacy            │  /app/referrals                       │
│  /signup             │  /app/leaderboard                     │
│  /login              │                                       │
│  /reset-password     │  Quiz (Auth Required)                 │
│  /verify-email       │  /quiz/futures                        │
│  /404, /403, /500    │  /quiz                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE BACKEND                            │
├─────────────────────────────────────────────────────────────┤
│  Auth          │  Database        │  Edge Functions         │
│  ─────         │  ────────        │  ─────────────          │
│  auth.users    │  profiles        │  get-entitlements       │
│                │  quizzes         │  track-event            │
│                │  quiz_attempts   │  upsert-profile-on-     │
│                │  strategies      │    signup               │
│                │  learning_events │  compute-leaderboard-   │
│                │  leaderboard_    │    monthly              │
│                │    monthly       │  set-subscription-tier  │
│                │  app_events      │  connect-exchange       │
│                │  exchange_       │  get-quiz               │
│                │    connections   │  submit-quiz            │
│                │  referral_       │  get-strategies         │
│                │    tracking      │  follow-strategy        │
│                │  billing_events  │  get-billing-status     │
│                │  user_settings   │  get-referral-status    │
│                │  user_notification│  update-notification-  │
│                │    _settings     │    settings             │
│                │                  │  update-user-settings   │
└─────────────────────────────────────────────────────────────┘
```

---

## Page Details

### 🏠 Public Pages (No Authentication)

#### `/` - Home
**Purpose:** Landing page with value proposition  
**Anchors:** 6 (root, hero, features)  
**Scripts:** auth.js  
**CTA:** Signup, Pricing

#### `/pricing` - Pricing
**Purpose:** Public pricing information  
**Anchors:** 2 (root, pricing section)  
**Scripts:** auth.js  
**Features:** Plan comparison table

#### `/leaderboard` - Public Leaderboard
**Purpose:** Showcase top performers (anonymized)  
**Anchors:** 9  
**Scripts:** auth.js, leaderboard-public.js  
**Data:** Top 10 from current_leaderboard view  
**Privacy:** Only display_name shown, no emails

#### `/onboarding` - Onboarding
**Purpose:** Welcome flow for new visitors  
**Anchors:** 12  
**Scripts:** auth.js, onboarding.js  
**Features:** 3-step guide, trial info, signup CTA

#### `/signup` - Signup
**Purpose:** User registration  
**Anchors:** 8 (form, inputs, submit)  
**Scripts:** auth.js, login.js  
**Post-signup:** Auto-creates profile with 14-day trial

#### `/login` - Login
**Purpose:** User authentication  
**Anchors:** 6  
**Scripts:** auth.js, login.js  
**Features:** Email/password, redirects to /app/dashboard

#### `/help` - Help & Support
**Purpose:** Documentation and FAQ  
**Anchors:** 3  
**Scripts:** auth.js

#### `/about`, `/terms`, `/privacy` - Static
**Purpose:** Company info, legal  
**Anchors:** 2 each  
**Scripts:** auth.js

#### `/reset-password`, `/verify-email` - Auth flows
**Purpose:** Password recovery, email verification  
**Anchors:** 4, 2  
**Scripts:** auth.js, password-reset.js, email-verification.js

---

### 🔒 App Pages (Authentication Required)

All app pages use:
- **Scripts:** auth.js, app-with-auth.js
- **Paywall Gating:** Redirects to /app/paywall if trial expired
- **Auth Check:** Redirects to /login if not authenticated

#### `/app/dashboard` - Main Dashboard
**Purpose:** Signal feed + learning widgets  
**Anchors:** 18  
**Scripts:** auth.js, app-with-auth.js, dashboard-roles.js, realtime.js, learning-widgets.js  
**Features:**
- Signal feed with filters
- Paper trading badge
- Learning progress widgets
- Daily tips
- Quick actions (quiz, billing)
- Welcome message with subscription badge

#### `/app/settings` - Settings
**Purpose:** User preferences and configuration  
**Anchors:** 22  
**Scripts:** auth.js, app-with-auth.js, settings.js  
**Sections:**
1. **Profile:** display name
2. **Notifications:** push, email, SMS (tier-gated)
3. **Autotrade:** toggle, limits, risk settings
4. **Exchange:** connection status, connect/disconnect
5. **Security:** safe mode toggle

#### `/app/kalkulator` - Calculator
**Purpose:** Trading calculator  
**Anchors:** 1  
**Scripts:** auth.js, app-with-auth.js

#### `/app/history` - Trading History
**Purpose:** Complete trade history  
**Anchors:** 2  
**Scripts:** auth.js, app-with-auth.js, history.js

#### `/app/profile` - User Profile
**Purpose:** User statistics and public profile  
**Anchors:** 2  
**Scripts:** auth.js, app-with-auth.js, profile.js

#### `/app/paywall` - Paywall
**Purpose:** Convert trial users to paid  
**Anchors:** 12  
**Scripts:** auth.js, app-with-auth.js, paywall.js  
**Shown when:** Trial expired, or manual upgrade  
**Features:**
- Plan cards (Standard/Pluss/VIP)
- Trial status display
- Binance referral CTA
- Futures quiz gate (for VIP)
- Event tracking

#### `/app/billing` - Billing
**Purpose:** Subscription management  
**Anchors:** 12  
**Scripts:** auth.js, app-with-auth.js, billing.js  
**Features:**
- Current plan display
- Trial countdown
- Billing history
- Upgrade/cancel CTAs
- Feature entitlements list

#### `/app/referrals` - Referrals
**Purpose:** Invite friends, earn rewards  
**Anchors:** 9  
**Scripts:** auth.js, app-with-auth.js, referrals.js  
**Features:**
- Referral code display
- Copy link button
- Stats (clicks, signups, conversions)
- Rewards info
- Binance referral CTA

#### `/app/leaderboard` - Private Leaderboard
**Purpose:** Full leaderboard with user ranking  
**Anchors:** 15  
**Scripts:** auth.js, app-with-auth.js, leaderboard.js  
**Features:**
- User's rank highlighted
- Top 100 list
- Points breakdown
- Stats per user (modules, quizzes, trades)
- Learning progress

---

### 📝 Quiz Pages (Authentication Required)

#### `/quiz/futures` - Futures Quiz
**Purpose:** Gate futures trading access  
**Anchors:** 14  
**Scripts:** auth.js, app-with-auth.js, quiz.js  
**Features:**
- Multiple choice questions
- Progress indicator
- Score display
- Pass/fail status
- Retry button
- Unlocks futures on pass (85%)

#### `/quiz` - General Quiz
**Purpose:** Educational quizzes  
**Anchors:** 3  
**Scripts:** quiz.js

---

## Data Flow

### Authentication Flow
```
1. User visits /signup or /login
2. Supabase Auth creates session
3. on_auth_user_created trigger → creates profile with trial
4. initialize_user_settings trigger → creates settings rows
5. Redirect to /app/dashboard
```

### Paywall Gating Flow
```
1. User visits /app/* page
2. app-with-auth.js checks session
3. Calls get-entitlements edge function
4. If trial expired → redirect to /app/paywall
5. If active → show page
```

### Quiz Flow
```
1. User visits /quiz/futures
2. get-quiz returns questions (no correct answers!)
3. User submits answers → submit-quiz
4. Server calculates score
5. If passed → award points, update entitlements
6. Show results with explanations
```

### Referral Flow
```
1. User shares /signup?ref=CODE
2. Visitor clicks → track_referral_click (anonymous OK)
3. Visitor signs up → complete_referral
4. Referrer gets points (award_learning_points)
5. Referrer sees stats on /app/referrals
```

---

## Edge Functions by Page

| Page | Edge Functions Used |
|------|---------------------|
| All app pages | get-entitlements, track-event |
| /quiz/futures | get-quiz, submit-quiz |
| /app/billing | get-billing-status |
| /app/referrals | get-referral-status |
| /app/settings | update-notification-settings, update-user-settings, connect-exchange |
| /app/leaderboard | compute-leaderboard-monthly (admin/cron) |
| /app/paywall | set-subscription-tier (admin) |
| /leaderboard | get-strategies (public) |

---

## Database Relations

```
auth.users
    │
    ├──► profiles (1:1) ──► user_settings (1:1)
    │                         user_notification_settings (1:1)
    │
    ├──► quiz_attempts (1:N) ──► quizzes (N:1)
    │
    ├──► strategies (1:N) ──► strategy_followers (1:N)
    │
    ├──► learning_events (1:N) ──► leaderboard_monthly (aggregated)
    │
    ├──► referral_tracking (as referrer 1:N)
    │
    ├──► billing_events (1:N)
    │
    ├──► exchange_connections (1:N)
    │
    └──► app_events (1:N)
```

---

## Security Model

### Row Level Security (RLS)
- **profiles:** Users see only own profile
- **quiz_attempts:** Users see only own attempts
- **strategies:** Public can view public strategies, users manage own
- **strategy_followers:** Users manage own follows
- **learning_events:** Users insert own, view own
- **leaderboard_monthly:** Public read (anonymized)
- **exchange_connections:** Users view own (no secrets)
- **billing_events:** Users view own
- **referral_tracking:** Users view own referrals

### Encryption
- **API Secrets:** AES-GCM encrypted, master key in env
- **No secrets in repo:** All keys in Supabase Secrets / GitHub Secrets

---

## Testing Checklist by Page

### Public Pages
- [ ] / loads correctly
- [ ] /pricing shows correct tiers
- [ ] /leaderboard shows anonymized data
- [ ] /signup creates user + profile + trial
- [ ] /login authenticates and redirects

### App Pages (require auth)
- [ ] /app/dashboard redirects if not logged in
- [ ] /app/dashboard shows learning widgets
- [ ] /app/settings saves notification prefs
- [ ] /app/settings saves autotrade settings
- [ ] /app/paywall shows if trial expired
- [ ] /app/billing shows subscription status
- [ ] /app/referrals shows stats
- [ ] /app/leaderboard highlights user

### Quiz
- [ ] /quiz/futures loads questions
- [ ] Submit quiz calculates score correctly
- [ ] Pass unlocks futures (check entitlements)
- [ ] Fail allows retry

---

## Related Documentation

- [PRICING.md](./PRICING.md) - Subscription tiers and features
- [PAYWALL.md](./PAYWALL.md) - Paywall implementation details
- [LEADERBOARD.md](./LEADERBOARD.md) - Scoring system
- [Contract](../webflow/contract/klarpakke-pages.v1.json) - DOM anchors

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=  # For GitHub Actions

# Encryption
MASTER_ENCRYPTION_KEY=  # Min 32 chars

# Site
SITE_URL=  # For referral links
```
