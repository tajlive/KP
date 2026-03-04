# 🚀 Deployment Checklist

Complete pre-launch checklist for Klarpakke.

---

## 📋 Pre-Launch Checklist

### ✅ Backend (Supabase)

- [x] Database schema deployed
- [x] Row Level Security policies active
- [x] Edge Functions deployed (`approve-signal`)
- [x] Authentication configured
- [x] CORS settings updated
- [x] Environment variables set
- [ ] Create test users (admin + regular user)
- [ ] Test database connections
- [ ] Verify RLS policies work
- [ ] Test Edge Functions locally

**Commands:**
```bash
# Test Supabase connection
supabase status

# Deploy functions
supabase functions deploy approve-signal

# Test Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/approve-signal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signal_id": "test", "action": "approve"}'
```

---

### 📄 Webflow Pages

**MVP Pages (Required):**
- [ ] Home (`/`) - Landing page
- [ ] Dashboard (`/app/dashboard`) - Signal dashboard
- [ ] Settings (`/app/settings`) - User settings
- [ ] Signup (`/signup`) - Registration
- [x] Login (`/login`) - Already exists
- [x] Pricing (`/pricing`) - Already exists
- [x] Calculator (`/app/kalkulator`) - Already exists

**Security Pages (Important):**
- [ ] Password Reset (`/reset-password`)
- [ ] Email Verification (`/verify-email`)
- [ ] 404 Error (`/404`)
- [ ] 403 Error (`/403`)
- [ ] 500 Error (`/500`)

**Legal Pages (Required):**
- [ ] Terms of Service (`/terms`)
- [ ] Privacy Policy (`/privacy`)

**Additional Pages (Nice to Have):**
- [ ] Trading History (`/app/history`)
- [ ] User Profile (`/app/profile`)
- [ ] Help & Support (`/help`)
- [ ] About Us (`/about`)

**Total:** 18 pages (7 exist, 11 to create)

---

### 💻 JavaScript Files

**Upload to Webflow Assets:**
- [ ] `auth.js` (11.4 KB) - Authentication system
- [ ] `login.js` (4.9 KB) - Login/signup forms
- [ ] `app-with-auth.js` (8.1 KB) - Dashboard
- [ ] `password-reset.js` (8.1 KB) - Password reset
- [ ] `email-verification.js` (5.9 KB) - Email verification
- [ ] `history.js` (9.6 KB) - Trading history
- [ ] `profile.js` (8.5 KB) - User profile
- [ ] `realtime.js` (9.1 KB) - Real-time updates
- [ ] `dashboard-roles.js` (9.4 KB) - Role-based views

**Total:** 10 files, ~75 KB

**Get Public URLs** for each uploaded file.

---

### 🎨 Custom Code

**Add to Project Settings → Custom Code:**

**HEAD Code:**
```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Configuration -->
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE'
  };
</script>
```

**FOOTER Code:**
```html
<!-- Authentication (All Pages) -->
<script src="YOUR_AUTH_JS_URL"></script>

<!-- Login/Signup Pages -->
<script>
  if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
    const script = document.createElement('script');
    script.src = 'YOUR_LOGIN_JS_URL';
    document.body.appendChild(script);
  }
</script>

<!-- Password Reset -->
<script>
  if (window.location.pathname === '/reset-password') {
    const script = document.createElement('script');
    script.src = 'YOUR_PASSWORD_RESET_JS_URL';
    document.body.appendChild(script);
  }
</script>

<!-- Email Verification -->
<script>
  if (window.location.pathname === '/verify-email') {
    const script = document.createElement('script');
    script.src = 'YOUR_EMAIL_VERIFICATION_JS_URL';
    document.body.appendChild(script);
  }
</script>

<!-- Dashboard Pages -->
<script>
  if (window.location.pathname.startsWith('/app/')) {
    const appScript = document.createElement('script');
    appScript.src = 'YOUR_APP_JS_URL';
    document.body.appendChild(appScript);

    const rolesScript = document.createElement('script');
    rolesScript.src = 'YOUR_DASHBOARD_ROLES_JS_URL';
    document.body.appendChild(rolesScript);

    const realtimeScript = document.createElement('script');
    realtimeScript.src = 'YOUR_REALTIME_JS_URL';
    document.body.appendChild(realtimeScript);

    // Conditional pages
    if (window.location.pathname === '/app/history') {
      const historyScript = document.createElement('script');
      historyScript.src = 'YOUR_HISTORY_JS_URL';
      document.body.appendChild(historyScript);
    }

    if (window.location.pathname === '/app/profile') {
      const profileScript = document.createElement('script');
      profileScript.src = 'YOUR_PROFILE_JS_URL';
      document.body.appendChild(profileScript);
    }
  }
</script>

<!-- Initialize Auth -->
<script>
  document.addEventListener('DOMContentLoaded', async function() {
    if (window.KlarpakkeAuth) {
      await KlarpakkeAuth.init(window.KLARPAKKE_CONFIG);

      // Protect /app/* pages
      if (window.location.pathname.startsWith('/app/')) {
        await KlarpakkeAuth.requireAuth();
      }
    }
  });
</script>
```

