# 🧩 Klarpakke Designer Extension - Complete Guide

**Version:** 2.0.0
**Status:** Production Ready
**Location:** `webflow-extension/`

---

## Overview

The Klarpakke Designer Extension is a **React-based Webflow Designer Application** that provides a visual UI for bulk editing, validating, and managing Webflow pages and elements.

### Key Features

✅ **Bulk Editor** - Update 100+ elements on multiple pages at once
✅ **Live Validation** - Check contract compliance in real-time
✅ **Auto Repair** - Automatically fix missing DOM anchors
✅ **Real-Time Progress** - See updates happening live
✅ **Contract Integration** - Validates against `webflow/contract/klarpakke-pages.v1.json`
✅ **Webflow Designer APIs** - Uses official Webflow SDKs

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Chrome/Firefox/Safari browser
- Webflow Designer access

### Quick Start (5 minutes)

**Step 1: Install Dependencies**
```bash
cd webflow-extension
npm install
```

**Step 2: Start Development Server**
```bash
npm run dev
# Extension runs on http://localhost:1337
```

You should see:
```
VITE v4.4.5  ready in 123 ms

➜  Local:   http://localhost:1337/
```

**Step 3: Load in Webflow Designer**
1. Open Webflow Designer
2. Click **Apps** in left sidebar
3. Click **Developer Apps** (or **+** icon)
4. Select **Load local extension**
5. Paste: `http://localhost:1337`
6. Click **Load**

**Step 4: Extension Opens**
- You should see the Klarpakke extension panel
- Icon appears in right sidebar
- Ready to use!

**Step 5: Stop Development**
```bash
# Press Ctrl+C in terminal when done
```

---

## Using the Extension

### Tab 1: Oversikt (Overview)

**Shows:**
- Site name and ID
- Total number of pages
- Site status
- Page list with completion percentage

**Actions:**
- Refresh site data
- View page details
- Check overall health

### Tab 2: 🚀 Bulk Editor (NEW!)

**Most powerful tool for batch operations**

#### 4-Step Wizard

##### Step 1: Select Pages
- See all 25 pages
- Checkbox each page you want to update
- "Select All" and "Clear" buttons
- Shows count of selected pages

```
☑️ Dashboard
☑️ Settings
☑️ History
☐ Quiz
☐ ...
```

##### Step 2: Define Updates

Specify what to change:

1. **Selector** (CSS selector for the element)
   ```
   Examples:
   #hero-headline       (ID)
   .button-primary      (Class)
   button[data-action]  (Attribute)
   ```

2. **Update Type** (What to change)
   - **Text Content** - Change text/heading
   - **Link (href)** - Change button/link destination
   - **Image (src)** - Change image source

3. **New Value** (What to change it to)
   ```
   Examples:
   "Welcome to Klarpakke"
   "https://example.com/page"
   "https://cdn.example.com/new-image.png"
   ```

Click **"Add Update Rule"** for each change.

**Example: Update Email Button on 3 Pages**
```
Selector: button[data-action="email"]
Type: Text Content
Value: "Send Email Now"
→ Add Update Rule

Selector: button[data-action="email"]
Type: Link (href)
Value: "mailto:contact@klarpakke.no"
→ Add Update Rule
```

##### Step 3: Execute

- Review summary of changes
- Confirm # of pages: 3
- Confirm # of rules: 2
- Click **"Execute Updates"**
- See real-time progress

##### Step 4: Results

- ✅ Success count
- ❌ Error count
- Detailed report for each page
- Can see exact error messages

**Ready for new operation:** Click "Start Over"

### Tab 3: Opprett Sider (Create Pages)

Create new pages from templates.

**Steps:**
1. Enter page name and slug
2. Choose template (marketing, app, auth, error)
3. Set SEO metadata
4. Click "Create"

**Examples:**
```
Name: "Nye Features"
Slug: "nye-features"
Template: marketing
SEO Title: "Nye Features - Klarpakke"
```

### Tab 4: Element IDs

Manage element IDs and data attributes.

**Features:**
- View all elements with IDs
- Copy IDs to clipboard
- Update element IDs
- Filter by element type

### Tab 5: SEO

Validate and optimize SEO settings.

**Checks:**
- Meta titles
- Meta descriptions
- og:image tags
- Canonical URLs
- Heading structure

### Tab 6: Custom Code

Inject custom JavaScript and CSS.

