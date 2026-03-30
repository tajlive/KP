# Stripe Setup Instructions

## Required Environment Variables

Add these to your `.env.local` (development) and Vercel (production):

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site URL (for Stripe redirects)
NEXT_PUBLIC_SITE_URL=https://www.klarpakke.no
```

## Setup Steps

### 1. Create Stripe Account
- Go to https://stripe.com
- Sign up with your email
- Complete business verification

### 2. Get API Keys
- Dashboard → Developers → API keys
- Copy "Publishable key" → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Copy "Secret key" → STRIPE_SECRET_KEY

### 3. Setup Webhook
- Dashboard → Developers → Webhooks
- Click "Add endpoint"
- Endpoint URL: `https://www.klarpakke.no/api/webhooks/stripe`
- Events to send:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Copy "Signing secret" → STRIPE_WEBHOOK_SECRET

### 4. Test in Development

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Use the webhook signing secret shown in terminal
```

### 5. Add to Vercel
- Vercel Dashboard → klarpakke → Settings → Environment Variables
- Add all 4 variables
- Redeploy

## Testing Payment Flow

### Test Card Numbers
```
# Success
4242 4242 4242 4242

# Requires authentication
4000 0025 0000 3155

# Declined
4000 0000 0000 9995
```
Use any future date for expiry, any 3 digits for CVC, any 5 digits for postal code.

## Troubleshooting

### "Webhook signature verification failed"
- Check STRIPE_WEBHOOK_SECRET is correct
- Ensure raw body is being passed (Next.js does this automatically)

### "Course access not granted after payment"
- Check Vercel logs for webhook errors
- Verify user_course_progress table has RLS policies
- Check metadata in Stripe dashboard includes userId and courseId

### "Stripe is not defined"
- Ensure NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set
- Check browser console for loading errors
- Verify @stripe/stripe-js is installed
