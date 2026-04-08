# Supabase SSR Cookie Format Research

## Version: 0.9.0

## Standard Cookie Names
Supabase SSR bruker format: `sb-<project-ref>-auth-token`

## Cookie Value Format
I @supabase/ssr 0.9.0, cookien inneholder en JSON-streng med:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600,
  "expires_at": 1234567890,
  "token_type": "bearer",
  "user": { ... }
}
```

## IKKE separate cookies!
Feil:
- sb-vuxbjlykgmzskxbclquf-auth-token (kun access_token)
- sb-vuxbjlykgmzskxbclquf-refresh-token (kun refresh_token)

Riktig:
- sb-vuxbjlykgmzskxbclquf-auth-token (JSON med begge)

## Cookie Options
- encoding: "raw"
- domain: ".klarpakke.no"
- path: "/"
- secure: true
- sameSite: "none"
- httpOnly: false (for client-side access)
