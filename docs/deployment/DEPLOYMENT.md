# 🚀 Klarpakke Deployment Guide

Complete step-by-step guide to deploy Klarpakke to production.

---

## ✅ Pre-Deployment Checklist

Before deploying, ensure all these items are completed:

### Configuration Files
- [x] `.gitignore` created (protects secrets)
- [x] `LICENSE` file created (MIT)
- [x] Environment variable typo fixed (`LOGROCKET_APP_ID`)
- [x] Supabase Anon Key configured in `webflow/auth.js`
- [x] CORS configuration updated to Webflow domain
- [ ] `.env` file created locally (for testing)

### Documentation
- [x] `docs/API.md` - API reference
- [x] `docs/ARCHITECTURE.md` - System architecture
- [x] `docs/SETUP.md` - Setup guide
- [x] `docs/SECURITY.md` - Security guide
- [x] `CONTRIBUTING.md` - Contribution guidelines

### GitHub Setup
- [ ] Repository created on GitHub
- [ ] GitHub Secrets configured (see below)
- [ ] GitHub Actions enabled
- [ ] Branch protection rules set (optional)

### Supabase Setup
- [ ] Database migrations applied
- [ ] Edge Functions deployed
- [ ] RLS policies enabled
- [ ] Test user created with role
- [ ] Audit logging tested

### Webflow Setup
- [ ] Custom code updated with Supabase config
- [ ] JavaScript files uploaded to assets
- [ ] Pages published
- [ ] Custom domain configured (optional)

---

## 🔐 GitHub Secrets Configuration

Go to: **Repository Settings → Secrets and variables → Actions → New repository secret**

Add the following secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `SUPABASE_ACCESS_TOKEN` | Your Supabase access token | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | `swfyuwkptusceiouqlks` | From your Supabase project URL |
| `SUPABASE_DB_PASSWORD` | Your database password | Supabase Dashboard → Settings → Database |

**Note**: The Anon Key and URL are already configured in the code files, so they don't need to be in GitHub Secrets.

---

## 📦 Step 1: Deploy Database

### 1.1 Install Supabase CLI (if not already installed)

```bash
# macOS/Linux
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_$(uname -s)_$(uname -m).tar.gz | tar -xz
sudo mv supabase /usr/local/bin/

# Verify installation
supabase --version
```

### 1.2 Login to Supabase

```bash
supabase login
```

### 1.3 Link to Your Project

```bash
cd klarpakke-complete
supabase link --project-ref swfyuwkptusceiouqlks
```

### 1.4 Apply Database Migrations

```bash
# Push all migrations to production
supabase db push

# Verify migrations
supabase db remote ls
```

### 1.5 Verify Database Setup

```bash
# Open database shell
supabase db remote shell

# Check tables exist
\dt

# Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';

# Exit shell
\q
```

---

## ⚡ Step 2: Deploy Edge Functions

### 2.1 Deploy Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy approve-signal
supabase functions deploy get-signals
```

### 2.2 Set Environment Variables (Optional)

If you want to use a custom CORS origin:

```bash
# Set CORS_ORIGIN for production domain
supabase secrets set CORS_ORIGIN=https://your-custom-domain.com
```

### 2.3 Test Functions

```bash
# Get your JWT token from Supabase Dashboard
# Authentication → Users → Your user → Copy JWT

# Test approve-signal
curl -X POST https://swfyuwkptusceiouqlks.supabase.co/functions/v1/approve-signal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk" \
  -H "Content-Type: application/json" \
  -d '{"signal_id":"550e8400-e29b-41d4-a716-446655440000","action":"approve"}'

# Test get-signals
curl -X GET "https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals?status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk"
```

---

## 🎨 Step 3: Deploy to Webflow

### 3.1 Prepare JavaScript Files

Your JavaScript files are ready in the `webflow/` directory:
- `auth.js` - Authentication module (✅ Anon key configured)
- `app-with-auth.js` - Main application
- `login.js` - Login page handler
- `improvements.js` - UI enhancements (if exists)

### 3.2 Upload to Webflow Assets

1. Go to Webflow Designer → Assets
2. Upload each JavaScript file from `webflow/` directory
3. Copy the CDN URL for each file

### 3.3 Add Supabase Library to Head Code

In Webflow: **Project Settings → Custom Code → Head Code**

```html
<!-- Supabase Client Library -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### 3.4 Add Your Scripts to Footer Code

In Webflow: **Project Settings → Custom Code → Footer Code** (or page-specific)

```html
<!-- Authentication Module -->
<script src="[YOUR-AUTH-JS-CDN-URL]"></script>

<!-- UI Improvements (if you have this file) -->
<script src="[YOUR-IMPROVEMENTS-JS-CDN-URL]"></script>

<!-- Main Application -->
<script src="[YOUR-APP-WITH-AUTH-JS-CDN-URL]"></script>

<!-- Initialize (Optional override if needed) -->
<script>
  // Configuration is already set in auth.js
  // Only add this if you need to override for different environments
  // KlarpakkeAuth.config.SUPABASE_ANON_KEY = 'your-key-here';
</script>
```