**Checklist:**
- [ ] HEAD code added
- [ ] FOOTER code added
- [ ] Replace all `YOUR_*_URL` with actual URLs
- [ ] Replace `YOUR_ANON_KEY_HERE` with actual Supabase anon key
- [ ] Test on staging first

---

### 🎯 Element IDs

**Apply IDs from `element-ids.json`:**

**Landing Page:**
- [ ] `hero-section` - Hero container
- [ ] `hero-headline` - Main heading
- [ ] `hero-subheadline` - Subheading
- [ ] `hero-cta` - CTA button
- [ ] `features-section` - Features container
- [ ] `feature-card` - Feature card (class)

**Dashboard:**
- [ ] `signals-container` - Main container
- [ ] `filters-section` - Filter bar
- [ ] `filter-all` - All button
- [ ] `signal-card` - Signal card template (class)
- [ ] `btn-approve` - Approve button (class)
- [ ] `btn-reject` - Reject button (class)

**Login:**
- [ ] `login-form` - Form element
- [ ] `email-input` - Email field
- [ ] `password-input` - Password field
- [ ] `login-button` - Submit button
- [ ] `login-error` - Error message (hidden)

**Signup:**
- [ ] `signup-form` - Form element
- [ ] `email-input` - Email field
- [ ] `password-input` - Password field
- [ ] `confirm-password-input` - Confirm password
- [ ] `signup-button` - Submit button
- [ ] `signup-error` - Error message (hidden)

**Settings:**
- [ ] `settings-container` - Main container
- [ ] `profile-section` - Profile section
- [ ] `security-section` - Security section
- [ ] `logout-button` - Logout button

*See `ELEMENT-ID-REFERENCE.md` for complete list.*

---

### 🔍 SEO Configuration

**Apply meta tags from `seo-optimization.json`:**

**For Each Page:**
1. Open page in Webflow Designer
2. Page Settings → SEO tab
3. Copy-paste from JSON:
   - Title tag
   - Meta description
   - OG tags

**Landing Page:**
- [ ] Title: "Klarpakke - Trygg Krypto-Trading"
- [ ] Description: "Profesjonelle trading-signaler..."
- [ ] Keywords added
- [ ] OG image set (1200x630px)

**Dashboard:**
- [ ] Meta robots: `noindex, nofollow` (logged-in only)

**Legal Pages:**
- [ ] Sitemap.xml includes Terms & Privacy
- [ ] Proper internal linking

---

### 🔒 Security

**Supabase:**
- [ ] RLS policies tested and active
- [ ] Service role key secured (never in frontend)
- [ ] Anon key in frontend only
- [ ] CORS restricted to your domain
- [ ] Rate limiting configured

**Webflow:**
- [ ] HTTPS enabled (automatic)
- [ ] No sensitive data in frontend code
- [ ] API keys not exposed
- [ ] CSP headers configured (if possible)

**Edge Functions:**
- [ ] JWT validation working
- [ ] Role checks implemented
- [ ] Input validation added
- [ ] Error handling in place

---

### 📊 Testing

**Authentication Flow:**
- [ ] Signup works
- [ ] Email verification sent
- [ ] Email verification link works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] Session persists across pages
- [ ] Session expires correctly

