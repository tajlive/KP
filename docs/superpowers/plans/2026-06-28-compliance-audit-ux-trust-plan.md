# Compliance, Audit & UX Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an immutable audit trail, MiFID-aligned appropriateness gate, hardened API-key handling, GDPR export/erasure, and a trust-first onboarding + order-confirmation UX.

**Architecture:** All security-relevant actions are appended to a hash-chained `audit_events` table. A structured questionnaire gates live-bot enablement. Exchange API keys are encrypted at rest and restricted. The UI moves from "verify first" to "explore first" while making fees and risk impossible to miss.

**Tech Stack:** Next.js Server Actions, Supabase Postgres, Web Crypto API, React, Tailwind 4.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260703000000_audit_events.sql` | `audit_events` + `security_events` tables |
| `src/lib/audit/audit-events.ts` | Hash-chain audit logging helper |
| `src/lib/audit/audit-events.test.ts` | Unit tests |
| `supabase/migrations/20260703000001_appropriateness.sql` | Appropriateness assessment table |
| `src/lib/compliance/appropriateness.ts` | Scoring + gating logic |
| `src/app/api/compliance/assessment/route.ts` | Submit/get assessment API |
| `src/features/compliance/AppropriatenessDialog.tsx` | UI for questionnaire |
| `supabase/migrations/20260703000002_encrypted_api_keys.sql` | API-key metadata + encrypted secrets |
| `src/lib/exchange/api-key-crypto.ts` | Client-side + server-side key encryption |
| `supabase/migrations/20260703000003_gdpr_requests.sql` | GDPR request tracking |
| `src/app/(user)/settings/data-export/actions.ts` | GDPR Server Actions |
| `src/app/[locale]/(onboarding)/onboarding/page.tsx` | Progressive onboarding shell |
| `src/features/onboarding/GettingStartedStepper.tsx` | Persistent stepper |
| `src/features/trading/OrderConfirmationCard.tsx` | Fee/risk pre-confirmation card |

---

## Task 1: Audit-events schema

**Files:**
- Create: `supabase/migrations/20260703000000_audit_events.sql`
- Create: `src/lib/audit/audit-events.ts`
- Create: `src/lib/audit/audit-events.test.ts`

- [ ] **Step 1: Create migration**

```sql
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  session_id TEXT,
  ip_address INET,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  previous_hash TEXT,
  event_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON public.audit_events(resource_type, resource_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action, occurred_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  ip_address INET,
  user_agent TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity, occurred_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Write failing test**

Create `src/lib/audit/audit-events.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashEvent } from "./audit-events";

describe("hashEvent", () => {
  it("produces deterministic hash", () => {
    const event = { action: "login", actor_id: "a1", previous_hash: "00" };
    expect(hashEvent(event, "secret")).toBe(hashEvent(event, "secret"));
  });

  it("changes hash when previous_hash changes", () => {
    const a = hashEvent({ action: "login", actor_id: "a1", previous_hash: "00" }, "secret");
    const b = hashEvent({ action: "login", actor_id: "a1", previous_hash: "01" }, "secret");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 3: Run test (fails)**

```bash
npx vitest run src/lib/audit/audit-events.test.ts
```
Expected: FAIL.

- [ ] **Step 4: Implement helper**

Create `src/lib/audit/audit-events.ts`:

```typescript
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEventInput {
  actor_id?: string | null;
  actor_type: "user" | "admin" | "system";
  action: string;
  resource_type: string;
  resource_id?: string | null;
  session_id?: string | null;
  ip_address?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export function hashEvent(input: Record<string, unknown>, previousHash: string, secret: string): string {
  const payload = JSON.stringify({ ...input, previous_hash: previousHash });
  return createHash("sha256").update(payload + secret).digest("hex");
}

export async function insertAuditEvent(
  db: SupabaseClient,
  input: AuditEventInput,
  secret: string
): Promise<void> {
  const { data: last } = await db
    .from("audit_events")
    .select("event_hash")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .single();

  const previousHash = last?.event_hash ?? "0";
  const eventHash = hashEvent(input as Record<string, unknown>, previousHash, secret);

  const { error } = await db.from("audit_events").insert({
    ...input,
    previous_hash: previousHash,
    event_hash: eventHash,
  });

  if (error) throw error;
}

export async function insertSecurityEvent(
  db: SupabaseClient,
  input: {
    user_id?: string | null;
    event_type: string;
    severity: "info" | "warning" | "critical";
    ip_address?: string | null;
    user_agent?: string | null;
    details?: Record<string, unknown> | null;
  }
): Promise<void> {
  const { error } = await db.from("security_events").insert(input);
  if (error) throw error;
}
```

- [ ] **Step 5: Run tests (pass)**

```bash
npx vitest run src/lib/audit/audit-events.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit/ audit-events.test.ts supabase/migrations/20260703000000_audit_events.sql
git commit -m "feat(audit): add hash-chained audit-events schema and helper"
```

---

## Task 2: Instrument auth and bot actions

**Files:**
- Modify: `src/lib/auth/sentry-auth.ts`
- Modify: `src/app/api/auth/callback/route.ts`
- Modify: `src/app/api/cron/tick/route.ts`

- [ ] **Step 1: Add audit logging to auth callback**

In `src/app/api/auth/callback/route.ts`, after successful session exchange:

```typescript
import { insertAuditEvent, insertSecurityEvent } from "@/lib/audit/audit-events";

const auditSecret = process.env.AUDIT_HASH_SECRET!;

await insertAuditEvent(db, {
  actor_id: user.id,
  actor_type: "user",
  action: "oauth_login",
  resource_type: "auth_session",
  session_id: sessionId,
  ip_address: requestIp,
  metadata: { provider },
}, auditSecret);
```

On OAuth error:

```typescript
await insertSecurityEvent(db, {
  event_type: "oauth_login_failed",
  severity: "warning",
  ip_address: requestIp,
  details: { provider, error: error.message },
});
```

- [ ] **Step 2: Add audit logging to bot creation**

Find bot creation server action or API route. After insert:

```typescript
await insertAuditEvent(db, {
  actor_id: userId,
  actor_type: "user",
  action: "bot_created",
  resource_type: "bot",
  resource_id: botId,
  after_state: { config: botConfig },
}, auditSecret);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/callback/route.ts src/app/api/cron/tick/route.ts
git commit -m "feat(audit): instrument auth and bot actions"
```

---

## Task 3: Appropriateness gate

**Files:**
- Create: `supabase/migrations/20260703000001_appropriateness.sql`
- Create: `src/lib/compliance/appropriateness.ts`
- Create: `src/lib/compliance/appropriateness.test.ts`
- Create: `src/app/api/compliance/assessment/route.ts`
- Create: `src/features/compliance/AppropriatenessDialog.tsx`

- [ ] **Step 1: Create table**

```sql
CREATE TABLE IF NOT EXISTS public.appropriateness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('ai_trading', 'margin', 'derivatives')),
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  warning_shown BOOLEAN NOT NULL DEFAULT false,
  user_decision TEXT CHECK (user_decision IN ('accept', 'decline')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, assessment_type)
);