### 3.5 Set Up Login Page

1. Create a page called `/login` in Webflow
2. Add a form with:
   - Email input (ID: `email-input`)
   - Password input (ID: `password-input`)
   - Submit button (ID: `login-button`)
   - Error message div (ID: `login-error`)
3. Add page-specific custom code:

```html
<!-- Login Page Script -->
<script src="[YOUR-LOGIN-JS-CDN-URL]"></script>
```

### 3.6 Set Up Dashboard Page

1. Create your dashboard page (or use existing homepage)
2. Add elements for:
   - Signal list container
   - User info display
   - Logout button
3. The `app-with-auth.js` will handle the logic

### 3.7 Publish Site

1. Click **Publish** in Webflow
2. Choose your domain (staging or production)
3. Verify the site loads correctly

---

## 🔧 Step 4: Configure CI/CD (GitHub Actions)

### 4.1 Push Code to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Klarpakke signal management system"

# Add remote and push
git remote add origin https://github.com/YOUR-USERNAME/klarpakke.git
git branch -M main
git push -u origin main
```

### 4.2 Verify GitHub Actions

Go to: **Repository → Actions**

You should see three workflows:
- ✅ **CI** - Runs linting and tests
- ✅ **Deploy Supabase** - Auto-deploys on push to main
- ✅ **Signal Webhook** - Creates issues for rejected signals

### 4.3 Test CI/CD Pipeline

Make a small change and push:

```bash
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify CI/CD pipeline"
git push
```

Check Actions tab to see if workflows run successfully.

---

## 👤 Step 5: Create Test Users

### 5.1 Create Users in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Click **Add User**
3. Create test users with different roles:

**Admin User:**
- Email: `admin@klarpakke.com`
- Password: (strong password)

**Trader User:**
- Email: `trader@klarpakke.com`
- Password: (strong password)

**Analyst User:**
- Email: `analyst@klarpakke.com`
- Password: (strong password)

### 5.2 Assign Roles

Run this SQL in Supabase SQL Editor:

```sql
-- Get user IDs
SELECT id, email FROM auth.users;

-- Assign roles (replace UUIDs with actual user IDs)
INSERT INTO user_roles (user_id, role) VALUES
  ('admin-user-uuid', 'admin'),
  ('trader-user-uuid', 'trader'),
  ('analyst-user-uuid', 'analyst');

-- Verify roles
SELECT u.email, ur.role
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id;
```

### 5.3 Create Test Signals

```sql
-- Create some test signals
INSERT INTO signals (id, title, direction, confidence, status, created_by) VALUES
  (gen_random_uuid(), 'BTC/USD Long Setup', 'long', 85, 'pending', 'analyst-user-uuid'),
  (gen_random_uuid(), 'ETH/USD Short Entry', 'short', 72, 'pending', 'analyst-user-uuid'),
  (gen_random_uuid(), 'SOL/USD Long Breakout', 'long', 90, 'pending', 'analyst-user-uuid');

-- Verify signals
SELECT * FROM signals WHERE status = 'pending';
```

---

## 🧪 Step 6: End-to-End Testing

### 6.1 Test Authentication Flow

1. Go to your Webflow site's login page
2. Enter test user credentials
3. Verify redirect to dashboard
4. Check user info displays correctly
5. Test logout functionality

### 6.2 Test Signal Approval

1. Login as trader or admin
2. Verify signals load on dashboard
3. Click "Approve" on a signal
4. Verify signal status updates
5. Check audit log entry created

### 6.3 Test Permissions

**As Admin:**
- ✅ Can see all signals
- ✅ Can approve/reject signals
- ✅ Can see all audit logs

**As Trader:**
- ✅ Can see all signals
- ✅ Can approve/reject signals
- ❌ Cannot access admin panel

**As Analyst:**
- ✅ Can see only their own signals
- ✅ Can create signals
- ❌ Cannot approve/reject signals

**As Viewer:**
- ✅ Can see all signals
- ❌ Cannot approve/reject
- ❌ Cannot create signals

### 6.4 Test Rate Limiting

Use this script to test rate limiting:

```bash
#!/bin/bash
# Test rate limiting (should fail after 10 requests)

TOKEN="your-jwt-token"
SIGNAL_ID="550e8400-e29b-41d4-a716-446655440000"

