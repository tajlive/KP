# Auth Improvements - 2026-04-10

## Changes Implemented

### 1. Added signInWithMicrosoft() Server Action

**File:** `src/lib/auth/new/auth-actions.ts`

```typescript
export async function signInWithMicrosoft() {
  const supabase = await createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",  // Supabase uses 'azure' for Microsoft
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      scopes: "email profile openid",
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}
```

**Rationale:**
- Supabase Auth uses `azure` as the provider key for Microsoft Entra ID
- Uses standard OIDC scopes: `email profile openid`
- Same redirect flow as Google OAuth

---

### 2. Added Microsoft Login Button

**File:** `src/app/auth/login/page.tsx`

- Added import: `signInWithMicrosoft`
- Added handler: `handleMicrosoftLogin()`
- Added button with Microsoft logo (4-color squares)
- Styled with dark theme (`#2F2F2F`) to match Microsoft brand
- Placed below Google button in OAuth section

**UI Structure:**
```
[Email/Password Form]
--- eller ---
[Google Button (white)]
[Microsoft Button (dark)]
```

---

### 3. Added Microsoft Signup Button

**File:** `src/app/auth/register/page.tsx`

- Added imports: `signInWithGoogle`, `signInWithMicrosoft`
- Added handlers: `handleGoogleSignup()`, `handleMicrosoftSignup()`
- Added divider: "eller registrer med"
- Added Google signup button
- Added Microsoft signup button

**UI Structure:**
```
[Registration Form]
[Opprett konto Button]
--- eller registrer med ---
[Google Button (white)]
[Microsoft Button (dark)]
```

---

## Technical Details

### Provider Configuration

**config.ts constants:**
```typescript
SUPPORTED_PROVIDERS = {
  GOOGLE: "google",
  MICROSOFT: "azure",  // Supabase convention
  LINKEDIN: "linkedin",
  VIPPS: "vipps",
}

OAUTH_CONFIG = {
  azure: {
    scopes: "email profile openid",
  },
}
```

### Database Trigger Support

**Migration:** `20260303000002_fix_user_trigger_consolidation.sql`

The `handle_new_user()` trigger already extracts Microsoft OID:
```sql
microsoft_id_val := NEW.raw_user_meta_data->>'oid';  -- Microsoft OID
```

This means Microsoft users will automatically have their `microsoft_id` stored.

---

## Testing Checklist

### Pre-deployment
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Login page renders without errors
- [ ] Register page renders without errors
- [ ] Microsoft button visible on both pages

### Post-deployment
- [ ] Click Microsoft button → redirects to Microsoft login
- [ ] Complete Microsoft auth → returns to callback
- [ ] Callback exchanges code → creates session
- [ ] User redirected to dashboard
- [ ] `user_profiles.microsoft_id` populated
- [ ] `user_profiles.provider` = 'azure'

---

## Environment Requirements

No new environment variables needed. Microsoft OAuth is configured in Supabase Auth dashboard:

**Required in Supabase (already configured):**
- Azure Client ID
- Azure Client Secret
- Azure Tenant ID (or "common" for multi-tenant)
- Authorized redirect URI: `https://www.klarpakke.no/auth/callback`

---

## Rollback Plan

If issues occur, revert these commits:
1. Microsoft button in login page
2. Microsoft button in register page  
3. `signInWithMicrosoft()` function

Email/password and Google OAuth remain unaffected.

---

## Session Log
**Type:** AUTH_IMPROVEMENTS  
**Status:** GO  
**Files Modified:** 3  
**Lines Added:** ~80  