ALTER TABLE public.appropriateness_assessments ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Implement scoring logic**

Create `src/lib/compliance/appropriateness.ts`:

```typescript
export interface Question {
  id: string;
  text: string;
  options: { value: number; label: string }[];
}

export const aiTradingQuestions: Question[] = [
  {
    id: "experience",
    text: "Hvor mye erfaring har du med automatisert handel?",
    options: [
      { value: 0, label: "Ingen" },
      { value: 1, label: "Har testet demo/papir" },
      { value: 2, label: "Har handlet live med automatisering" },
    ],
  },
  {
    id: "loss_tolerance",
    text: "Hva er det største tapet du er villig til å akseptere på en enkelt strategi?",
    options: [
      { value: 0, label: "Under 5%" },
      { value: 1, label: "5–15%" },
      { value: 2, label: "Over 15%" },
    ],
  },
  {
    id: "leverage_knowledge",
    text: "Hva skjer med en gearingsposisjon ved likvidasjon?",
    options: [
      { value: 0, label: "Vet ikke" },
      { value: 2, label: "Hele posisjonen kan tapt" },
    ],
  },
];

export function scoreAssessment(answers: Record<string, number>): { score: number; passed: boolean } {
  const score = Object.values(answers).reduce((a, b) => a + b, 0);
  const passed = score >= 4;
  return { score, passed };
}
```