**Sections:**
- **HEAD code** - Supabase client, config
- **FOOTER code** - Custom JS
- **Site-wide CSS** - Global styles

### Tab 7: Assets

Upload and manage images/files.

**Capabilities:**
- Upload multiple files
- View existing assets
- Get asset URLs
- Delete unused assets

### Tab 8: 1-Click Deploy

One-button deployment of entire site.

**Steps:**
1. Review all changes
2. Click "Deploy"
3. Site publishes automatically
4. Get success/error report

---

## Architecture

### File Structure

```
webflow-extension/
├── src/
│   ├── App.tsx                 # Main app component
│   ├── App.css                 # Global styles
│   ├── main.tsx                # Entry point
│   │
│   ├── api/
│   │   └── webflow-sdk.ts      # Webflow API wrapper
│   │
│   ├── components/
│   │   ├── BulkEditor.tsx      # ⭐ NEW - Bulk edit component
│   │   ├── SiteOverview.tsx    # Site info display
│   │   ├── PageCreator.tsx     # Create new pages
│   │   ├── ElementIDManager.tsx # Manage element IDs
│   │   ├── OneClickDeploy.tsx  # Deploy site
│   │   ├── CustomCodeInjector.tsx # Inject code
│   │   ├── SEOValidator.tsx    # SEO validation
│   │   └── AssetUploader.tsx   # Upload assets
│   │
│   ├── hooks/                  # Custom React hooks
│   └── utils/                  # Utility functions
│
├── package.json                # Dependencies
├── tsconfig.json              # TypeScript config
└── vite.config.ts             # Build config
```

### Technology Stack

- **Framework:** React 18.2.0
- **Build:** Vite 4.4.5
- **Language:** TypeScript 5.0.2
- **Icons:** lucide-react 0.263.1
- **CSS:** CSS-in-JS (inline styles)

### How It Works

```
1. User opens Designer
2. Loads extension from localhost:1337
3. Extension connects to Webflow Designer context
4. User selects pages and defines updates
5. SDK executes updates via Designer APIs
6. Changes appear in real-time
7. Report generated with results
```

---

## Webflow SDK Reference

Located in `src/api/webflow-sdk.ts`

### Main Class: WebflowSDK

#### Methods

**`getPages(): Promise<PageObject[]>`**
```typescript
const sdk = new WebflowSDK();
const pages = await sdk.getPages();
// Returns: [{ id, title, slug, path }, ...]
```

**`createPage(data: PageData): Promise<PageObject>`**
```typescript
const page = await sdk.createPage({
  title: 'New Page',
  slug: 'new-page',
  description: 'Page description',
  seoTitle: 'New Page | Klarpakke'
});
```

**`updatePage(pageId: string, updates: Partial<PageData>): Promise<PageObject>`**
```typescript
const updated = await sdk.updatePage('page-123', {
  title: 'Updated Title',
  seoDescription: 'New description'
});
```

**`getPageElements(pageId: string): Promise<ElementObject[]>`**
```typescript
const elements = await sdk.getPageElements('page-123');
// Returns elements with id, type, text, href, src
```

**`updateElement(elementId: string, updates: UpdateElementData): Promise<ElementObject>`**
```typescript
await sdk.updateElement('#hero-headline', {
  text: 'New headline',
  attrs: { 'data-version': '2.0' }
});
```

**`deleteElement(elementId: string): Promise<void>`**
```typescript
await sdk.deleteElement('#old-banner');
```

---

## Contract Validation

The extension validates against `webflow/contract/klarpakke-pages.v1.json`

### Contract Structure

```json
{
  "version": "1.5.0",
  "pages": [
    {
      "path": "/",
      "name": "Home",
      "anchors": [
        { "kind": "root", "tag": "div", "attrs": { "id": "klarpakke-home-root" } },
        { "kind": "form", "tag": "input", "attrs": { "data-login-email": "" } },
        ...
      ]
    },
    ...
  ]
}
```

### Validation Checks

1. **Page Existence** - All contract pages must exist in Webflow
2. **Anchor Presence** - All required anchors must be present on each page
3. **Element Structure** - DOM structure matches contract specification
4. **Attribute Compliance** - Required data-* attributes are set

### Repair Mode

If validation fails:
1. Opens Repair dialog
2. Shows missing anchors
3. Click "Auto Repair"
4. Automatically adds missing elements

