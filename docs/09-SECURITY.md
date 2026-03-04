# Security

> **Versjon:** 1.0.0  
> **Oppdatert:** 2026-02-10  
> **For:** Utviklere, administratorer

---

## Security Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Cloudflare                                            │
│  ├── DDoS Protection                                            │
│  ├── Web Application Firewall (WAF)                             │
│  ├── SSL/TLS (HTTPS only)                                       │
│  └── Rate Limiting                                              │
│                                                                  │
│  Layer 2: Application (Next.js)                                 │
│  ├── Input Validation (Zod)                                     │
│  ├── XSS Protection                                             │
│  ├── CSRF Tokens                                                │
│  └── Security Headers                                           │
│                                                                  │
│  Layer 3: Database (Supabase)                                   │
│  ├── Row Level Security (RLS)                                   │
│  ├── Prepared Statements                                        │
│  ├── Connection Pooling                                         │
│  └── Audit Logging                                              │
│                                                                  │
│  Layer 4: Infrastructure                                        │
│  ├── Environment Variables                                      │
│  ├── Secrets Management                                         │
│  └── Access Control                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### Supabase Auth

- **Provider:** Supabase Auth (GoTrue)
- **Methods:** Email/password, OAuth (Google)
- **Session:** JWT tokens, 1-week expiry
- **Storage:** httpOnly cookies

### JWT Token Flow

```
1. User logs in
   ↓
2. Supabase validates credentials
   ↓
3. JWT generated (contains user ID)
   ↓
4. Token sent in Authorization header
   ↓
5. Supabase validates JWT signature
   ↓
6. auth.uid() available in RLS
```

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one number
- No common passwords

---

## Authorization

### Role-Based Access Control (RBAC)

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | System administrator | Full access |
| `analyst` | Data analyst | Read analytics, no write |
| `trader` | Beta user | Trading features |
| `student` | Standard user | Basic features |

### Role Assignment

```sql
-- Grant admin role
UPDATE profiles SET role = 'admin' WHERE email = 'taj@klarpakke.no';

-- Check role
SELECT email, role FROM profiles WHERE role = 'admin';
```

---

## Row Level Security (RLS)

### RLS Policies

All tables have RLS enabled. Examples:

```sql
-- Users can only see own data
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can only update own data
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Admins can do anything
CREATE POLICY "Admins have full access"
ON profiles FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND role = 'admin'
));
```

### RLS Best Practices

1. **Always enable RLS:**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **Use auth.uid():**
   ```sql
   -- ✅ Good
   USING (auth.uid() = user_id)
   
   -- ❌ Bad
   USING (current_user = 'authenticated')
   ```

3. **Test policies:**
   ```bash
   bash scripts/test-rls.sh
   ```

---

## Secrets Management

### Environment Variables

```bash
# .env.local (local development)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# NEVER commit this file!
```

### GitHub Actions Secrets

| Variable | Scope | Encrypted |
|----------|-------|-----------|
| `SUPABASE_ACCESS_TOKEN` | Production | ✅ |
| `SUPABASE_PROJECT_ID` | Production | ❌ |
| `CLOUDFLARE_API_TOKEN` | Production | ✅ |

### Secrets Check

```bash
# Scan for hardcoded secrets
bash scripts/check-secrets.sh
```

Checks for:
- Stripe keys (`sk_live_`, `pk_live_`)
- Database passwords
- Private keys
- API tokens

---

## Input Validation

### Zod Schema Validation

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['student', 'trader', 'admin']),
});

// Validate input
const result = UserSchema.safeParse(userInput);
if (!result.success) {
  throw new Error('Invalid input');
}
```

### SQL Injection Prevention

```typescript
// ✅ Good (parameterized query)
const { data } = await supabase
  .from('profiles')
  .select()
  .eq('id', userId);  // Parameterized

// ❌ Bad (string concatenation)
const query = `SELECT * FROM profiles WHERE id = '${userId}'`;
```

---

## Security Headers

### Next.js Configuration

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval'",
        },
      ],
    },
  ];
}
```

---

## Audit Logging

### Admin Actions

All admin actions are logged:

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now(),
  ip_address inet
);
```

### Viewing Logs

```sql
-- Recent admin actions
SELECT * FROM audit_logs 
WHERE action IN ('UPDATE', 'DELETE')
ORDER BY created_at DESC
LIMIT 100;
```

---

## Security Checklist

### Pre-Deploy

- [ ] All tables have RLS enabled
- [ ] All RLS policies tested
- [ ] No hardcoded secrets in code
- [ ] Environment variables set in CI
- [ ] Security headers configured
- [ ] Input validation on all forms
- [ ] HTTPS enforced

### Regular (Monthly)

- [ ] Rotate API keys
- [ ] Review admin access
- [ ] Check audit logs
- [ ] Update dependencies
- [ ] Run security scan

---

## Incident Response

### Security Breach Response

1. **Immediate (0-1 hour)**
   - Disable compromised accounts
   - Rotate exposed secrets
   - Preserve logs

2. **Short-term (1-24 hours)**
   - Identify scope of breach
   - Notify affected users
   - Patch vulnerability

3. **Long-term (1-7 days)**
   - Post-mortem analysis
   - Update security procedures
   - Additional monitoring

### Contact

- **Security issues:** security@klarpakke.no
- **Emergency:** taj@klarpakke.no

---

## Related

- [runbooks/emergency-stop-robot.md](runbooks/emergency-stop-robot.md)
- [ARCHITECTURE.md](01-ARCHITECTURE.md) - Security layers
- [DATABASE.md](02-DATABASE.md) - RLS details
