# Cockpit Preview / "See as User X" UI/UX Design

> Status: Design recommendation only. Do not implement without plan approval.
> Owner: Preview UI/UX Designer
> Date: 2026-07-04

## 1. User choice
**B + C:** (B) Preview/share the Cockpit itself (screenshots/HTML report), and (C) admin-only support impersonation mode.

## 2. Design philosophy
The support team should not need cookie injection, manual Playwright incantations, or dangerous full-account takeovers. The UI is built around two minimal entry points:

1. **Admin Cockpit Preview drawer** — generate a snapshot of a user’s Cockpit without leaving the admin panel.
2. **Impersonation mode** — temporarily view the live app as a selected user, with a persistent, unmistakable exit path.

Both flows share a single **user selector** and **audit log** to keep the mental model small.

## 3. Recommended UX patterns

### A. User selection
Pattern: **Command palette / combobox search**, similar to Stripe Dashboard user search and Linear’s “Switch workspace”.
- Place in `/admin/users` and a global `/admin/preview` page.
- Search by `display_name`, `email`, or `user_id`.
- Recent / pinned users for the support agent (stored locally, no DB write needed).
- Show clear metadata: email, tier, created date, last sign-in.

### B. Preview/share the Cockpit (option B)
Pattern: **Side-by-side “Screenshot report”**, inspired by GitHub Actions summary cards and Vercel deployment previews.
- Triggered from the user selector with one click: **“Generate Cockpit report”**.
- Runs Playwright in an API route or Edge Function against the selected user’s `/no/handel` page.
- Result is a scrollable HTML report card with:
  - Full-page screenshot.
  - Key numbers at time of capture (balance, P&L, open positions, active session).
  - A shareable public link with a short-lived signed token (e.g., 24 h).
- The report is read-only and non-interactive, so it is safe to share internally.

### C. “See as user X” impersonation (option C)
Pattern: **“View as user” button with a high-visibility banner**, similar to Intercom/Samsara “Log in as user” and ServiceNow impersonation.
- Admin selects a user and clicks **“View as Viking_NO”**.
- Server issues a short-lived `impersonate` token (e.g., 15–60 minutes), writes an audit row, and sets a secure `__klp_preview` cookie + header.
- Browser navigates to the Cockpit (`/no/handel`).
- A fixed, non-dismissible banner is injected at the top of every page:
  - Left: **“You are viewing as Viking_NO (viking.no@klarpakke.test).”**
  - Center: countdown timer until the session expires.
  - Right: **“Exit preview”** button that returns the admin to `/admin/preview` and clears the cookie.
- All write actions are disabled or replaced with a tooltip in preview mode (read-only by default). If write actions are ever needed, each one requires a re-authentication step and is separately logged.

## 4. UI components required

| Component | Location | Purpose |
|-----------|----------|---------|
| `UserPreviewSelector` | `src/features/admin-preview/components/UserPreviewSelector.tsx` | Combobox search for users with recent pins. |
| `CockpitPreviewCard` | `src/features/admin-preview/components/CockpitPreviewCard.tsx` | Read-only screenshot + metrics report card. |
| `PreviewBanner` | `src/features/admin-preview/components/PreviewBanner.tsx` | Fixed impersonation banner injected via layout. |
| `PreviewAuditLog` | `src/features/admin-preview/components/PreviewAuditLog.tsx` | Table of recent preview/impersonation events. |
| `PreviewLayout` | `src/app/[locale]/(admin)/admin/preview/page.tsx` | Admin page composing the selector + audit log. |

## 5. Exact routes and pages to create or change

### New admin-facing pages
- `src/app/[locale]/(admin)/admin/preview/page.tsx` — central preview hub.
- `src/app/[locale]/(admin)/admin/preview/[userId]/page.tsx` — pre-selected user preview.
- `src/app/[locale]/(admin)/admin/preview/report/[token]/page.tsx` — read-only shared report viewer.

### New API routes (for reference; implementation is out of scope for this design task)
- `src/app/api/admin/preview/search-users/route.ts` — search users for the selector.
- `src/app/api/admin/preview/generate-report/route.ts` — generate screenshot + metrics report.
- `src/app/api/admin/preview/impersonate/route.ts` — issue impersonation cookie/token.
- `src/app/api/admin/preview/exit/route.ts` — clear impersonation state.

### Modified existing pages
- `src/app/[locale]/(admin)/admin/users/ClientAdminUsers.tsx` — add a row action **“Preview Cockpit”** and **“View as user”**.
- `src/app/[locale]/(user)/handel/page.tsx` and `src/app/[locale]/(user)/layout.tsx` — conditionally render `<PreviewBanner />` when `__klp_preview` cookie is present.
- `src/app/[locale]/(user)/layout.tsx` (or specific action routes) — reject write requests when impersonating unless explicitly elevated.

