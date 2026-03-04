# Klarpakke - Security Guide

Security best practices and hardening instructions.

---

## 🔐 Security Checklist

### Critical (Before Production)

- [ ] Change all default passwords
- [ ] Enable RLS on all tables
- [ ] Rotate Supabase service role key
- [ ] Set up proper CORS policies
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Set up audit logging
- [ ] Review all RLS policies
- [ ] Enable 2FA for admin accounts
- [ ] Set up security monitoring

### Important

- [ ] Implement session timeout
- [ ] Add CSRF protection
- [ ] Set up IP whitelisting (if applicable)
- [ ] Configure backup strategy
- [ ] Set up error monitoring (Sentry)
- [ ] Review Edge Function permissions
- [ ] Implement request signing
- [ ] Add input sanitization
- [ ] Set up WAF rules
- [ ] Document security procedures

### Recommended

- [ ] Penetration testing
- [ ] Security audit
- [ ] Dependency scanning
- [ ] Vulnerability scanning
- [ ] Security training for team
- [ ] Incident response plan
- [ ] Data retention policies
- [ ] GDPR compliance review

---

## 🛡️ Authentication Security

### Password Requirements

Enforce strong passwords in Supabase:

**Go to**: Authentication → Policies

```json
{
  "password": {
    "min_length": 12,
    "require_lowercase": true,
    "require_uppercase": true,
    "require_numbers": true,
    "require_special": true
  }
}
```

### Session Management

```javascript
// Set session timeout to 1 hour
const CONFIG = {
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour
  TOKEN_REFRESH_INTERVAL: 5 * 60 * 1000 // 5 minutes
};
```

### Two-Factor Authentication (2FA)

Enable in Supabase:
1. Go to **Authentication → Providers**
2. Enable "Phone" provider
3. Configure SMS provider (Twilio)
4. Update login flow to require 2FA

---

## 🔒 API Security

### Rate Limiting Configuration

Current limits in Edge Functions:
```typescript
const CONFIG = {
  RATE_LIMIT_WINDOW_MS: 60 * 1000,    // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10         // 10 requests/min
};
```

**Production Recommendations:**
- **Public endpoints**: 10 req/min
- **Authenticated endpoints**: 60 req/min
- **Admin endpoints**: 120 req/min

### CORS Configuration

**Current** (permissive):
```typescript
'Access-Control-Allow-Origin': '*'
```

**Production** (restrictive):
```typescript
const ALLOWED_ORIGINS = [
  'https://klarpakke-c65071.webflow.io',
  'https://your-custom-domain.com'
];

const origin = req.headers.get('origin');
if (ALLOWED_ORIGINS.includes(origin)) {
  headers['Access-Control-Allow-Origin'] = origin;
}
```

### API Key Protection

**Never expose** these keys in frontend:
- `SUPABASE_SERVICE_ROLE_KEY` ❌
- Database passwords ❌
- Private API keys ❌

**Safe to expose**:
- `SUPABASE_ANON_KEY` ✅ (with RLS enabled)
- Public project URL ✅

---

## 🗄️ Database Security

### Row Level Security (RLS)

Verify all tables have RLS enabled:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Enable RLS if missing
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
```

### Sensitive Data Encryption

For sensitive fields, use Supabase Vault:

```sql
-- Store encrypted API keys
INSERT INTO vault.secrets (name, secret)
VALUES ('trading_api_key', 'sk-...');

-- Retrieve in Edge Function
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'trading_api_key';
```

### Backup & Recovery

**Automated Backups** (Supabase Pro):
- Daily backups retained for 7 days
- Point-in-time recovery (PITR)

**Manual Backup**:
```bash
# Export database
supabase db dump > backup_$(date +%Y%m%d).sql

# Encrypt backup
gpg --encrypt backup_$(date +%Y%m%d).sql
```

---

## 🚨 Monitoring & Alerts

### Error Tracking

**Recommended**: Sentry

```javascript
// In auth.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});