---

## Advanced Usage

### Custom Selectors

Use CSS selectors to target elements:

```
# By ID
#element-id

# By class
.button-primary
.text-large

# By attribute
[data-action="email"]
[data-version="2.0"]

# Combination
button[data-action="submit"].primary
div#main-content > h1

# Pseudo-selectors (limited support)
li:first-child
.item:nth-child(2)
```

### Bulk Update Scenarios

#### Scenario 1: Update All Headlines
```
Pages: [Select All]
Rule 1: h1 → Text: "New Main Heading"
Rule 2: h2 → Text: "New Sub Heading"
Execute → 25 pages updated
```

#### Scenario 2: Update Button Links
```
Pages: [5 sales pages]
Rule 1: button[data-cta] → href: "https://app.klarpakke.no/signup"
Execute → 5 pages updated
```

#### Scenario 3: Update Images
```
Pages: [Dashboard, Settings, Help]
Rule 1: img.logo → src: "https://cdn.klarpakke.no/logo-v2.png"
Rule 2: img.banner → src: "https://cdn.klarpakke.no/banner-2026.png"
Execute → 3 pages, 6 images updated
```

---

## Troubleshooting

### Issue: Extension doesn't load in Designer

**Solution:**
1. Check `npm run dev` is running on localhost:1337
2. Verify firewall allows localhost:1337
3. Try using IP instead: `http://127.0.0.1:1337`
4. Hard refresh Designer (Cmd+Shift+R)
5. Check console for errors (F12)

### Issue: Updates not appearing

**Solution:**
1. Check selector is correct (use browser DevTools)
2. Verify element exists in Designer
3. Check browser console for error messages
4. Try simpler selector (e.g., just ID instead of complex selector)

### Issue: "Could not find element"

**Solution:**
1. Element may be inside a component
2. Use browser Inspector to find the actual element
3. Component instances may use different IDs
4. Try selecting by class name instead

### Issue: Session expired

**Solution:**
1. Logout and login to Webflow Designer again
2. Refresh Designer page
3. Reload extension

---

## Development

### Build for Production

```bash
npm run build
# Creates optimized build in dist/
```

### Development Tips

**Hot Module Replacement (HMR)**
- Changes auto-reload in Designer
- No need to restart dev server

**Console Logging**
- Open DevTools (F12) in Designer
- All console.logs from extension visible
- Use browser Inspector to debug selectors

**TypeScript**
- Full TypeScript support
- Types for Webflow objects
- IDE autocomplete for APIs

---

## Performance

### Optimization Tips

1. **Selector Performance**
   - Use ID when possible: `#element-id` (fastest)
   - Avoid deep selectors: `div div div span` (slowest)
   - Combine with data attributes: `[data-action="email"]`

2. **Bulk Updates**
   - Update up to 100 elements per operation
   - 5-25 pages is comfortable size
   - Larger batches may be slower

3. **Contract Validation**
   - ~100ms for 25 pages
   - Caches results to avoid repeated checks

---

## Security

### What the Extension Can Do
- ✅ Read page structure and elements
- ✅ Modify element text, attributes, styles
- ✅ Create/delete pages
- ✅ Upload assets
- ✅ Inject custom code (JS/CSS)

### What It Cannot Do
- ❌ Access your Supabase database
- ❌ Read customer data
- ❌ Modify authentication
- ❌ Publish without permission

### Safety Features
- All changes are in Draft (not published)
- You must manually publish pages
- Undo available in Designer
- No data sent to external servers

---

## Tips & Best Practices

1. **Always backup** - Publish to staging first
2. **Test selectors** - Use browser Inspector to verify
3. **Use contract** - Validates your changes
4. **Small batches** - Test with 1-2 pages first
5. **Check results** - Review report after each operation
6. **Keep dev server running** - Extension needs localhost:1337

---

## Support

### Documentation
- `AUTO-DEPLOY-WEBFLOW.md` - All automation methods
- `CLAUDE.md` - Project overview
- `webflow/contract/klarpakke-pages.v1.json` - Contract spec

### Quick Links
- [Webflow Designer API Docs](https://developers.webflow.com/designer/reference/introduction)
- [GitHub Issues](https://github.com/tajlive/KP/issues)
- [Webflow Developer Forum](https://discourse.webflow.com)

---

**Last Updated:** February 1, 2026
**Version:** 2.0.0
