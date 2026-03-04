# 🎯 Element ID Reference Guide

Complete reference for all element IDs needed in Webflow Designer.

---

## 📖 How to Use This Guide

1. Create your page in Webflow Designer
2. Find the page section below
3. Select each element in Designer
4. In Settings panel → Element Settings, add the ID
5. IDs are **case-sensitive** - use exact spelling

---

## 🏠 Home Page (Landing)

### Navigation

| Element | ID | Purpose |
|---------|-----|---------|
| Nav container | `main-nav` | Navigation bar |
| CTA button in nav | `nav-cta` | "Get Started" button |
| Logo link | `logo-link` | Link to home page |

### Hero Section

| Element | ID | Purpose |
|---------|-----|---------|
| Hero container | `hero-section` | Main hero section |
| Main heading | `hero-heading` | Primary headline |
| Subheading | `hero-subheading` | Supporting text |
| CTA button | `hero-cta` | Primary action button |
| Hero image | `hero-image` | Main visual |

### Features Section

| Element | ID | Purpose |
|---------|-----|---------|
| Features container | `features-section` | Features section wrapper |
| Feature 1 | `feature-1` | First feature card |
| Feature 2 | `feature-2` | Second feature card |
| Feature 3 | `feature-3` | Third feature card |
| Feature 1 icon | `feature-1-icon` | Icon for feature 1 |
| Feature 1 heading | `feature-1-heading` | Feature 1 title |
| Feature 1 text | `feature-1-text` | Feature 1 description |

**Repeat for features 2 and 3**

### CTA Section

| Element | ID | Purpose |
|---------|-----|---------|
| CTA container | `cta-section` | Bottom CTA section |
| CTA heading | `cta-heading` | CTA headline |
| CTA button | `cta-button` | Final call-to-action |

### Footer

| Element | ID | Purpose |
|---------|-----|---------|
| Footer container | `main-footer` | Site footer |
| Footer nav | `footer-nav` | Footer navigation links |
| Copyright text | `footer-copyright` | Copyright notice |

---

## 💰 Pricing Page

### Pricing Header

| Element | ID | Purpose |
|---------|-----|---------|
| Pricing section | `pricing-section` | Pricing page wrapper |
| Pricing heading | `pricing-heading` | Main heading |
| Pricing subheading | `pricing-subheading` | Supporting text |

### Pricing Cards

| Element | ID | Purpose |
|---------|-----|---------|
| Free plan card | `plan-free` | Free tier card |
| Free plan price | `plan-free-price` | Price display |
| Free plan CTA | `plan-free-cta` | Sign up button |
| Premium plan card | `plan-premium` | Premium tier card |
| Premium plan price | `plan-premium-price` | Price display |
| Premium plan CTA | `plan-premium-cta` | Subscribe button |
| Pro plan card | `plan-pro` | Professional tier card |
| Pro plan price | `plan-pro-price` | Price display |
| Pro plan CTA | `plan-pro-cta` | Subscribe button |

### Features Comparison

| Element | ID | Purpose |
|---------|-----|---------|
| Comparison table | `pricing-comparison` | Features comparison |
| Feature rows | `.pricing-feature` | Individual features (class) |

---

## 🔐 Login Page

### Form Elements

| Element | ID / Data Attribute | Purpose | Required |
|---------|---------------------|---------|----------|
| Form element | `data-login-form` | Form wrapper | ✅ |
| Email input | `data-login-email` | Email field | ✅ |
| Password input | `data-login-password` | Password field | ✅ |
| Submit button | `data-login-submit` | Login button | ✅ |
| Error message | `data-login-error` | Error display | ✅ |
| Success message | `data-login-success` | Success display | Optional |
| Forgot password link | `data-forgot-password` | Reset link | Optional |

**Important:** Login page uses **data attributes**, not IDs!

### Display States

| Element | Initial State | Purpose |
|---------|---------------|---------|
| Error message | `display: none` | Shows on error |
| Success message | `display: none` | Shows on success |

---

## ✍️ Signup Page

### Form Elements

| Element | Data Attribute | Purpose | Required |
|---------|----------------|---------|----------|
| Form element | `data-signup-form` | Form wrapper | ✅ |
| Email input | `data-signup-email` | Email field | ✅ |
| Password input | `data-signup-password` | Password field | ✅ |
| Confirm password | `data-signup-password-confirm` | Password confirmation | ✅ |
| Terms checkbox | `data-signup-terms` | Terms acceptance | ✅ |
| Submit button | `data-signup-submit` | Signup button | ✅ |
| Error message | `data-signup-error` | Error display | ✅ |
| Success message | `data-signup-success` | Success display | Optional |
| Login link | `data-signup-login-link` | Link to login | Optional |