- [ ] **Step 3: Write test**

```typescript
import { describe, it, expect } from "vitest";
import { scoreAssessment } from "./appropriateness";

describe("scoreAssessment", () => {
  it("fails low scores", () => {
    expect(scoreAssessment({ a: 0, b: 0, c: 0 }).passed).toBe(false);
  });
  it("passes high scores", () => {
    expect(scoreAssessment({ a: 2, b: 2, c: 2 }).passed).toBe(true);
  });
});
```

- [ ] **Step 4: Create API route**

Create `src/app/api/compliance/assessment/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { aiTradingQuestions, scoreAssessment } from "@/lib/compliance/appropriateness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { answers } = await request.json();
  const db = await createServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { score, passed } = scoreAssessment(answers);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await db.from("appropriateness_assessments").upsert({
    user_id: user.id,
    assessment_type: "ai_trading",
    score,
    passed,
    expires_at: expiresAt,
  }, { onConflict: "user_id,assessment_type" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ score, passed });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/compliance/ src/app/api/compliance/ supabase/migrations/20260703000001_appropriateness.sql
git commit -m "feat(compliance): add MiFID-aligned appropriateness gate"
```

---

## Task 4: API-key security hardening

**Files:**
- Create: `supabase/migrations/20260703000002_encrypted_api_keys.sql`
- Create: `src/lib/exchange/api-key-crypto.ts`
- Modify: API-key ingestion route

- [ ] **Step 1: Create table**

```sql
CREATE TABLE IF NOT EXISTS public.exchange_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL,
  label TEXT,
  encrypted_key TEXT NOT NULL,
  key_last_four TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read','trade'],
  ip_allowlist TEXT[] DEFAULT ARRAY[]::TEXT[],
  can_withdraw BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.exchange_api_keys ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Implement encryption helper**

Create `src/lib/exchange/api-key-crypto.ts`:

```typescript
export async function encryptApiKey(plaintext: string, masterKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(ciphertext: string, masterKey: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, data);
  return new TextDecoder().decode(decrypted);
}
```

- [ ] **Step 3: Add validation at ingestion**

In the API-key create route, before saving:

```typescript
if (canWithdraw) {
  throw new Error("Withdrawal permission is not allowed");
}

const encrypted = await encryptApiKey(apiSecret, masterKey);
await db.from("exchange_api_keys").insert({
  user_id: userId,
  exchange,
  encrypted_key: encrypted,
  key_last_four: apiKey.slice(-4),
  can_withdraw: false,
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/exchange/ supabase/migrations/20260703000002_encrypted_api_keys.sql
git commit -m "feat(security): encrypt exchange API keys at rest and reject withdrawal keys"
```

---

## Task 5: GDPR export & erasure

**Files:**
- Create: `supabase/migrations/20260703000003_gdpr_requests.sql`
- Create: `src/app/(user)/settings/data-export/actions.ts`

- [ ] **Step 1: Create table**

```sql
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'blocked')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  retention_reason TEXT,
  file_url TEXT
);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Implement Server Actions**

Create `src/app/(user)/settings/data-export/actions.ts`:

