# Common Secrets - Quick Reference

Praktisk guide for secrets som ofte trengs i Klarpakke.

## Webflow Secrets

Din Webflow site: https://klarpakke-c65071.design.webflow.com

```bash
# API Token for creating pages
npm run secrets:set WEBFLOW_API_TOKEN "Bearer token_xxx" prod

# Browser session for Designer automation
npm run secrets:set WEBFLOW_STORAGE_STATE_B64 "base64-encoded-session" prod

# View
npm run secrets:list prod | grep WEBFLOW
```

**Where to get:**
- API Token: https://webflow.com/account/apps
- Storage State: `npm run capture-webflow-storage-state`

---

## Supabase Secrets

Your Supabase project: https://app.supabase.com

```bash
# Service role key for admin operations
npm run secrets:set SUPABASE_ADMIN_TOKEN "sbp_service_role_xxx" prod

# Read-only key for frontend
npm run secrets:set SUPABASE_ANON_KEY "eyJhbGc..." prod

# View
npm run secrets:list prod | grep SUPABASE
```

**Where to get:**
- Go to Settings → API → Project API keys
- Copy "Service role secret" for admin access

---

## Email Secrets

### SendGrid

```bash
npm run secrets:set SENDGRID_API_KEY "SG.abc123xyz..." prod
```

**Where to get:** https://app.sendgrid.com/settings/api_keys

**Usage in code:**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: 'user@example.com',
  from: 'noreply@klarpakke.no',
  subject: 'Hello',
  html: '<p>Hello world</p>',
});
```

### Resend

```bash
npm run secrets:set RESEND_API_KEY "re_abc123xyz..." prod
```

**Where to get:** https://resend.com/api-keys

---

## Payment Secrets

### Stripe

```bash
# Live secret key (production)
npm run secrets:set STRIPE_SECRET_KEY "sk_live_abc123..." prod

# Test secret key (staging)
npm run secrets:set STRIPE_SECRET_KEY "sk_test_abc123..." staging

# Webhook signing secret
npm run secrets:set STRIPE_WEBHOOK_SECRET "whsec_abc123..." prod
```

**Where to get:** https://dashboard.stripe.com/apikeys

**Usage in code:**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
});
```

---

## Authentication Secrets

### JWT

```bash
# Secret for signing JWT tokens
npm run secrets:set JWT_SECRET "your-secret-key-min-32-chars..." prod
npm run secrets:set JWT_REFRESH_SECRET "refresh-secret-key..." prod
```

**Generate secure secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Usage:**
```javascript
const jwt = require('jsonwebtoken');

// Sign
const token = jwt.sign(
  { userId: 123 },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Verify
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

### OAuth - GitHub

```bash
npm run secrets:set GITHUB_CLIENT_ID "Iv1.abc123..." prod
npm run secrets:set GITHUB_CLIENT_SECRET "abc123xyz..." prod
npm run secrets:set GITHUB_WEBHOOK_SECRET "whsec_..." prod
```

**Where to get:** https://github.com/settings/developers

### OAuth - Google

```bash
npm run secrets:set GOOGLE_CLIENT_ID "123456.apps.googleusercontent.com" prod
npm run secrets:set GOOGLE_CLIENT_SECRET "GOCSPX-abc123..." prod
```

**Where to get:** https://console.cloud.google.com/apis/credentials

### OAuth - Discord

```bash
npm run secrets:set DISCORD_CLIENT_ID "123456789..." prod
npm run secrets:set DISCORD_CLIENT_SECRET "abc123xyz..." prod
```

**Where to get:** https://discord.com/developers/applications

---

## Database Secrets

### PostgreSQL Connection

```bash
# Supabase PostgreSQL (direct connection)
npm run secrets:set DATABASE_URL "postgres://user:pass@db.supabase.co:5432/postgres" prod

# Backup/replica connection
npm run secrets:set DATABASE_BACKUP_URL "postgres://user:pass@backup.example.com/db" prod
```

**Usage:**
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const result = await pool.query('SELECT * FROM users WHERE id = $1', [123]);
```

---

## Error Tracking Secrets

### Sentry

```bash
npm run secrets:set SENTRY_DSN "https://abc123@o123.ingest.sentry.io/123" prod
npm run secrets:set SENTRY_AUTH_TOKEN "sntrys_..." prod
```

**Where to get:** https://sentry.io/settings/organizations

