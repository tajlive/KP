# Authentication Setup Guide

Complete guide for setting up and troubleshooting authentication in Klarpakke.

## Quick Status Check

```bash
# Test auth configuration
curl https://www.klarpakke.no/api/auth/test

# Run unit tests
npm test src/lib/auth/__tests__/auth.test.ts
```

## Supported Authentication Methods

| Method | Provider Key | Status | Notes |
|--------|-------------|--------|-------|
| Google | `google` | ✅ Ready | Most popular |
| Microsoft | `azure` | ✅ Ready | Enterprise users |
| Apple | `apple` | ✅ Ready | iOS/macOS users |
| LinkedIn | `linkedin_oidc` | ✅ Ready | Professional |
| Magic Link | `email` | ✅ Ready | Passwordless |
| Email/Password | `email` | ✅ Ready | Traditional |

## Configuration

### 1. Environment Variables

Required in `.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App URL (Optional, has defaults)
NEXT_PUBLIC_APP_URL=https://www.klarpakke.no
```

### 2. Supabase Dashboard Configuration

#### Enable OAuth Providers

Go to **Authentication → Providers** and enable:

- **Google**: Add Client ID and Secret from Google Cloud Console
- **Microsoft (Azure)**: Add Application ID and Secret
- **Apple**: Add Services ID and Private Key
- **LinkedIn (OIDC)**: Add Client ID and Secret

#### Configure Redirect URLs

In **Authentication → URL Configuration**:

```
Site URL: https://www.klarpakke.no
Redirect URLs:
  - https://www.klarpakke.no/no/auth/callback
  - https://www.klarpakke.no/en/auth/callback
  - http://localhost:3000/no/auth/callback  (for development)
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google+ API** or **People API**
4. Go to **Credentials → Create OAuth 2.0 Client**
5. Configure **Authorized Redirect URIs**:
   ```
   https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/callback
   ```
6. Copy Client ID and Secret to Supabase Dashboard

⚠️ **Critical**: The redirect URI must match exactly what Supabase sends.

## Troubleshooting

### redirect_uri_mismatch Error

**Problem**: Google shows "Error 400: redirect_uri_mismatch"

**Solution**:
1. Verify callback URL in Supabase matches Google Cloud Console
2. Check that the URL has no trailing spaces
3. Ensure protocol matches (https vs http)
4. Test with the diagnostic endpoint:
   ```bash
   curl https://www.klarpakke.no/api/auth/test
   ```

### "exchange_failed" Error

**Problem**: Callback fails with `error=exchange_failed`

**Causes**:
1. Code expired (takes too long to complete OAuth)
2. Session already used
3. Supabase configuration error

**Solution**:
- Try logging in again
- Check Supabase Auth settings
- Verify site URL matches actual domain

### Profile Not Created

**Problem**: User can login but no profile row exists

**Solution**:
1. Check that trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. Verify function works:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```
3. Run migration if needed:
   ```bash
   supabase db push
   ```

## Testing Authentication

### Manual Test Checklist

- [ ] Google OAuth login works
- [ ] Microsoft OAuth login works
- [ ] Magic link email is received
- [ ] Profile is created on first login
- [ ] Redirect to dashboard after login
- [ ] Error messages display in Norwegian
- [ ] Logout clears session

### Automated Tests

```bash
# Run auth unit tests
npm test src/lib/auth/__tests__/auth.test.ts

# Run all tests
npm test
```

### Production Verification

```bash
# Check auth config endpoint
curl https://www.klarpakke.no/api/auth/test | jq

# Expected output:
{
  "status": "healthy",
  "checks": {
    "node_env": "production",
    "is_production": true,
    "app_url_configured": true,
    "supabase_url_configured": true,
    "supabase_key_configured": true,
    "callback_url_no": "https://www.klarpakke.no/no/auth/callback",
    "callback_url_en": "https://www.klarpakke.no/en/auth/callback",
    "supported_providers": ["GOOGLE", "MICROSOFT", "APPLE", "LINKEDIN"]
  }
}
```

## Architecture

### File Structure

```
src/
├── lib/auth/
│   ├── config.ts          # Centralized auth configuration
│   ├── utils.ts           # Helper functions
│   └── __tests__/
│       └── auth.test.ts   # Unit tests
├── app/[locale]/auth/
│   └── callback/
│       └── route.ts       # OAuth callback handler
├── components/auth/
│   └── UnifiedAuthButton.tsx  # All auth buttons
└── app/api/auth/
    └── test/
        └── route.ts       # Configuration test endpoint
```

### OAuth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Login   │────▶│  Google  │────▶│ Callback │
│          │     │  Button  │     │   OAuth  │     │  Handler │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                        │
                              ┌─────────────────────────┘
                              ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Dashboard│◀────│ Profile  │◀────│  Session │
│          │     │  Check   │     │  Verify  │
└──────────┘     └──────────┘     └──────────┘
```

## Security Considerations

1. **PKCE Flow**: Automatically handled by Supabase
2. **State Parameter**: Automatically handled by Supabase
3. **HTTPS Only**: All OAuth flows require HTTPS in production
4. **Session Cookies**: 
   - `Secure` flag in production
   - `SameSite=Lax` for OAuth compatibility
   - 7-day expiration

## Migration Notes

### From Old Auth System

If upgrading from a previous auth implementation:

1. Update imports:
   ```typescript
   // Old
   import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
   
   // New
   import { UnifiedAuthButton } from '@/components/auth/UnifiedAuthButton';
   ```

2. Replace component usage:
   ```tsx
   // Old
   <GoogleSignInButton />
   
   // New
   <UnifiedAuthButton provider="GOOGLE" />
   ```

3. Update callback URL handling if needed

## Support

For authentication issues:
1. Check browser console for errors
2. Check Supabase Auth logs
3. Run `/api/auth/test` diagnostic
4. Verify OAuth provider settings
