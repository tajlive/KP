# Account Feature

Core account flow: profile, settings, notifications, referrals, wallet and gamification.

## Scope

Components in this folder belong to the account journey:
- Profile / user info
- Settings (theme, notifications, exchange API, accessibility)
- Notifications / alerts
- Referral program
- Wallet / gamification (when account-context)

## Rules

- Never store secrets in components.
- Use server components and RLS-protected data fetching where possible.
- Mobile-first: all primary actions must be reachable within four taps from the bottom navigation.
