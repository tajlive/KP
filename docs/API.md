# 📘 Klarpakke API Documentation

Complete API reference for Klarpakke Edge Functions.

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [POST /approve-signal](#post-approve-signal)
  - [GET /get-signals](#get-get-signals)
- [Data Models](#data-models)
- [Examples](#examples)

---

## Authentication

All API endpoints require authentication using JWT tokens from Supabase Auth.

### Headers

Every request must include:

```http
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

### Getting a Token

Authenticate users via Webflow frontend using Supabase Auth:

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

const token = data.session.access_token
```

### Token Expiration

- Tokens expire after **1 hour**
- Automatically refreshed by the frontend auth module
- If expired, you'll receive a `401 Unauthorized` response

---

## Rate Limiting

To prevent abuse, rate limiting is enforced per user.

### Limits

- **10 requests per minute** per user for approve-signal endpoint
- No rate limit on get-signals (protected by RLS)

### Headers

Rate limit information is returned in response headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
Retry-After: 42  # (only when rate limited)
```

### Rate Limit Response

When rate limit is exceeded:

```json
HTTP/1.1 429 Too Many Requests

{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 42
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message here"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input or validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions for this action |
| 404 | Not Found | Resource not found |
| 405 | Method Not Allowed | Wrong HTTP method used |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (contact support) |

---

## Endpoints

### POST /approve-signal

Approve or reject a trading signal.

#### URL

```
POST https://[YOUR-PROJECT-ID].supabase.co/functions/v1/approve-signal
```

#### Authorization

Required roles: `admin`, `trader`, `analyst`

#### Request Body

```json
{
  "signal_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "approve"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| signal_id | string (UUID) | Yes | ID of the signal to process |
| action | string | Yes | Either "approve" or "reject" |

#### Success Response

```json
HTTP/1.1 200 OK

{
  "success": true,
  "message": "Signal approved successfully",
  "signal_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "approve"
}
```

#### Error Responses

**Invalid UUID Format:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "signal_id must be a valid UUID"
}
```

**Invalid Action:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "action must be one of: approve, reject"
}
```

**Signal Already Processed:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "Signal has already been approved. Cannot process again."
}
```

**Signal Not Found:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "Signal not found"
}
```

**Unauthorized:**
```json
HTTP/1.1 401 Unauthorized

{
  "error": "Unauthorized. Please log in."
}
```

**Insufficient Permissions:**
```json
HTTP/1.1 403 Forbidden

{
  "error": "Insufficient permissions. Required roles: admin, trader, analyst"
}
```

#### Side Effects

1. Updates signal status in `signals` table
2. Sets `processed_by` to current user ID
3. Sets `processed_at` to current timestamp
4. Creates audit log entry in `audit_logs` table

#### Example Request

```bash
curl -X POST 'https://swfyuwkptusceiouqlks.supabase.co/functions/v1/approve-signal' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "signal_id": "550e8400-e29b-41d4-a716-446655440000",
    "action": "approve"
  }'
```

---

### GET /get-signals

Fetch trading signals with filtering and pagination.

#### URL

```
GET https://[YOUR-PROJECT-ID].supabase.co/functions/v1/get-signals
```

#### Authorization

Required: Any authenticated user

Role-based filtering:
- **Admin/Trader/Viewer**: See all signals
- **Analyst**: See only their own signals

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| status | string | No | "pending" | Filter by status: pending, approved, rejected |
| direction | string | No | - | Filter by direction: long, short |
| limit | integer | No | 20 | Number of results (max 100) |
| offset | integer | No | 0 | Pagination offset |

#### Success Response

```json
HTTP/1.1 200 OK

{
  "signals": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "BTC/USD Long Setup",
      "direction": "long",
      "confidence": 85,
      "status": "pending",
      "created_at": "2026-01-29T10:00:00.000Z",
      "created_by": "user-uuid-here"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "ETH/USD Short Entry",
      "direction": "short",
      "confidence": 72,
      "status": "pending",
      "created_at": "2026-01-29T09:30:00.000Z",
      "created_by": "user-uuid-here"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

#### Error Responses

**Unauthorized:**
```json
HTTP/1.1 401 Unauthorized

{
  "error": "Unauthorized. Please log in."
}
```

**Invalid Parameters:**
```json
HTTP/1.1 400 Bad Request

{
  "error": "Invalid query parameters"
}
```

#### Example Requests

**Get pending signals:**
```bash
curl -X GET 'https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals?status=pending' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Get approved long signals with pagination:**
```bash
curl -X GET 'https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals?status=approved&direction=long&limit=10&offset=20' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## Data Models

### Signal

```typescript
interface Signal {
  id: string                    // UUID
  title: string                 // Signal title
  direction: 'long' | 'short'   // Trade direction
  confidence: number            // 0-100
  status: 'pending' | 'approved' | 'rejected'
  created_at: string            // ISO 8601 timestamp
  created_by: string            // User UUID
  processed_by?: string         // User UUID (when processed)
  processed_at?: string         // ISO 8601 timestamp (when processed)
}
```

### User Roles

```typescript
type UserRole = 'admin' | 'trader' | 'analyst' | 'viewer'
```

**Permissions:**

| Role | View Signals | Create Signals | Approve/Reject | Admin Panel |
|------|--------------|----------------|----------------|-------------|
| admin | All | Yes | Yes | Yes |
| trader | All | Yes | Yes | No |
| analyst | Own only | Yes | No | No |
| viewer | All | No | No | No |

### Audit Log

```typescript
interface AuditLog {
  id: string                    // UUID
  user_id: string               // User who performed action
  action: string                // Action type (SIGNAL_APPROVED, etc.)
  signal_id?: string            // Related signal UUID
  timestamp: string             // ISO 8601 timestamp
  metadata: {
    user_email: string
    user_role: string
  }
}
```

---

## Examples

### Complete Workflow Example

**1. Login**

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'trader@example.com',
  password: 'securePassword123'
})

const token = data.session.access_token
```

**2. Fetch Pending Signals**

```javascript
const response = await fetch(
  'https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals?status=pending',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY
    }
  }
)

