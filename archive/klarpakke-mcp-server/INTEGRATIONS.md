# Klarpakke MCP Server - Integrations Overview

Complete overview of all 5 service integrations included in the MCP server.

---

## 🌟 Quick Stats

| Service | Features | Status |
|---------|----------|--------|
| **Stripe** | Payments, Subscriptions, Refunds, Analytics | ✅ Complete |
| **Google OAuth** | Auth, Profiles, Analytics, Admin SDK | ✅ Complete |
| **Vercel** | Deployments, Domains, Logs, Env Vars | ✅ Complete |
| **Supabase** | Auth, Database, Realtime, Storage | ✅ Complete |
| **Resend** | Email, Templates, Campaigns, Analytics | ✅ Complete |
| **Cloudflare** | DNS, CDN, Cache, Security, Analytics | ✅ Complete |

---

## ☁️ CLOUDFLARE INTEGRATION

File: `src/clients/cloudflare.ts`

### Features
- **DNS Management**: List, create, update, delete DNS records
- **Cache Control**: Purge by URL, tag, host, or everything
- **Analytics**: Requests, bandwidth, threats, unique visitors
- **Security**: SSL/TLS settings, firewall rules, rate limiting
- **DDoS Protection**: Security levels, Under Attack mode
- **Page Rules**: URL forwarding, caching behavior
- **Development Mode**: Bypass cache for testing

### Environment Variables
```bash
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ZONE_ID=your-zone-id  # Optional, can list zones
```

### Methods
```typescript
// DNS Management
listDNSRecords(zoneId?, filters?)
createDNSRecord(record, zoneId?)
updateDNSRecord(recordId, updates, zoneId?)
deleteDNSRecord(recordId, zoneId?)

// Cache Control
purgeAllCache(zoneId?)
purgeCacheByURL(urls, zoneId?)
purgeCacheByTag(tags, zoneId?)
purgeCacheByHost(hosts, zoneId?)

// Analytics
getZoneAnalytics(since, until, zoneId?)
getAnalyticsSummary(days?)
getTopThreats(days?)

// Security
getSSLSettings(zoneId?)
updateSSLSetting(setting, value, zoneId?)
getSecurityLevel(zoneId?)
setSecurityLevel(level, zoneId?)
listFirewallRules(zoneId?)
createFirewallRule(rule, zoneId?)

// Quick Actions
enableUnderAttackMode(zoneId?)
quickPurgeAndCheck(zoneId?)
runDiagnostics(zoneId?)
```

---

## 💳 STRIPE INTEGRATION

File: `src/clients/stripe.ts`

### Features
- **Customers**: Create, search, manage customer profiles
- **Subscriptions**: Create, cancel, list subscriptions
- **Payments**: Process payments, handle refunds
- **Products & Prices**: List plans and pricing
- **Invoices**: Generate and track invoices
- **Analytics**: MRR, revenue stats, conversion tracking
- **Checkout Sessions**: Hosted checkout pages

### Environment Variables
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Methods
```typescript
// Customers
getCustomer(customerId)
searchCustomers(query)
createCustomer(email, name, metadata)

// Subscriptions
getSubscription(subId)
listSubscriptions(customerId?)
cancelSubscription(subId, immediate?)
createSubscription(customerId, priceId)

// Payments
getPayment(paymentId)
listPayments(customerId?, limit?)
refundPayment(paymentIntentId, amount?, reason?)

// Analytics
getMRR()
getRevenueStats(days?)

// Checkout
createCheckoutSession(customerId, priceId, successUrl, cancelUrl)
```

---

## 🔐 GOOGLE OAUTH INTEGRATION

File: `src/clients/google.ts`

### Features
- **OAuth Flow**: Complete authorization code flow
- **User Profiles**: Fetch Google profile data
- **Token Management**: Refresh, validate, revoke tokens
- **Session Management**: Store and manage sessions in Supabase
- **Admin SDK**: Domain-wide user listing (if applicable)
- **Analytics**: Google Analytics data access

### Environment Variables
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### Methods
```typescript
// OAuth Flow
getAuthUrl(redirectUri, state?)
exchangeCode(code, redirectUri)
refreshAccessToken(refreshToken)

// User Data
getUserProfile(accessToken)
decodeIdToken(idToken)

// Token Management
validateToken(token)
revokeToken(token)

// Supabase Integration
linkGoogleAccount(userId, googleProfile)
findUserByGoogleId(googleId)
createSession(tokens, profile)
getValidSession(userId)
```

---

## 🚀 VERCEL INTEGRATION

File: `src/clients/vercel.ts`