**Important:** Signup page uses **data attributes**, not IDs!

### Validation

- Email: Must be valid format
- Password: Minimum 8 characters
- Password confirm: Must match password
- Terms: Must be checked

---

## 📊 Dashboard Page

### Header

| Element | ID | Purpose |
|---------|-----|---------|
| Dashboard container | `dashboard-container` | Main wrapper |
| Welcome text | `user-welcome` | "Welcome, [name]" |
| User menu | `user-menu` | User dropdown |
| Logout button | `logout-btn` | Sign out |

### Stats Section

| Element | ID | Purpose |
|---------|-----|---------|
| Stats container | `stats-container` | Stats row wrapper |
| Signals stat | `stat-signals` | Total signals count |
| Profit stat | `stat-profit` | Profit/loss display |
| Win rate stat | `stat-winrate` | Win percentage |

### Signals Section

| Element | ID / Class | Purpose | Type |
|---------|------------|---------|------|
| Signals section | `signals-section` | Signals wrapper | ID |
| Filter bar | `signals-filter` | Status filter | ID |
| Signals list | `signals-list` | Container for cards | ID |
| Loading indicator | `signals-loading` | "Loading..." | ID |
| Signal card | `.signal-card` | Card template | **CLASS** |

**Important:** `.signal-card` must be a **CLASS**, not an ID. This template will be cloned by JavaScript for each signal.

### Signal Card Structure

| Element | Class | Purpose |
|---------|-------|---------|
| Asset name | `.signal-asset` | BTC, ETH, etc. |
| Direction | `.signal-direction` | LONG/SHORT |
| Entry price | `.signal-entry` | Entry point |
| Stop loss | `.signal-sl` | Stop loss price |
| Take profit | `.signal-tp` | Target price |
| Timestamp | `.signal-time` | Created date |
| Status badge | `.signal-status` | pending/approved/rejected |
| Approve button | `.signal-approve` | Admin only |
| Reject button | `.signal-reject` | Admin only |

### Signal Status Classes

Apply these classes for styling:

| Class | Background | Use |
|-------|------------|-----|
| `.signal-pending` | Yellow | Status = pending |
| `.signal-approved` | Green | Status = approved |
| `.signal-rejected` | Red | Status = rejected |

---

## 🧮 Calculator Page (Risk Calculator)

### Form

| Element | ID | Purpose |
|---------|-----|---------|
| Calculator container | `calculator-container` | Main wrapper |
| Account balance input | `calc-balance` | Portfolio size |
| Risk percentage input | `calc-risk-percent` | Risk % per trade |
| Entry price input | `calc-entry` | Entry point |
| Stop loss input | `calc-stoploss` | Stop loss price |
| Calculate button | `calc-button` | Run calculation |
| Results container | `calc-results` | Display results |

### Results Display

| Element | ID | Purpose |
|---------|-----|---------|
| Position size | `calc-result-size` | Calculated position |
| Risk amount | `calc-result-risk` | Dollar risk |
| Risk/reward ratio | `calc-result-rr` | R:R ratio |

---

## ⚙️ Settings Page

### Profile Section

| Element | ID | Purpose |
|---------|-----|---------|
| Settings container | `settings-container` | Main wrapper |
| Profile section | `profile-section` | User info section |
| User email display | `user-email` | Show current email |
| Avatar upload | `avatar-upload` | Profile picture |
| Edit profile button | `edit-profile-btn` | Edit profile |

### Preferences Section

| Element | ID | Purpose |
|---------|-----|---------|
| Preferences section | `preferences-section` | Settings section |
| Email notifications | `pref-email` | Email checkbox |
| Push notifications | `pref-push` | Push checkbox |
| Timezone select | `pref-timezone` | Timezone dropdown |
| Language select | `pref-language` | Language dropdown |
| Save button | `preferences-save-btn` | Save settings |

### Security Section

| Element | ID | Purpose |
|---------|-----|---------|
| Security section | `security-section` | Security settings |
| Change password button | `change-password-btn` | Password modal |
| Enable 2FA button | `enable-2fa-btn` | 2FA setup |
| Active sessions | `active-sessions-list` | Session list |

### Danger Zone

| Element | ID | Purpose |
|---------|-----|---------|
| Danger zone | `danger-zone` | Destructive actions |
| Delete account button | `delete-account-btn` | Delete account |
| Logout button | `logout-btn` | Sign out |

---

## 🔄 Common Elements (All Pages)