for i in {1..15}; do
  echo "Request $i:"
  curl -s -w "\nHTTP Status: %{http_code}\n" \
    -X POST https://swfyuwkptusceiouqlks.supabase.co/functions/v1/approve-signal \
    -H "Authorization: Bearer $TOKEN" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk" \
    -H "Content-Type: application/json" \
    -d "{\"signal_id\":\"$SIGNAL_ID\",\"action\":\"approve\"}"
  echo "---"
  sleep 2
done
```

Expected: First 10 requests succeed, then 429 (Too Many Requests)

---

## 📊 Step 7: Set Up Monitoring (Optional)

### 7.1 Sentry Error Tracking

If using Sentry:

```javascript
// Add to Webflow footer code (before other scripts)
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
<script>
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: 'production',
    tracesSampleRate: 0.1,
  });
</script>
```

### 7.2 LogRocket Session Replay

If using LogRocket:

```javascript
// Add to Webflow head code
<script src="https://cdn.logrocket.io/LogRocket.min.js"></script>
<script>
  window.LogRocket && window.LogRocket.init('YOUR_LOGROCKET_APP_ID');
</script>
```

### 7.3 Supabase Logs

Monitor in Supabase Dashboard → Logs:
- Function invocations
- Error rates
- Database queries
- Authentication events

---

## 🔒 Step 8: Security Hardening

### 8.1 Enable 2FA for Admins

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Phone or TOTP provider
3. Require 2FA for admin users

### 8.2 Configure Backup Strategy

1. Go to Supabase Dashboard → Settings → Backups
2. Verify daily backups are enabled
3. Test restore process (on staging)

### 8.3 Review RLS Policies

```sql
-- Verify all tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Should return rowsecurity = true for all tables
```

### 8.4 Set Up Alerts

Configure alerts in Supabase for:
- High error rates (>5% of requests)
- Failed authentication attempts (>10 in 5 min)
- Database connection issues
- Function timeout errors

---

## 🎉 Step 9: Go Live!

### 9.1 Custom Domain (Optional)

If using custom domain in Webflow:
1. Add custom domain in Webflow settings
2. Configure DNS records as instructed
3. Enable SSL certificate
4. Update CORS in Edge Functions if needed

### 9.2 Announcement

1. Notify team members
2. Share access credentials securely
3. Provide link to documentation
4. Schedule onboarding session

### 9.3 Monitor Initial Usage

For the first 24-48 hours:
- ✅ Check Supabase logs regularly
- ✅ Monitor error rates
- ✅ Watch for performance issues
- ✅ Collect user feedback
- ✅ Be ready to roll back if needed

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" error on API calls

**Solution:**
```javascript
// Check token in browser console
const session = await KlarpakkeAuth.getSession();
console.log('Token:', session?.access_token);
console.log('Expires:', new Date(session?.expires_at * 1000));
```

If token is missing or expired, call `KlarpakkeAuth.login()` again.

### Issue: CORS error in browser

**Solution:**
1. Verify Webflow domain matches CORS config in Edge Functions
2. Check browser console for exact error
3. Verify preflight (OPTIONS) requests are handled
4. Update CORS_ORIGIN environment variable if needed:

```bash
supabase secrets set CORS_ORIGIN=https://your-actual-domain.com
supabase functions deploy
```

### Issue: RLS blocking requests

**Solution:**
```sql
-- Check user role
SELECT get_user_role(auth.uid());

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'signals';

-- Temporarily disable RLS for testing (DO NOT DO IN PRODUCTION)
ALTER TABLE signals DISABLE ROW LEVEL SECURITY;
-- Test
-- Re-enable
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
```

### Issue: Edge Function not updating

**Solution:**
```bash
# Force redeploy
supabase functions deploy approve-signal --no-verify-jwt=false

# Check function logs
supabase functions logs approve-signal --follow

# Verify function code
supabase functions list
```

---

## 📝 Post-Deployment Checklist

- [ ] All test users can login
- [ ] Signal approval works
- [ ] Audit logs are created
- [ ] Rate limiting works
- [ ] Permissions enforced correctly
- [ ] CORS configured properly
- [ ] Backups enabled
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team onboarded
- [ ] Support email configured
- [ ] Incident response plan ready

---

## 🔄 Continuous Deployment

Once deployed, any push to `main` will:

1. Run CI checks (lint, test, security)
2. Deploy database migrations (if any)
3. Deploy Edge Functions
4. Create GitHub issues for rejected signals (via webhook)

To disable auto-deploy, edit `.github/workflows/deploy-supabase.yml`

---

## 📞 Support

- **Documentation**: `/docs` folder
- **Issues**: GitHub Issues
- **Email**: support@klarpakke.com

---

## 🎓 Next Steps

After successful deployment:

1. **Monitor Performance**: Track metrics for 1-2 weeks
2. **Gather Feedback**: Talk to users, identify pain points
3. **Plan Improvements**: Prioritize features from roadmap
4. **Regular Maintenance**: Weekly security updates, monthly reviews

---

**Congratulations on deploying Klarpakke! 🚀**

**Version**: 1.0.0
**Deployment Date**: 2026-01-29