### Features
- **Deployments**: List, create, cancel, delete deployments
- **Production**: Promote deployments, rollback
- **Domains**: Add, remove, verify custom domains
- **Logs**: Fetch deployment logs and events
- **Project Settings**: Update project configuration
- **Environment Variables**: Manage env vars securely
- **Analytics**: Build times, success rates
- **Health Checks**: Endpoint monitoring
- **Usage**: Bandwidth and invocation tracking

### Environment Variables
```bash
VERCEL_TOKEN=xxx
VERCEL_PROJECT_ID=prj_xxx
VERCEL_TEAM_ID=team_xxx  # Optional
```

### Methods
```typescript
// Deployments
getDeployments(limit?, target?)
getDeployment(id)
deployToProduction(branch)
cancelDeployment(id)
deleteDeployment(id)
promoteDeployment(id)

// Domains
listDomains()
addDomain(domain)
removeDomain(domain)
verifyDomain(domain)

// Logs
getDeploymentLogs(deploymentId)

// Project
getProject()
updateProject(updates)

// Environment Variables
getEnvironmentVariables()
addEnvironmentVariable(env)
removeEnvironmentVariable(key)

// Analytics
getDeploymentAnalytics(days?)
runHealthChecks()
getUsage(start, end)
getProductionDeployment()

// Cache
clearBuildCache()

// Aliases
listAliases()
assignAlias(deploymentId, alias)
```

---

## 🗄️ SUPABASE INTEGRATION

File: `src/clients/supabase.ts`

### Features
- **Auth**: Create, delete, update users; magic links; invites
- **Database**: Safe SQL queries with validation
- **Realtime**: Subscribe to table changes
- **Storage**: File upload, download, delete
- **Edge Functions**: Invoke serverless functions
- **Backups**: Create and list database backups
- **Analytics**: User counts, engagement metrics
- **Audit Logging**: Track all operations
- **Rate Limiting**: Prevent abuse

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=<DIN_SUPABASE_ANON_KEY>
SUPABASE_MANAGEMENT_TOKEN=sbp_...  # For backups
```

### Methods
```typescript
// Auth
createUser(email, password, metadata?)
deleteUser(userId)
getUserById(userId)
listUsers(page?, perPage?)
updateUserAuth(userId, updates)
generateMagicLink(email)
inviteUserByEmail(email, options?)

// Database
validateQuery(query, readOnly)
executeQuery(query, params?, options?)

// Realtime
subscribeToTable(table, callback)
subscribeToUser(userId, callback)

// Storage
uploadFile(bucket, path, file)
deleteFile(bucket, path)
listFiles(bucket, prefix?)

// Backups
createBackup()
listBackups()

// Analytics
getUserCounts(timeRange)

// Audit & Rate Limiting
logAudit(log)
checkRateLimit(toolName, windowMs?)

// Edge Functions
invokeEdgeFunction(functionName, payload?)
```

---

## 📧 RESEND INTEGRATION

File: `src/clients/resend.ts`

### Features
- **Email Sending**: Single and batch emails
- **Templates**: Pre-built welcome, reminder, feedback templates
- **Personalization**: Dynamic content with user data
- **Audiences** (Beta): Contact list management
- **Contacts** (Beta): Add, remove, list contacts
- **Analytics**: Open rates, click rates, bounces
- **Domains**: Verify and manage sending domains
- **Campaigns**: Track and store campaign data
- **Broadcasts** (Beta): Mass email campaigns

### Environment Variables
```bash
RESEND_API_KEY=re_xxx
FROM_EMAIL=post@klarpakke.no
REPLY_TO_EMAIL=support@klarpakke.no
```

### Methods
```typescript
// Email Sending
sendEmail(options)
sendBatchEmails(recipients, template, batchSize?, delayMs?)

// Templates
getTemplate(name)
getAvailableTemplates()
renderTemplate(templateName, data)

// Audiences (Beta)
listAudiences()
createAudience(name)

// Contacts (Beta)
listContacts(audienceId)
addContact(audienceId, contact)
removeContact(audienceId, contactId)

// Analytics
getEmailAnalytics(emailId)
getDomainStats()

// Domains
listDomains()
addDomain(name, region?)
verifyDomain(domainId)
getDomainVerification(domainId)

// Campaigns (Database-backed)
saveCampaign(campaign)
updateCampaignStats(campaignId, stats)

