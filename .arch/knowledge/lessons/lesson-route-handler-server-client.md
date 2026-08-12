# Lesson: Route handler → createServerClient(request, response)

I Next.js route handlers (ikke RSC): bruk `createServerClient(request, response)` fra
`src/lib/supabase/server.ts` (sync-varianten). `cookies()`-varianten uten args krasjer
i route-handler-context → 500 for innloggede.

Kilde: fiks av `/api/onboarding/events` 2026-08-10.