**Usage:**
```javascript
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
});

// Errors automatically captured
```

---

## Monitoring & Analytics

### PostHog

```bash
npm run secrets:set POSTHOG_API_KEY "phc_abc123..." prod
npm run secrets:set POSTHOG_API_HOST "https://app.posthog.com" prod
```

**Where to get:** https://posthog.com/account/settings

### Slack Webhooks

```bash
# For alerts/notifications
npm run secrets:set SLACK_WEBHOOK_URL "https://hooks.slack.com/services/T.../B.../..." prod

# For bot token
npm run secrets:set SLACK_BOT_TOKEN "xoxb-abc123..." prod
```

**Where to get:** Slack App → Incoming Webhooks

**Usage:**
```javascript
const webhook = process.env.SLACK_WEBHOOK_URL;

await fetch(webhook, {
  method: 'POST',
  body: JSON.stringify({
    text: 'Alert: Something happened!',
  }),
});
```

---

## External APIs

### Anthropic (Claude API)

```bash
npm run secrets:set ANTHROPIC_API_KEY "sk-ant-abc123..." prod
```

**Where to get:** https://console.anthropic.com/account/keys

**Usage:**
```javascript
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Hello!" },
  ],
});
```

### OpenAI

```bash
npm run secrets:set OPENAI_API_KEY "sk-proj-abc123..." prod
```

**Where to get:** https://platform.openai.com/api-keys

### Perplexity

```bash
npm run secrets:set PERPLEXITY_API_KEY "pplx-abc123..." prod
```

---

## Quick Add All Webflow Secrets

```bash
# Get your tokens first from https://webflow.com/account/apps

# Then add them:
npm run secrets:set WEBFLOW_API_TOKEN "your-token" prod
npm run secrets:set WEBFLOW_STORAGE_STATE_B64 "your-session" prod

# Verify
npm run secrets:list prod | grep WEBFLOW
```

---

## Environment-Specific Setup

### Production

```bash
# Webflow production
npm run secrets:set WEBFLOW_API_TOKEN "sk_live_..." prod
npm run secrets:set WEBFLOW_STORAGE_STATE_B64 "prod-session" prod

# Stripe live keys
npm run secrets:set STRIPE_SECRET_KEY "sk_live_..." prod

# SendGrid production
npm run secrets:set SENDGRID_API_KEY "SG.prod_key" prod
```

### Staging

```bash
# Webflow staging
npm run secrets:set WEBFLOW_API_TOKEN "sk_test_..." staging
npm run secrets:set WEBFLOW_STORAGE_STATE_B64 "staging-session" staging

# Stripe test keys
npm run secrets:set STRIPE_SECRET_KEY "sk_test_..." staging

# SendGrid sandbox
npm run secrets:set SENDGRID_API_KEY "SG.staging_key" staging
```

### Development

```bash
# Local testing with test keys
npm run secrets:set WEBFLOW_API_TOKEN "test-token" dev
npm run secrets:set STRIPE_SECRET_KEY "sk_test_..." dev

# Sync to .env.local
npm run secrets:sync dev
```

---

## Checklist: Adding a New Secret

When adding a new external service:

- [ ] Get API token/key from service provider
- [ ] Determine environment (prod/staging/dev)
- [ ] Choose clear secret name (e.g., SERVICE_TYPE_KEY)
- [ ] Add to vault: `npm run secrets:set NAME "value" ENV`
- [ ] Verify: `npm run secrets:get NAME`
- [ ] Add to .env.local.example (without actual value)
- [ ] Update code to use `process.env.NAME`
- [ ] Update GitHub Actions workflow if needed
- [ ] Test locally with `npm run secrets:sync`
- [ ] Commit changes and push

---

## Rotate Secrets Regularly

```bash
# Every 90 days or after team changes:

npm run secrets:rotate WEBFLOW_API_TOKEN "new-token" prod
npm run secrets:rotate STRIPE_SECRET_KEY "new-key" prod
npm run secrets:rotate SENDGRID_API_KEY "new-key" prod

# View rotation history
npm run secrets:audit WEBFLOW_API_TOKEN
```

---

## Need Help?

- See complete secrets guide: `docs/SECRETS-MANAGEMENT.md`
- Adding new secrets: `docs/ADDING-SECRETS.md`
- Setup guide: `docs/SECRETS-SETUP-GUIDE.md`

---

**Remember:** Never commit actual secrets to git. Always use Supabase vault! 🔐