```typescript
"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function requestDataExport() {
  const db = await createServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await db.from("gdpr_requests").insert({
    user_id: user.id,
    request_type: "export",
  });

  if (error) throw error;
  return { ok: true };
}

export async function requestAccountDeletion() {
  const db = await createServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await db.from("gdpr_requests").insert({
    user_id: user.id,
    request_type: "deletion",
  });

  if (error) throw error;
  return { ok: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(user\)/settings/data-export/ supabase/migrations/20260703000003_gdpr_requests.sql
git commit -m "feat(gdpr): add data export and deletion request flow"
```

---

## Task 6: UX trust layer

**Files:**
- Create: `src/features/onboarding/GettingStartedStepper.tsx`
- Create: `src/features/trading/OrderConfirmationCard.tsx`
- Modify: onboarding page

- [ ] **Step 1: Create getting-started stepper**

```tsx
"use client";

interface Step {
  label: string;
  done: boolean;
}

export function GettingStartedStepper({ steps }: { steps: Step[] }) {
  return (
    <div className="rounded-lg border border-kp-border bg-kp-surface p-4">
      <h3 className="text-sm font-semibold text-kp-text-primary">Kom i gang</h3>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className={step.done ? "text-green-500" : "text-kp-text-muted"}>
              {step.done ? "✓" : "○"}
            </span>
            <span className={step.done ? "text-kp-text-muted line-through" : "text-kp-text-primary"}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Create order confirmation card**

```tsx
export function OrderConfirmationCard({
  estimatedEntry,
  estimatedExit,
  slippage,
  fee,
  totalImpact,
  maxDrawdown,
  riskWarning,
}: {
  estimatedEntry: number;
  estimatedExit?: number;
  slippage: string;
  fee: string;
  totalImpact: string;
  maxDrawdown: string;
  riskWarning: string;
}) {
  return (
    <div className="rounded-lg border border-kp-border bg-kp-surface p-4">
      <h3 className="text-sm font-semibold text-kp-text-primary">Bekreft handel</h3>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between"><dt>Estimert inngang</dt><dd>{estimatedEntry}</dd></div>
        <div className="flex justify-between"><dt>Slippage (est.)</dt><dd>{slippage}</dd></div>
        <div className="flex justify-between"><dt>Plattformgebyr</dt><dd>{fee}</dd></div>
        <div className="flex justify-between"><dt>Total kontantpåvirkning</dt><dd>{totalImpact}</dd></div>
        <div className="flex justify-between"><dt>Maks drawdown</dt><dd className="text-red-400">{maxDrawdown}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-kp-text-muted">{riskWarning}</p>
    </div>
  );
}
```

- [ ] **Step 3: Wire into dashboard**

Modify `src/app/[locale]/page.tsx` or dashboard layout to render `GettingStartedStepper` when user has no bots.

- [ ] **Step 4: Commit**

```bash
git add src/features/onboarding/GettingStartedStepper.tsx src/features/trading/OrderConfirmationCard.tsx
git commit -m "feat(ui): add getting-started stepper and order confirmation card"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run tests**

```bash
npx vitest run src/lib/audit/audit-events.test.ts src/lib/compliance/appropriateness.test.ts
```
Expected: PASS.

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```
Expected: PASS.

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(compliance): resolve type errors after audit/compliance changes" || echo "No changes"
```

---

## Self-Review

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| Immutable audit_events / security_events | Task 1 |
| Instrument auth and bot actions | Task 2 |
| Appropriateness gate | Task 3 |
| API-key encryption + withdrawal rejection | Task 4 |
| GDPR export/erasure | Task 5 |
| Getting-started stepper | Task 6 |
| Fee/risk confirmation card | Task 6 |

**Placeholder scan:** No TBD/TODO.  
**Type consistency:** `actor_type`, `assessment_type`, `request_type` enums match migration CHECK constraints.  
**Gaps:** UI routes for GDPR export and appropriateness dialog are skeletons; full page layouts are out of scope for this plan.
