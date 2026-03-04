# Pre-Launch Checklist (10 Points)

Before opening Klarpakke beta to more users, go through this checklist. Mark each as ✅ when verified.

---

## 1. ✅ Deploy Chain

- [ ] Run `bash scripts/beta-full-deploy-local.sh`
- [ ] Verify output: `✓ Build successful`
- [ ] Verify output: `✓ Deploy successful`
- [ ] Verify output: `✓ Health checks pass`
- [ ] Check terminal for any red flags or errors

**Command:**
```bash
bash scripts/beta-full-deploy-local.sh
```

**Expected Result:**
```
✓ Building... (73 pages)
✓ Deployed to klarpakke
✓ Health check: 200 OK
```

---

## 2. ✅ Language and Text (No Missing Translations)

### Norwegian Site
- [ ] Visit `https://www.klarpakke.no/no/beta/apply`
  - Check: No "undefined" text
  - Check: All form labels visible
  - Check: All buttons have text

- [ ] Visit `https://www.klarpakke.no/no/beta/connect-exchange`
  - Check: Header, description, labels all visible
  - Check: Security note readable

- [ ] Visit `https://www.klarpakke.no/no/beta/dashboard`
  - Check: Dashboard loads
  - Check: All sections have titles

### English Site
- [ ] Visit `https://www.klarpakke.no/en/beta/apply`
  - Check: Same as above in English

- [ ] Visit `https://www.klarpakke.no/en/beta/connect-exchange`
  - Check: All text in English

- [ ] Visit `https://www.klarpakke.no/en/beta/dashboard`
  - Check: Dashboard in English

### Language Toggle
- [ ] (After implementing) Test language switcher in header
  - Switch from `/no/beta/apply` to `/en/beta/apply`
  - Verify URL changes to `/en/beta/apply`
  - Verify page language changes
  - Switch back to Norwegian
  - Verify no layout breaks

---

## 3. ✅ Beta Form Submission

### Form Submission Test
- [ ] Visit `https://www.klarpakke.no/no/beta/apply`
- [ ] Fill in form:
  - Trading experience: Select "Intermediate"
  - Motivation: Enter at least 20 characters
  - Risk tolerance: Select "Moderate"
- [ ] Click "Submit"

### Expected Results
- [ ] Page loads without errors (check browser console)
- [ ] After submission:
  - Either redirect to success page
  - OR show "Application received" message
  - OR show "You already have beta access" (if already applied)

### Database Check
- [ ] Open Supabase dashboard
- [ ] Check `beta_applications` table
- [ ] Verify new record exists with your data
  - Column `user_id` matches your login
  - Column `trading_experience` = "intermediate"
  - Column `application_status` = "pending" or "approved"

---

## 4. ✅ Authentication Flow

### Signup
- [ ] Visit `https://www.klarpakke.no/no/innlogging`
- [ ] Click "Registrer deg" (or signup button)
- [ ] Enter:
  - Email: `test-2026@example.com` (new address each test)
  - Password: `TestPassword123!`
- [ ] Click "Create Account"

### Expected
- [ ] No errors in console
- [ ] Redirect to dashboard or confirmation page
- [ ] Email verification (check spam folder)

### Login
- [ ] Use test email and password from above
- [ ] Click "Logg inn"

### Expected
- [ ] Redirect to `/no/dashboard`
- [ ] Dashboard loads (may show empty if no trades yet)

### Profile
- [ ] Click on profile/settings
- [ ] View profile information
- [ ] Verify your email is correct

### Logout
- [ ] Click logout button
- [ ] Redirect to home page
- [ ] Try accessing `/no/dashboard` → should redirect to login

---

## 5. ✅ Stripe Payment (Test)

### Setup
- Use Stripe test mode (NOT production)
- Stripe test card: `4242 4242 4242 4242`
- Expiry: `12/34` (future date)
- CVC: `123`

### Payment Flow
- [ ] Visit `https://www.klarpakke.no/no/priser`
- [ ] Click "Start gratis prøveperiode" on any paid tier
- [ ] You're redirected to Stripe checkout
- [ ] Enter test card details
- [ ] Click "Pay"

### Expected Results
- [ ] Success page loads
- [ ] No errors in browser console
- [ ] Check Supabase:
  - Go to `subscriptions` table
  - Verify new row with `status: 'active'`
  - Verify `tier` is set to your chosen plan

### Cancel Subscription
- [ ] Go to profile/settings
- [ ] Find "Manage subscription"
- [ ] Click "Cancel"

### Expected
- [ ] Subscription status changes to `cancelled`
- [ ] User can re-subscribe

---

## 6. ✅ Trading Demo (Paper Trading)

### Dashboard Navigation
- [ ] Visit `/no/beta/dashboard` (logged in)
- [ ] Check sections visible:
  - Portfolio
  - Recent signals
  - Quick stats