// Broadcasts (Beta)
createBroadcast(broadcast)
sendBroadcast(broadcastId)
```

---

## 📊 Feature Comparison Matrix

| Feature | Stripe | Google | Vercel | Supabase | Resend |
|---------|--------|--------|--------|----------|--------|
| **Create** | ✅ Customers, Subs | ✅ Users | ✅ Deployments | ✅ Users, Records | ✅ Emails, Audiences |
| **Read** | ✅ All entities | ✅ Profiles | ✅ Logs, Stats | ✅ All tables | ✅ Analytics |
| **Update** | ✅ Subscriptions | ✅ Tokens | ✅ Env Vars | ✅ Users, Records | ✅ Campaigns |
| **Delete** | ✅ Subscriptions | ✅ Revoke | ✅ Deployments | ✅ Users, Files | ✅ Contacts |
| **List** | ✅ All entities | ✅ Domain users | ✅ Deployments | ✅ All tables | ✅ Audiences |
| **Search** | ✅ Customers | ❌ | ❌ | ✅ SQL | ❌ |
| **Analytics** | ✅ MRR, Revenue | ✅ Analytics | ✅ Build stats | ✅ User counts | ✅ Open/Click rates |
| **Realtime** | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Batch Ops** | ❌ | ❌ | ❌ | ✅ | ✅ Batch email |
| **Webhooks** | ✅ Verify | ❌ | ❌ | ❌ | ❌ |

---

## 🔒 Security Features by Service

### Stripe
- ✅ Secret key authentication
- ✅ Webhook signature verification
- ✅ PCI compliance (Stripe handles card data)

### Google OAuth
- ✅ PKCE flow support
- ✅ Token refresh handling
- ✅ Scope validation
- ✅ Token revocation

### Vercel
- ✅ Token-based authentication
- ✅ Team/project isolation
- ✅ Audit logs

### Supabase
- ✅ Row Level Security (RLS)
- ✅ Service role key restrictions
- ✅ SQL injection protection (keyword filtering)
- ✅ Audit logging
- ✅ Rate limiting

### Resend
- ✅ API key authentication
- ✅ Domain verification
- ✅ Unsubscribe handling

---

## 🛠️ Common Workflows

### 1. New User Signup Flow
```typescript
// 1. Google OAuth
const tokens = await exchangeCode(code, redirectUri);
const profile = await getUserProfile(tokens.access_token);

// 2. Create Supabase User
const user = await createUser(profile.email, tempPassword, {
  google_id: profile.id,
  full_name: profile.name,
});

// 3. Create Stripe Customer
const customer = await createCustomer(profile.email, profile.name, {
  supabase_user_id: user.id,
});

// 4. Send Welcome Email
await sendEmail({
  to: profile.email,
  subject: 'Welcome!',
  html: renderTemplate('welcome', profile).html,
});
```

### 2. Process Payment Flow
```typescript
// 1. Create subscription
const subscription = await createSubscription(customerId, priceId);

// 2. Store in Supabase
await supabase.from('subscriptions').insert({
  user_id: userId,
  stripe_subscription_id: subscription.id,
  status: subscription.status,
});

// 3. Send receipt
await sendEmail({
  to: customerEmail,
  subject: 'Payment Confirmation',
  html: receiptTemplate,
});
```

### 3. Deployment Flow
```typescript
// 1. Deploy to Vercel
const deployment = await deployToProduction('main');

// 2. Run health checks
const health = await runHealthChecks();

// 3. Notify team if issues
if (health.some(h => h.status === 'fail')) {
  await sendEmail({
    to: 'team@klarpakke.no',
    subject: 'Deployment Issues Detected',
    html: healthReport,
  });
}
```

### 4. Email Campaign Flow
```typescript
// 1. Get audience from Supabase
const { data: users } = await supabase
  .from('profiles')
  .select('email, full_name')
  .eq('role', 'founder');

// 2. Send campaign
const result = await sendBatchEmails(
  users,
  (user) => renderTemplate('welcome', user),
  50,  // batch size
  1000 // delay between batches
);

// 3. Log campaign
await saveCampaign({
  name: 'Founder Welcome',
  audience: 'founders',
  template: 'welcome',
  sent_count: result.sent,
  failed_count: result.failed,
});
```

---

## 📝 Environment Variables Summary

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Vercel
VERCEL_TOKEN=xxx
VERCEL_PROJECT_ID=prj_xxx
VERCEL_TEAM_ID=team_xxx  # Optional

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=<DIN_SUPABASE_ANON_KEY>
SUPABASE_MANAGEMENT_TOKEN=sbp_...  # Optional (backups)

# Resend
RESEND_API_KEY=re_xxx
FROM_EMAIL=post@klarpakke.no
REPLY_TO_EMAIL=support@klarpakke.no
```

---

## 🚀 Next Steps

1. **Set up environment variables** for all services
2. **Run database migrations** to create tracking tables
3. **Test each integration** individually
4. **Configure Claude Desktop** to use the MCP server
5. **Start managing** Klarpakke with natural language!

---

## 📚 Documentation

- [Stripe API Docs](https://stripe.com/docs/api)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Vercel REST API](https://vercel.com/docs/rest-api)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Resend API](https://resend.com/docs/api-reference/introduction)