// Capture errors
try {
  await authenticatedFetch(url, options);
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Audit Log Monitoring

```sql
-- Create view for suspicious activity
CREATE VIEW suspicious_activity AS
SELECT
  al.*,
  u.email
FROM audit_logs al
JOIN auth.users u ON al.user_id = u.id
WHERE
  -- Multiple rejections in short time
  action = 'SIGNAL_REJECTED'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 10;

-- Alert on suspicious activity
-- (Set up pg_cron or external monitoring)
```

### Failed Login Attempts

```sql
-- Track failed logins (requires custom auth setup)
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_failed_logins_email ON failed_login_attempts(email);

-- Lock account after 5 failed attempts
CREATE OR REPLACE FUNCTION check_failed_logins(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM failed_login_attempts
  WHERE email = user_email
    AND timestamp > NOW() - INTERVAL '15 minutes';

  RETURN attempt_count >= 5;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔍 Security Testing

### 1. Authentication Testing

```bash
# Test: Can't access without token
curl https://[PROJECT].supabase.co/functions/v1/approve-signal
# Expected: 401 Unauthorized

# Test: Can't use expired token
curl -H "Authorization: Bearer [EXPIRED-TOKEN]" \
  https://[PROJECT].supabase.co/functions/v1/approve-signal
# Expected: 401 Unauthorized

# Test: Can't use wrong role
# (Create user with 'viewer' role, try to approve signal)
# Expected: 403 Forbidden
```

### 2. Rate Limiting Testing

```bash
# Test: Rate limit triggers
for i in {1..15}; do
  curl -H "Authorization: Bearer [TOKEN]" \
    -X POST https://[PROJECT].supabase.co/functions/v1/approve-signal \
    -d '{"signal_id":"test","action":"approve"}'
done
# Expected: 429 Too Many Requests after 10 requests
```

### 3. SQL Injection Testing

```bash
# Test: SQL injection in signal_id
curl -H "Authorization: Bearer [TOKEN]" \
  -X POST https://[PROJECT].supabase.co/functions/v1/approve-signal \
  -d '{"signal_id":"1; DROP TABLE signals;--","action":"approve"}'
# Expected: 400 Bad Request (invalid UUID format)
```

### 4. XSS Testing

```bash
# Test: XSS in signal title
curl -H "Authorization: Bearer [TOKEN]" \
  -X POST https://[PROJECT].supabase.co/functions/v1/approve-signal \
  -d '{"signal_id":"valid-uuid","action":"<script>alert(1)</script>"}'
# Expected: 400 Bad Request (invalid action)
```

---

## 🚨 Incident Response

### 1. Suspected Breach

**Immediate Actions:**
1. Rotate all API keys and secrets
2. Review audit logs for suspicious activity
3. Lock affected user accounts
4. Enable IP whitelisting
5. Notify users if data exposed

```bash
# Rotate Supabase keys
# Go to: Dashboard → Settings → API → Reset service_role key

# Lock user account
UPDATE auth.users
SET banned_until = NOW() + INTERVAL '24 hours'
WHERE email = 'suspicious@user.com';
```

### 2. DDoS Attack

**Mitigation:**
1. Enable Supabase rate limiting
2. Set up CloudFlare (free tier)
3. Block malicious IPs

```sql
-- Block IP in database
CREATE TABLE blocked_ips (
  ip_address INET PRIMARY KEY,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

-- Check IP before processing
CREATE OR REPLACE FUNCTION is_ip_blocked(ip INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM blocked_ips WHERE ip_address = ip);
END;
$$ LANGUAGE plpgsql;
```

### 3. Data Leak

**Actions:**
1. Identify scope of leak
2. Restore from backup if needed
3. Notify affected users (GDPR requirement)
4. Document incident
5. Review and fix vulnerability

---

## 📜 Compliance

### GDPR Compliance

**Required Features:**

1. **Right to Access**
```sql
-- Export user data
CREATE OR REPLACE FUNCTION export_user_data(user_uuid UUID)
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'user', (SELECT row_to_json(u) FROM auth.users u WHERE id = user_uuid),
    'signals', (SELECT json_agg(s) FROM signals s WHERE created_by = user_uuid),
    'audit_logs', (SELECT json_agg(al) FROM audit_logs al WHERE user_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

2. **Right to Deletion**
```sql
-- Delete user data
CREATE OR REPLACE FUNCTION delete_user_data(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Anonymize signals
  UPDATE signals SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE signals SET processed_by = NULL WHERE processed_by = user_uuid;

  -- Delete audit logs
  DELETE FROM audit_logs WHERE user_id = user_uuid;

  -- Delete user role
  DELETE FROM user_roles WHERE user_id = user_uuid;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = user_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Data Retention

```sql
-- Auto-delete old data (run via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete audit logs older than 90 days
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';

  -- Archive old signals
  INSERT INTO signals_archive
  SELECT * FROM signals
  WHERE created_at < NOW() - INTERVAL '365 days';

  DELETE FROM signals
  WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 🔐 Security Headers

Add these headers in Webflow custom code:

```html
<script>
  // Content Security Policy
  document.head.innerHTML += `
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'self';
                   script-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
                   connect-src 'self' *.supabase.co;
                   img-src 'self' data: https:;
                   style-src 'self' 'unsafe-inline';">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta name="referrer" content="strict-origin-when-cross-origin">
  `;
</script>
```

---

## ✅ Security Audit Checklist

Before going to production:

### Infrastructure
- [ ] All secrets stored in environment variables
- [ ] No hardcoded credentials in code
- [ ] HTTPS enforced everywhere
- [ ] Database encryption at rest enabled
- [ ] Backups configured and tested
- [ ] Monitoring and alerting set up

### Authentication
- [ ] Strong password policy enforced
- [ ] 2FA enabled for admins
- [ ] Session timeout configured
- [ ] Failed login tracking implemented
- [ ] Account lockout after failed attempts

### Authorization
- [ ] RLS enabled on all tables
- [ ] All policies tested
- [ ] Principle of least privilege applied
- [ ] Role hierarchy documented
- [ ] API endpoints properly protected

### Data Protection
- [ ] Sensitive data encrypted
- [ ] PII handling documented
- [ ] Data retention policies set
- [ ] GDPR compliance verified
- [ ] Backup encryption enabled

### Code Security
- [ ] Input validation on all endpoints
- [ ] Output encoding implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled

### Monitoring
- [ ] Error tracking configured
- [ ] Audit logging enabled
- [ ] Security events monitored
- [ ] Alerts configured
- [ ] Incident response plan documented

---

## 📞 Report Security Issue

If you discover a security vulnerability:

**DO NOT** create a public GitHub issue.

Instead:
- Email: security@klarpakke.com
- Include: Detailed description, steps to reproduce, impact assessment
- We'll respond within 48 hours

---

**Last Updated**: 2026-01-29
**Next Review**: 2026-04-29
