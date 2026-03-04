# Sentry Error Tracking Setup

## Overview

Sentry provides real-time error tracking and monitoring for Klarpakke production and staging environments.

## Setup Instructions

### 1. Create Sentry Account

1. Go to https://sentry.io/signup/
2. Create a free account (up to 5,000 errors/month)
3. Create new project: "Klarpakke"
4. Select platform: "JavaScript"

### 2. Get DSN

Copy your DSN from Sentry project settings. It looks like:
```
https://abc123@o123456.ingest.sentry.io/7890123
```

### 3. Add to GitHub Secrets

```bash
gh secret set SENTRY_DSN --body "your-dsn-here"
```

### 4. Add to Webflow Custom Code (HEAD)

Copy the snippet from `webflow/sentry-init.js` and add it to Webflow Project Settings → Custom Code → Head Code.

## What Gets Tracked

- **JavaScript Errors**: Uncaught exceptions, promise rejections
- **Network Errors**: Failed API calls to Supabase
- **Console Errors**: console.error() calls
- **User Context**: User ID (when logged in)
- **Environment**: production vs staging
- **Release**: Git commit SHA (optional)

## Sentry Dashboard

View errors at: https://sentry.io/organizations/klarpakke/issues/

### Key Metrics
- **Error Rate**: Errors per minute
- **Affected Users**: Number of unique users experiencing errors
- **Error Frequency**: Most common errors
- **Stack Traces**: Full call stack for debugging

## Alerts

Configure alerts in Sentry:
- Email when new error occurs
- Slack notifications (optional)
- Set thresholds (e.g., >10 errors/min)

## Privacy

Sentry automatically scrubbs:
- Passwords
- Credit card numbers
- API keys

But verify no sensitive data in stack traces.

## Performance Monitoring (Optional)

Enable performance tracking for $26/month:
```javascript
Sentry.init({
  dsn: 'YOUR_DSN',
  tracesSampleRate: 0.1, // Sample 10% of transactions
  integrations: [new Sentry.BrowserTracing()],
});
```

## Testing

Test error capture locally:
```javascript
// In browser console
throw new Error('Test error for Sentry');
```

Should appear in Sentry dashboard within seconds.

## Disable for Development

Sentry only runs in production/staging (see sentry-init.js).
