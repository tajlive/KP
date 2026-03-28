# KLA-*** TypeScript Fixes: Notification Routes

## Context

Two API routes have cascading `unknown` type errors from `req.json()` parsing:
- `src/app/api/v1/notifications/[action]/route.ts` (23 errors)
- `src/app/api/v1/webhooks/[provider]/route.ts` (1 error)

These errors block the safe-push (pre-commit TypeScript check).

## Root Cause

**`req.json()` returns `unknown` in Edge Runtime:**
```typescript
// Current (broken):
const body = await req.json(); // type: unknown
const { title, body: messageBody } = body; // ❌ TS2339: Property 'title' does not exist on type 'unknown'
```

**Should be typed:**
```typescript
// Fixed:
interface NotificationRequest {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  userIds?: string[];
  broadcast?: boolean;
}

const body = (await req.json()) as NotificationRequest;
const { title, body: messageBody } = body; // ✅ OK
```

## Solution

### Step 1: Define Request/Response Types

**File:** `src/types/api/notifications.ts` (create if missing)

```typescript
export interface SendNotificationRequest {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  userIds?: string[];
  broadcast?: boolean;
}

export interface SubscribeRequest {
  subscription: PushSubscription;
  channel?: string;
}

export interface UnsubscribeRequest {
  channel?: string;
}

export interface GetChannelsResponse {
  channels: string[];
}

export interface NotificationResult {
  success: boolean;
  userId?: string;
  error?: string;
}
```

### Step 2: Fix `/notifications/[action]/route.ts`

```typescript
import type { SendNotificationRequest, SubscribeRequest, UnsubscribeRequest } from "@/types/api/notifications";

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  
  // Type the body immediately after parsing
  const body = (await req.json()) as 
    | SendNotificationRequest 
    | SubscribeRequest 
    | UnsubscribeRequest;
  
  try {
    const {  { user } } = await supabase.auth.getUser();
    
    switch (action) {
      case "send": {
        const { title, body: messageBody, icon, url, userIds, broadcast } = body as SendNotificationRequest;
        // ... send logic
        break;
      }
      case "subscribe": {
        const { subscription, channel = "default" } = body as SubscribeRequest;
        // ... subscribe logic
        break;
      }
      case "unsubscribe": {
        const { channel = "default" } = body as UnsubscribeRequest;
        // ... unsubscribe logic  
        break;
      }
      // ...
    }
  } catch (error) {
    // ... error handling
  }
}
```

### Step 3: Fix `/webhooks/[provider]/route.ts`

```typescript
export async function POST(req: NextRequest) {
  // Type the request from the start
  const request = req as unknown as NextRequest; // or fix at source
  
  const provider = req.nextUrl.searchParams.get("provider");
  // ...
}
```

## Acceptance Criteria

- [ ] `src/app/api/v1/notifications/[action]/route.ts` — 0 TypeScript errors
- [ ] `src/app/api/v1/webhooks/[provider]/route.ts` — 0 TypeScript errors
- [ ] `npm run type-check` passes completely
- [ ] `safe-push.sh` completes without pre-commit TypeScript errors
- [ ] All unit tests still pass (226/230)

## Priority

**P1** — Blocks deployment, must fix before next push

## Related

- Lint fix commit: chore: fix 13 ESLint errors + warnings
- Issue: safe-push pre-commit hook correctly flagging TypeScript errors