**Dashboard:**
- [ ] Signals load
- [ ] Admin can approve/reject (role-based)
- [ ] Users see approved only
- [ ] Real-time updates work
- [ ] Filters work
- [ ] Mobile responsive

**Forms:**
- [ ] Login form validation
- [ ] Signup form validation
- [ ] Password requirements enforced
- [ ] Error messages show (Norwegian)
- [ ] Success messages show

**Pages:**
- [ ] All links work
- [ ] Navigation works
- [ ] Footer links work
- [ ] 404 page shows for invalid URLs
- [ ] Mobile responsive (all pages)
- [ ] Fast load times (<3s)

**Browsers:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

### 🚀 Pre-Launch Final Checks

**Content:**
- [ ] All text in Norwegian
- [ ] No placeholder text (lorem ipsum)
- [ ] No "Coming soon" sections
- [ ] Contact email works
- [ ] Support email works
- [ ] All images have alt text

**Legal:**
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie banner implemented
- [ ] GDPR compliance verified
- [ ] Email confirmation required

**Performance:**
- [ ] Images optimized (WebP format)
- [ ] No console errors
- [ ] No broken links
- [ ] Fast load time (<3s)
- [ ] Mobile score >80 (Lighthouse)

**Analytics:**
- [ ] Google Analytics installed (optional)
- [ ] Conversion tracking set up (optional)
- [ ] Error tracking (Sentry) configured (optional)

---

### 📱 Social Media

**Open Graph Tags:**
- [ ] OG image (1200x630px)
- [ ] OG title
- [ ] OG description
- [ ] OG type: website

**Twitter Cards:**
- [ ] Twitter card: summary_large_image
- [ ] Twitter image
- [ ] Twitter title
- [ ] Twitter description

---

### 🎓 User Onboarding

**Test Accounts:**
- [ ] Admin account created
- [ ] Test user account created
- [ ] Test signals in database
- [ ] Test approval flow

**Documentation:**
- [ ] README updated
- [ ] Help page complete
- [ ] FAQ answered
- [ ] Video tutorials ready (optional)

---

### 🚀 Launch Day

**Pre-Launch (1 hour before):**
- [ ] Final backup of database
- [ ] All team members notified
- [ ] Support email monitored
- [ ] Test signup flow one last time

**Launch:**
- [ ] Change Webflow domain to production
- [ ] Update CORS in Supabase to production domain
- [ ] Test signup with real email
- [ ] Test payment (if applicable)
- [ ] Monitor error logs

**Post-Launch (First 24 hours):**
- [ ] Monitor signups
- [ ] Check error rates
- [ ] Respond to support emails
- [ ] Fix critical bugs immediately
- [ ] Celebrate! 🎉

---

### 📊 Monitoring

**Set Up:**
- [ ] Uptime monitoring (e.g., UptimeRobot)
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics)
- [ ] Performance monitoring

**Daily Checks:**
- [ ] Check error logs
- [ ] Monitor signup rate
- [ ] Check support emails
- [ ] Verify Edge Functions running

---

## 🆘 Troubleshooting

### Common Issues

**"Supabase not defined"**
- Check HEAD code is present
- Verify CDN script loads
- Check browser console

**"Not authorized" errors**
- Verify RLS policies
- Check JWT token
- Verify role in user metadata

**Signals not loading**
- Check Edge Function logs
- Verify API endpoint
- Check CORS settings
- Test with browser DevTools

**Email not sending**
- Verify Supabase Auth settings
- Check email templates
- Test with real email
- Check spam folder

---

## 📞 Emergency Contacts

**Technical Issues:**
- Supabase Support: support@supabase.io
- Webflow Support: support@webflow.com

**Your Team:**
- Developer: [Your email]
- Support: kontakt@klarpakke.no
- Admin: admin@klarpakke.no

---

## ✅ Launch Complete!

When all items are checked:
- [ ] **GO LIVE!** 🚀
- [ ] Announce on social media
- [ ] Send launch email to waitlist
- [ ] Monitor for first 48 hours
- [ ] Gather user feedback
- [ ] Plan improvements

---

**Version:** 1.0.0
**Last Updated:** 2026-01-29
**Status:** Ready for deployment
**Estimated Time:** 2-4 days of work

**LYKKE TIL MED LANSERINGEN! 🎉**