### Audit/logging
- New table `admin_preview_logs` (created by `klarpakke-db-rls-guard`): `id`, `admin_user_id`, `target_user_id`, `action` (`preview_report` | `impersonate_start` | `impersonate_end` | `impersonate_write`), `ip`, `user_agent`, `created_at`, `expires_at`.
- All preview/impersonate API routes write to this table before returning.

## 6. Security considerations

- **Admin gate:** every route uses `verifyAdminAccess()`; no fallback bypass.
- **No service-role in client:** server-side only, via `createClient(serviceRole)` inside API routes.
- **RLS intact:** impersonation is implemented via a server-signed cookie/headers, not by weakening RLS on Supabase tables.
- **Time-limit:** tokens expire server-side (15 min for impersonation, 24 h for shared reports). Cookies are `SameSite=Strict`, `Secure`, `HttpOnly`.
- **Read-only default:** the banner is always visible, and mutating routes reject `__klp_preview` sessions unless the action is explicitly allow-listed and logged.
- **Audit trail:** every start, end, screenshot generation, and elevated write is logged with admin + target user IDs and IP.
- **No PII leakage in shared report URLs:** tokens are opaque, signed, and short-lived; reports should be accessible only to logged-in admins or via the signed URL.
- **Exit path:** banner contains an obvious **“Exit preview”** control; closing the tab does not extend the session; the server-side token still expires on schedule.

## 7. Pros / cons

### Option B (screenshot/report) — pros
- Safest sharing: read-only, no live session, no PII surface beyond the single report.
- Useful for async debugging, Slack, and support tickets.
- No need to change the user-facing page layout beyond a read-only report route.

### Option B — cons
- Static: cannot interact with filters, pagination, or tabs beyond what was captured.
- Requires a headless browser or rendering pipeline, which adds infra cost.

### Option C (see as user) — pros
- Interactive troubleshooting: support sees the exact same UI state the user sees.
- Faster than “tell me what you see” support loops.

### Option C — cons
- Higher security risk if write actions are not carefully gated.
- Requires banner + session plumbing across every user route.
- Can be confused with the admin’s own account if the banner is not unmistakable.

### Combined B + C recommendation
Use **B for most support tickets** (share a report) and **C for escalations** where the user’s live state is needed. Both share the same user selector and audit log, keeping the admin UI simple.

## 8. Minimal UX flow (wireframe description)

```
/admin/preview
├─ Search user: [____________________] [🔍]
│  ├─ Viking_NO (viking.no@klarpakke.test) — Professor — last seen 2m ago
│  └─ … other users
│
├─ Selected: Viking_NO
│  ├─ [Generate Cockpit report]  → opens /admin/preview/report/<token>
│  └─ [View as Viking_NO]        → navigates to /no/handel with banner
│
└─ Recent audit
   ├─ 2026-07-04 12:01 — you — impersonation started — Viking_NO
   └─ 2026-07-04 11:45 — you — report generated — Viking_NO

/no/handel (while impersonating)
┌─────────────────────────────────────────────────────────┐
│ 🟡 You are viewing as Viking_NO. Expires in 12:34.  Exit │  ← fixed banner
└─────────────────────────────────────────────────────────┘
│   [Cockpit content rendered for Viking_NO, read-only]    │
```

## 9. Implementation order (suggested)

1. Schema migration: create `admin_preview_logs` (DB/RLS guard agent).
2. API routes: search users + generate report + impersonate/exit (coder/Cloudflare ops agent).
3. Admin UI: `/admin/preview` hub + user selector + audit log (this design).
4. User-side banner: add to `(user)` layout and disable mutating routes while impersonating.
5. E2E test: verify that an admin can preview Viking_NO and that write actions are rejected (tester agent).

## 10. References / forum patterns consulted

- Samsara, “Log in as Another User (User Impersonation)” — https://kb.samsara.com/hc/en-us/articles/360046654832
- Clerk, “Empower Your Support Team With User Impersonation” — https://clerk.com/blog/empower-support-team-user-impersonation
- ServiceNow, “Impersonating users” — https://www.servicenow.com/docs/r/zurich/platform-administration/user-administration/c_ImpersonateAUser.html
- Kuali Zendesk, “User Impersonation” — https://kuali.zendesk.com/hc/en-us/articles/41367292952347-User-Impersonation
- iTop, “Impersonate user for support” — https://www.itophub.io/wiki/page?id=extensions:combodo-impersonate
- Oso Cloud, “Impersonation policy pattern” — https://www.osohq.com/docs/develop/policies/patterns/impersonation
- Stripe embedded components / notification banner pattern — https://docs.stripe.com/connect/supported-embedded-components/notification-banner
