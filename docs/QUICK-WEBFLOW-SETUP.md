# ⚡ Quick Webflow Setup (5-10 minutes)

## 🎯 What You'll Do

Copy-paste pre-made HTML into Webflow Designer. That's it!

---

## Step 1: Open Webflow Designer

1. Go to https://webflow.com
2. Open `klarpakke-c65071` site
3. Click **Designer**

---

## Step 2: Setup Each Page (1 minute per page)

### Page 1: HOME (`/`)

1. Click **Pages** (left sidebar)
2. Find and click "Home" or "index" page
3. **Delete all current content** (select all, delete)
4. Click **Add** → **Code Block** OR click the `<>` icon (code view)
5. Open file: `/webflow-pages/home.html` in any text editor
6. Copy **everything between `<body>` tags** (not including `<body>` tags)
7. Paste into Webflow code block
8. Click **Save**

**Repeat for:**
- Login (`/login`) - use `webflow-pages/login.html`
- Signup (`/signup`) - use `webflow-pages/signup.html`
- Dashboard (`/app/dashboard`) - use `webflow-pages/dashboard.html`
- Settings (`/app/settings`) - use `webflow-pages/settings.html`

---

## Step 3: Add Element IDs

For each form element, set the ID:

1. Select element
2. Right panel → **ID** field
3. Enter ID from this list:

### Login Page IDs:
- Email input → `data-login-email`
- Password input → `data-login-password`
- Submit button → `data-login-submit`
- Error div → `data-login-error`

### Signup Page IDs:
- Email input → `data-signup-email`
- Password input → `data-signup-password`
- Confirm password → `data-signup-password-confirm`
- Terms checkbox → `data-signup-terms`
- Submit button → `data-signup-submit`
- Error div → `data-signup-error`

### Dashboard Page IDs:
- Container → `signals-container`
- Filters → `filters-section`
- Filter All button → `filter-all`
- Filter Buy button → `filter-buy`
- Filter Sell button → `filter-sell`
- Loading → `loading`
- Error → `error-message`

**Important:** Signal card should use `class="signal-card"` (NOT ID!)
Buttons inside cards: `class="btn-approve"` and `class="btn-reject"`

### Settings Page IDs:
- Profile section → `profile-section`
- Security section → `security-section`
- Notifications → `notifications-section`
- Save button → `save-settings-button`
- Cancel button → `cancel-button`
- Logout button → `logout-button`

---

## Step 4: Publish

1. Click **Publish** (top right)
2. Wait for deployment
3. Done! ✅

---

## ⏱️ Timeline

- Home page: 1 min
- Login page: 1 min (includes IDs)
- Signup page: 1 min (includes IDs)
- Dashboard page: 1 min (includes IDs)
- Settings page: 1 min (includes IDs)
- Publish: 1 min

**Total: 5-10 minutes**

---

## 💡 Pro Tips

1. **Use Find & Replace** in Webflow to quickly add IDs
2. **Copy-paste is safe** - HTML structure is simple
3. **You can undo** everything (Ctrl+Z)
4. **Preview** before publishing to check styling

---

## 🆘 If Something Goes Wrong

1. Delete the content
2. Try again
3. Or contact support

---

## ✅ When Complete

You should have:
- ✅ Home page with hero section
- ✅ Login page with form
- ✅ Signup page with registration
- ✅ Dashboard with signal cards
- ✅ Settings page with options
- ✅ All element IDs set
- ✅ Site published

**Next:** Add JavaScript files and custom code!

---

**Ready? Open Webflow Designer now!** 🚀