### Paper Trading Simulator
- [ ] Find "New Trade" or "Simulator" button
- [ ] Create test trade:
  - Type: Buy
  - Coin: BTC
  - Amount: 0.5
  - Risk tolerance: Moderate
- [ ] Click "Execute"

### Expected
- [ ] Trade executes without error
- [ ] Trade appears in history
- [ ] Portfolio updates

### Check History
- [ ] Visit `/no/handelshistorikk` (trading history)
- [ ] Your test trade appears
- [ ] Shows buy/sell status, amount, date

---

## 7. ✅ Mobile Testing (Real Phone)

### Test Device
- Use iPhone or Android (not just browser dev tools)
- Test both portrait and landscape
- Recommended: test on 2-3 screen sizes

### Pages to Test
- [ ] Homepage (`/no`)
  - Scrollable, readable text
  - CTA buttons clickable

- [ ] Login (`/no/innlogging`)
  - Form fields full width
  - Buttons clickable
  - No overflow text

- [ ] Beta Apply (`/no/beta/apply`)
  - Form inputs work
  - Dropdowns open properly
  - Submit button accessible

- [ ] Dashboard (`/no/beta/dashboard`)
  - Cards stack vertically
  - No clipped content
  - Numbers readable (not too small)

- [ ] Pricing (`/no/priser`)
  - Cards visible
  - Price readable
  - CTA buttons clickable

### Checklist for Each Page
- [ ] Text is readable (no tiny fonts)
- [ ] Buttons are clickable (not cramped)
- [ ] No content cuts off at edges
- [ ] Forms work (can input text, select options)
- [ ] Navigation works
- [ ] Landscape mode also works

---

## 8. ✅ Performance & SEO (Lighthouse)

### Run Lighthouse
```bash
# Go to Lighthouse in Chrome DevTools (F12 → Lighthouse)
# OR use online: https://pagespeed.web.dev/
```

### Test URLs
- [ ] `https://www.klarpakke.no/no` (Norwegian home)
- [ ] `https://www.klarpakke.no/en` (English home)
- [ ] `https://www.klarpakke.no/no/beta/apply` (Beta form)

### Targets
- Performance: **90+**
- Best Practices: **90+**
- SEO: **90+**
- Accessibility: **90+**

### If Below Target
- [ ] Note the 2-3 easiest fixes
- [ ] Prioritize:
  1. Image optimization
  2. Meta tags (title, description)
  3. Unused CSS/JS

### Examples of Easy Wins
- Add proper `alt` text to images
- Set correct `<title>` for each page
- Preload critical fonts
- Optimize hero image size

---

## 9. ✅ Monitoring Setup

### Basic Monitoring (Ready Now)
- [ ] Copy and save this command:
  ```bash
  bash scripts/recovery/verify-prod.sh https://www.klarpakke.no
  ```
- [ ] Run it once to verify it works
- [ ] Expected output: All checks pass (green)

### Check Every Day (Before Launch)
```bash
bash scripts/recovery/verify-prod.sh https://www.klarpakke.no
```

**Monitoring checks:**
- ✅ Website responds (200 OK)
- ✅ Database connected
- ✅ Auth system working
- ✅ Critical pages load

### Future: Error Tracking
- Plan to add **Sentry** or **Rollbar** next week
- This will give you real user errors (not just local)
- Helps debug production issues fast

---

## 10. ✅ Overall Sign-Off

Before opening to more beta users, confirm:

- [ ] Deploy chain works every time
- [ ] No missing text/translations on key pages
- [ ] Beta form → submits → appears in database
- [ ] Full auth flow works (signup, login, logout, profile)
- [ ] Stripe test payment works
- [ ] Paper trading demo works end-to-end
- [ ] Mobile experience is good (tested on real device)
- [ ] Lighthouse scores are 90+ (at least on homepage)
- [ ] Health check script runs successfully
- [ ] You have a plan for error monitoring

---

## When You Can Tick All 10 Boxes ✅

You're ready for a **safe beta launch** with real users.

**Next steps:**
1. Share the link with 10-20 trusted testers
2. Collect feedback (which features work, what's broken)
3. Fix any issues before expanding further
4. Monitor daily with verify-prod.sh script
5. Plan full launch once solid feedback from beta cohort

---

## Quick Command Reference

```bash
# Deploy
bash scripts/beta-full-deploy-local.sh

# Check health
bash scripts/recovery/verify-prod.sh https://www.klarpakke.no

# View logs/errors
# (Open browser console: F12 → Console)
# Check for red errors, warnings

# Test Supabase directly
# Go to: https://app.supabase.com/
# (Your project → Tables → beta_applications)
```

---

**Checklist created:** 2026-02-10
**Target completion:** 2026-02-11
**Ready for next launch phase:** When all 10 items ✅
