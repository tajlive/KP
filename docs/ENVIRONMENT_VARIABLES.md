# Environment Variables

## Required for Production

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Encryption
```bash
NEXT_PUBLIC_ENCRYPTION_KEY=Xab9r/G68yHnRXAIBMS8ROMJbqRSaV1dhwsAAAMIJ60=
```

### Optional (for future)
```bash
# Stripe (payment processing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Analytics
NEXT_PUBLIC_GA_ID=G-...

# Error tracking
SENTRY_DSN=https://...
```

## How to Set in Vercel

1. Go to: https://vercel.com/dashboard
2. Select project: `klarpakke`
3. Settings → Environment Variables
4. Add each variable:
   - Name: `NEXT_PUBLIC_ENCRYPTION_KEY`
   - Value: `Xab9r/G68yHnRXAIBMS8ROMJbqRSaV1dhwsAAAMIJ60=`
   - Environment: Production
5. Click "Save"
6. Redeploy: Deployments → Latest → Actions → Redeploy

## Security Notes

- Never commit `.env.local` to git
- Rotate keys if exposed
- Use different keys for development and production
- Limit Vercel access to trusted team members