### Authentication UI

These elements show/hide based on auth state:

| Element | Data Attribute | Behavior |
|---------|----------------|----------|
| Logged in only | `data-auth-required` | Hidden when logged out |
| Logged out only | `data-auth-hidden` | Hidden when logged in |
| User email | `data-user-email` | Shows user email |
| User name | `data-user-name` | Shows user name |

**Example:**
```html
<div data-auth-required>
  Welcome, <span data-user-email></span>
</div>

<a href="/login" data-auth-hidden>Login</a>
```

---

## ✅ Validation Checklist

Use this to verify all IDs are applied:

### Home Page
- [ ] `hero-heading`, `hero-subheading`, `hero-cta`
- [ ] `feature-1`, `feature-2`, `feature-3`
- [ ] `cta-section`, `cta-button`
- [ ] `main-nav`, `nav-cta`, `main-footer`

### Pricing Page
- [ ] `pricing-section`, `pricing-heading`
- [ ] `plan-free`, `plan-premium`, `plan-pro`
- [ ] All CTA buttons have IDs

### Login Page
- [ ] `data-login-form`, `data-login-email`, `data-login-password`
- [ ] `data-login-submit`, `data-login-error`
- [ ] Error message set to `display: none`

### Signup Page
- [ ] `data-signup-form`, `data-signup-email`, `data-signup-password`
- [ ] `data-signup-password-confirm`, `data-signup-terms`
- [ ] `data-signup-submit`, `data-signup-error`

### Dashboard
- [ ] `dashboard-container`, `signals-list`, `signals-loading`
- [ ] `.signal-card` template exists (CLASS not ID)
- [ ] All signal card elements have correct classes
- [ ] `logout-btn` present

### Calculator
- [ ] `calculator-container`, all input IDs
- [ ] `calc-button`, `calc-results`

### Settings
- [ ] `settings-container`, `user-email`
- [ ] All preference checkboxes
- [ ] `logout-btn`

---

## 🎨 Styling Tips

### ID vs Class

- **IDs** - For JavaScript targeting (unique per page)
- **Classes** - For styling (reusable)

Example:
```html
<div id="hero-section" class="section hero">
  <h1 id="hero-heading" class="heading heading-xl">
    Klarpakke
  </h1>
</div>
```

### Naming Convention

We use `kebab-case` for all IDs:
- ✅ `hero-heading`
- ✅ `nav-cta`
- ✅ `signal-card`
- ❌ `heroHeading` (camelCase)
- ❌ `hero_heading` (snake_case)
- ❌ `HeroHeading` (PascalCase)

### Semantic Naming

IDs should describe the element's purpose:
- ✅ `user-welcome` - Welcome message
- ✅ `signals-list` - List of signals
- ❌ `div-1` - Not descriptive
- ❌ `container-blue` - Describes style, not purpose

---

## 🔍 Testing IDs

### In Browser Console

Check if element exists:

```javascript
// By ID
document.getElementById('hero-heading');

// By data attribute
document.querySelector('[data-login-email]');

// By class
document.querySelector('.signal-card');
```

### Webflow Preview

1. Publish or preview site
2. Open DevTools (F12)
3. Use Elements tab to inspect IDs
4. Verify IDs match this guide

---

## 🆘 Common Issues

### "Element not found"

**Problem:** JavaScript can't find element

**Solutions:**
1. Check spelling (case-sensitive!)
2. Verify ID is applied in Designer
3. Check correct attribute (ID vs data-attribute vs class)
4. Ensure element is in DOM (not hidden with `display: none` on parent)

### IDs Not Working

**Problem:** IDs present but functionality broken

**Solutions:**
1. Check for duplicate IDs (only one element per ID)
2. Verify JavaScript is loaded
3. Check console for errors
4. Ensure element is correct type (input, button, etc.)

### Classes vs IDs Confusion

**Remember:**
- `.signal-card` - CLASS (dot prefix)
- `#hero-heading` - ID (hash prefix)
- `[data-login-email]` - Data attribute (brackets)

---

## 📖 Quick Reference

### Must-Have IDs

**Every site needs:**
- `logout-btn` - For logout functionality
- All `data-login-*` attributes - For login forms
- All `data-signup-*` attributes - For signup forms
- `.signal-card` class - For signal display

**Optional but recommended:**
- `data-auth-required` - Show when logged in
- `data-auth-hidden` - Hide when logged in
- `data-user-email` - Display user email
- `data-user-name` - Display user name

---

**Version:** 1.0.0
**Last Updated:** 2026-01-29
**Status:** ✅ Production Ready
