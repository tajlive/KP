# FASE 10: ANALYTICS & TRACKING

**Estimert tid:** 6 timer  
**Mål:** Event tracking og admin analytics dashboard

---

## Task 10.1: Event Tracking System

### Database Schema

```sql
-- Events table (already exists from FASE 0)
-- Using app_events table with RLS

-- Analytics aggregation tables
CREATE TABLE IF NOT EXISTS analytics_daily (
  date DATE PRIMARY KEY,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  trades_count INTEGER DEFAULT 0,
  revenue_nok INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User cohort tracking
CREATE TABLE IF NOT EXISTS user_cohorts (
  cohort_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  day_1_active BOOLEAN DEFAULT false,
  day_7_active BOOLEAN DEFAULT false,
  day_30_active BOOLEAN DEFAULT false,
  PRIMARY KEY (cohort_date, user_id)
);

-- Function: Track event
CREATE OR REPLACE FUNCTION track_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_properties JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO app_events (user_id, event_type, properties)
  VALUES (p_user_id, p_event_type, p_properties)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get daily stats (admin only)
CREATE OR REPLACE FUNCTION get_admin_stats(p_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_today', (SELECT COUNT(DISTINCT user_id) FROM app_events 
                     WHERE created_at > NOW() - INTERVAL '1 day'),
    'active_this_week', (SELECT COUNT(DISTINCT user_id) FROM app_events 
                         WHERE created_at > NOW() - INTERVAL '7 days'),
    'new_users_today', (SELECT COUNT(*) FROM profiles 
                        WHERE created_at > NOW() - INTERVAL '1 day'),
    'paying_customers', (SELECT COUNT(*) FROM profiles 
                         WHERE subscription_status = 'active'),
    'mrr_nok', (SELECT COALESCE(SUM(amount_nok), 0) FROM stripe_products sp
                JOIN profiles p ON p.subscription_tier = sp.tier
                WHERE p.subscription_status = 'active')
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Task 10.2: Google Analytics / Plausible

### Add to Webflow Head Code

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- OR Plausible (privacy-friendly) -->
<script defer data-domain="klarpakke.no" src="https://plausible.io/js/script.js"></script>
```

### Track Custom Events

```javascript
// Track signup
function trackSignup(method) {
  gtag('event', 'sign_up', {
    method: method
  });
}

// Track subscription
function trackSubscribe(tier, value) {
  gtag('event', 'purchase', {
    transaction_id: generateId(),
    value: value,
    currency: 'NOK',
    items: [{
      item_name: tier,
      price: value
    }]
  });
}

// Track paper trade
function trackPaperTrade() {
  gtag('event', 'paper_trade', {
    event_category: 'engagement'
  });
}

// Track quiz completion
function trackQuizComplete(score) {
  gtag('event', 'quiz_complete', {
    score: score
  });
}
```

---

## Task 10.3: Admin Analytics Dashboard

### /admin/analytics page

```html
<div id="klarpakke-admin-analytics" data-kp-root="admin-analytics">
  
  <h1>Analytics Dashboard</h1>
  
  <!-- KPI Cards -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <span class="value" data-kpi-users>--</span>
      <span class="label">Totale brukere</span>
    </div>
    <div class="kpi-card">
      <span class="value" data-kpi-active>--</span>
      <span class="label">Aktive i dag</span>
    </div>
    <div class="kpi-card">
      <span class="value" data-kpi-paying>--</span>
      <span class="label">Betaling</span>
    </div>
    <div class="kpi-card">
      <span class="value" data-kpi-mrr>--</span>
      <span class="label">MRR (NOK)</span>
    </div>
  </div>
  
  <!-- Charts -->
  <div class="charts">
    <div class="chart-container">
      <h3>Nye brukere (siste 30 dager)</h3>
      <canvas id="usersChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h3>Inntekt (siste 30 dager)</h3>
      <canvas id="revenueChart"></canvas>
    </div>
  </div>
  
  <!-- Funnel -->
  <div class="funnel">
    <h3>Konverteringstrakt</h3>
    <div class="funnel-step">
      <span class="step-name">Registrering</span>
      <span class="step-count" data-funnel-signups>--</span>
    </div>
    <div class="funnel-step">
      <span class="step-name">Paper Trading</span>
      <span class="step-count" data-funnel-paper>--</span>
    </div>
    <div class="funnel-step">
      <span class="step-name">Quiz Bestått</span>
      <span class="step-count" data-funnel-quiz>--</span>
    </div>
    <div class="funnel-step">
      <span class="step-name">Betaling</span>
      <span class="step-count" data-funnel-paying>--</span>
    </div>
  </div>
  
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
(async function() {
  // Check admin access
  const { data: isAdmin } = await supabase
    .rpc('is_admin', { p_user_id: (await window.klarpakkeAuth.getCurrentUser()).id });
  
  if (!isAdmin) {
    window.location.href = '/app/dashboard';
    return;
  }
  
  // Load stats
  const { data: stats } = await supabase.rpc('get_admin_stats', { p_days: 30 });
  
  document.querySelector('[data-kpi-users]').textContent = stats.total_users;
  document.querySelector('[data-kpi-active]').textContent = stats.active_today;
  document.querySelector('[data-kpi-paying]').textContent = stats.paying_customers;
  document.querySelector('[data-kpi-mrr]').textContent = stats.mrr_nok.toLocaleString();
  
  // Load chart data
  const { data: dailyStats } = await supabase
    .from('analytics_daily')
    .select('*')
    .order('date', { ascending: true })
    .limit(30);
  
  // Users chart
  new Chart(document.getElementById('usersChart'), {
    type: 'line',
    data: {
      labels: dailyStats?.map(d => d.date) || [],
      datasets: [{
        label: 'Nye brukere',
        data: dailyStats?.map(d => d.new_users) || [],
        borderColor: '#2563eb'
      }]
    }
  });
  
  // Revenue chart
  new Chart(document.getElementById('revenueChart'), {
    type: 'bar',
    data: {
      labels: dailyStats?.map(d => d.date) || [],
      datasets: [{
        label: 'Inntekt (NOK)',
        data: dailyStats?.map(d => d.revenue_nok) || [],
        backgroundColor: '#10b981'
      }]
    }
  });
  
  // Load funnel data
  const { data: funnel } = await supabase.rpc('get_funnel_stats', { p_days: 30 });
  
  document.querySelector('[data-funnel-signups]').textContent = funnel.signups;
  document.querySelector('[data-funnel-paper]').textContent = funnel.paper_traders;
  document.querySelector('[data-funnel-quiz]').textContent = funnel.quiz_passed;
  document.querySelector('[data-funnel-paying]').textContent = funnel.paying;
})();
</script>
```

---

## LEVERANSE

Etter FASE 10 skal du ha:

- [ ] Event tracking via app_events
- [ ] Google Analytics / Plausible
- [ ] Admin analytics dashboard
- [ ] Daily stats aggregation
- [ ] Conversion funnel

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