const { signals } = await response.json()
console.log(`Found ${signals.length} pending signals`)
```

**3. Approve a Signal**

```javascript
const signalId = signals[0].id

const response = await fetch(
  'https://swfyuwkptusceiouqlks.supabase.co/functions/v1/approve-signal',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      signal_id: signalId,
      action: 'approve'
    })
  }
)

const result = await response.json()
if (result.success) {
  console.log('Signal approved!')
}
```

**4. Error Handling**

```javascript
async function approveSignal(signalId) {
  try {
    const response = await fetch('/functions/v1/approve-signal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        signal_id: signalId,
        action: 'approve'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      // Handle specific errors
      if (response.status === 401) {
        console.error('Please log in again')
        // Redirect to login
      } else if (response.status === 429) {
        console.error(`Rate limited. Retry in ${data.retryAfter} seconds`)
      } else {
        console.error(`Error: ${data.error}`)
      }
      return
    }

    console.log('Success:', data)
  } catch (error) {
    console.error('Network error:', error)
  }
}
```

---

## Testing

### Local Testing with Supabase CLI

```bash
# Start local Supabase
supabase start

# Deploy functions locally
supabase functions serve approve-signal --no-verify-jwt

# Test endpoint
curl -i http://localhost:54321/functions/v1/approve-signal \
  -H "Authorization: Bearer test-token" \
  -d '{"signal_id":"550e8400-e29b-41d4-a716-446655440000","action":"approve"}'
```

### Production Testing

```bash
# Get your JWT token from Supabase Dashboard or auth flow
TOKEN="your-jwt-token"

# Test approve-signal
curl -X POST "https://swfyuwkptusceiouqlks.supabase.co/functions/v1/approve-signal" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"signal_id":"test-uuid","action":"approve"}'

# Test get-signals
curl -X GET "https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals?status=pending" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: your-anon-key"
```

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Never expose Service Role Key** to frontend
3. **Validate all inputs** before calling API
4. **Handle rate limits gracefully** with exponential backoff
5. **Store tokens securely** (never in localStorage for sensitive apps)
6. **Refresh tokens automatically** before expiration
7. **Log out users** on 401 responses
8. **Sanitize error messages** before showing to users

---

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR-USERNAME/klarpakke/issues)
- **Email**: support@klarpakke.com
- **Docs**: See other files in `/docs` directory

---

**Version**: 1.0.0
**Last Updated**: 2026-01-29
