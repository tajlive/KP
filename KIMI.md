# KIMI - Klarpakke Project Agent Guide

## Project Overview
- **Name**: Klarpakke
- **Type**: Next.js 14 + Supabase + TypeScript trading platform
- **Locale**: Norwegian (no) / English (en)
- **Database**: Supabase PostgreSQL (pskhryjzkobytnfwucrb)

## Quick Commands
```bash
# Dev server
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit

# Supabase
supabase db push
supabase db pull
```

## MCP Servers
| Server | Status | Auth |
|--------|--------|------|
| supabase | ✅ Active | Token |
| github | ⏳ Pending | OAuth |
| linear | ⏳ Pending | OAuth |
| context7 | ✅ Active | None |

## Database Patterns
- **Canonical user table**: `public.user_profiles` (id PK, user_id FK)
- **Auth triggers**: Check `auth.users` triggers for user creation flow
- **Migrations**: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

## Critical Functions
- `create_default_user_data()` - Creates user on signup
- `initialize_user_settings()` - Creates settings (triggers on user_profiles)

## File Locations
- Components: `src/components/`
- App routes: `src/app/[locale]/`
- Lib: `src/lib/`
- API: `src/app/api/`

## Important Notes
- `user_profiles` has BOTH `id` (gen_random_uuid) AND `user_id` (FK to auth.users)
- Multiple triggers on auth.users can conflict
- Always use `ON CONFLICT DO NOTHING` in triggers
