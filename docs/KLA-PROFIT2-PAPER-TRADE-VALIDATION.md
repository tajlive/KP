# KLA-PROFIT2: 48H Paper Trading Validation

## 🎯 Objective
Validate paper trading system integrity post-KLA-PROFIT1 deploy with 48-hour continuous monitoring.

---

## 📅 Timeline

```
Start:  2026-04-02 15:30 (NOW)
End:    2026-04-04 15:30 (48h)
Report: 2026-04-04 16:00
```

---

## 🔍 Validation Scope

### 1. Paper Trading Session Lifecycle ⏱️
| Check | Method | Frequency | Success Criteria |
|-------|--------|-----------|------------------|
| Session creation | API POST /api/paper-trading/init | Every 4h | 201 Created |
| Session persistence | DB query | Every 4h | Session active |
| Balance updates | WebSocket + API | Real-time | NOK amounts correct |
| Trade execution | API POST /api/paper-trading/execute | Every 6h | Order confirmation |

### 2. Data Integrity 📊
| Metric | Check | Tool |
|--------|-------|------|
| Starting capital | 100,000 NOK | DB + UI |
| Current capital | Accurate calculation | Balance API |
| PnL calculation | (Current - Start) / Start | Formula validation |
| Trade history | All trades logged | Supabase query |

### 3. API Health 🔌
```
Endpoints to monitor:
✓ GET  /api/paper-trading/init
✓ POST /api/paper-trading/init  
✓ GET  /api/paper-trading/balance
✓ POST /api/paper-trading/execute
✓ GET  /api/paper-trading/trades
```

**Expected Response Times:**
- < 200ms: Excellent
- 200-500ms: Acceptable
- > 500ms: Investigate

### 4. Auth Flow 🔐
| Scenario | Test | Expected |
|----------|------|----------|
| Valid session | API call with cookie | 200 OK + JSON |
| Expired session | API call | 401 → redirect to login |
| No session | API call | 401 + error message |

---

## 🛠️ Monitoring Setup

### Automated Scripts
```bash
# Run every 4 hours via cron/CI
npm run validate:paper-trading
```

### Manual Checks
| Time | Action | Owner |
|------|--------|-------|
| T+0h | Initial session creation | Automated |
| T+4h | Balance verification | Automated |
| T+12h | Mid-point health check | Manual review |
| T+24h | 24h report generation | Automated |
| T+36h | Deep dive analysis | Manual review |
| T+48h | Final validation | Automated + Manual |

### Alert Thresholds
```yaml
critical:
  - api_error_rate > 5%
  - session_loss > 0 (any session disappears)
  - pnl_calculation_error > 0
  
warning:
  - response_time > 500ms
  - balance_sync_delay > 30s
  - trade_execution_failures > 2 per hour
```

---

## 📋 Validation Checklist

### Session Management
- [ ] New user gets paper trading session on first dashboard visit
- [ ] Existing user retains session on return
- [ ] Session survives page refresh
- [ ] Session survives browser restart (cookie persistence)
- [ ] Multiple sessions not created for same user

### Balance Operations
- [ ] Starting balance always 100,000 NOK
- [ ] Balance updates after each trade
- [ ] PnL calculation matches (Current - Start)
- [ ] No negative balance allowed
- [ ] Balance display matches DB value

### Trade Execution
- [ ] Buy order creates position
- [ ] Sell order closes position
- [ ] Partial fills handled correctly
- [ ] Trade fees calculated (0.1%)
- [ ] Trade history shows all transactions

### Error Handling
- [ ] 401 returns JSON (not HTML)
- [ ] Insufficient funds error handled gracefully
- [ ] Network errors retry with backoff
- [ ] Invalid symbol rejected

---

## 🐛 Known Issues to Verify

### Issue #1: Paper Trading HTML Response
**Description:** API returns HTML instead of JSON on auth failure  
**Expected:** `{"error": "Unauthorized"}`  
**Status:** Under investigation

**Verification Steps:**
1. Clear cookies
2. Visit /dashboard/metrics
3. Check network tab for /api/paper-trading/init
4. Verify response is JSON, not HTML

### Issue #2: /dashboard/settings Redirect Loop
**Description:** ERR_TOO_MANY_REDIRECTS on settings page  
**Expected:** 200 OK with settings form  
**Status:** Under investigation

**Verification Steps:**
1. Log in as test user
2. Navigate to /no/dashboard/settings
3. Verify page loads without redirects

---

## 📊 Success Criteria

### Must Have (Pass Criteria)
- [ ] 99.9% API uptime over 48h
- [ ] Zero data loss (all trades persisted)
- [ ] Balance calculations 100% accurate
- [ ] All auth flows working

### Nice to Have
- [ ] Average response time < 200ms
- [ ] Zero manual interventions
- [ ] No console errors

---

## 🚨 Escalation

### Auto-Rollback Triggers
1. > 10% API error rate for > 15 minutes
2. Data integrity issues detected
3. User reports of lost sessions/trades

### Rollback Procedure
```bash
# Emergency rollback
$ git revert adfa939d8..d813b8e24 --no-edit
$ git push origin main
$ npm run deploy:prod
```

---

## 📈 Reporting

### 24h Mid-Point Report
- API health metrics
- Session statistics
- Error rate analysis
- Preliminary findings

### 48h Final Report
- Complete validation results
- Performance metrics
- Issues identified (if any)
- Recommendations for KLA-PROFIT3

---

## 👥 Responsibilities

| Role | Responsibility |
|------|----------------|
| Kimi (AI) | Automated monitoring, first response |
| Human Review | 12h and 36h manual checks |
| On-Call | Emergency response if alerts fire |

---

## 📎 References

- KLA-PROFIT1: `/docs/KLA-PROFIT1-FINAL-STATUS.md`
- Scroll Tests: `npm run test:scroll`
- API Docs: `/docs/api-routes.md`

---

*Plan created: 2026-04-02 15:15*  
*Validation period: 2026-04-02 → 2026-04-04*
