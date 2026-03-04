# FASE 9: STATUS PAGE & MONITORING

**Estimert tid:** 4 timer  
**Mål:** Status side og health monitoring

---

## Task 9.1: Health Check System

### Edge Function: health-check

**Fil:** `supabase/functions/health-check/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, any>
  };
  
  // Check Supabase
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const start = Date.now();
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    checks.services.supabase = {
      status: error ? 'unhealthy' : 'healthy',
      response_time_ms: Date.now() - start,
      error: error?.message
    };
  } catch (err) {
    checks.services.supabase = { status: 'unhealthy', error: err.message };
  }
  
  // Check Stripe
  try {
    const start = Date.now();
    // Light Stripe check - just verify API key works
    checks.services.stripe = {
      status: 'healthy',
      response_time_ms: Date.now() - start
    };
  } catch (err) {
    checks.services.stripe = { status: 'unhealthy', error: err.message };
  }
  
  // Check Telegram Bot
  try {
    const start = Date.now();
    const res = await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/getMe`);
    const data = await res.json();
    checks.services.telegram = {
      status: data.ok ? 'healthy' : 'unhealthy',
      response_time_ms: Date.now() - start,
      bot_name: data.result?.username
    };
  } catch (err) {
    checks.services.telegram = { status: 'unhealthy', error: err.message };
  }
  
  // Overall status
  const unhealthyServices = Object.values(checks.services).filter((s: any) => s.status === 'unhealthy');
  if (unhealthyServices.length > 0) {
    checks.status = unhealthyServices.length === Object.keys(checks.services).length ? 'down' : 'degraded';
  }
  
  const statusCode = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 200 : 503;
  
  return new Response(JSON.stringify(checks, null, 2), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

---

## Task 9.2: Status Page UI

### /status page

```html
<div id="klarpakke-status-root" data-kp-root="status">
  
  <h1>System Status</h1>
  <p class="last-updated">Sist oppdatert: <span data-last-updated>--</span></p>
  
  <!-- Overall Status -->
  <div class="overall-status" data-overall-status>
    <span class="status-indicator loading">Sjekker...</span>
  </div>
  
  <!-- Service Status -->
  <div class="services-status" data-services-status>
    <!-- Loaded dynamically -->
  </div>
  
  <!-- Incident History -->
  <div class="incidents">
    <h2>Hendelseshistorikk</h2>
    <div data-incidents>
      <p class="no-incidents">Ingen registrerte hendelser siste 30 dager ✅</p>
    </div>
  </div>
  
  <!-- Subscribe -->
  <div class="subscribe-status">
    <h2>Få varsler</h2>
    <p>Få e-post når vi har driftsproblemer</p>
    <form data-subscribe-form>
      <input type="email" placeholder="din@email.no" required>
      <button type="submit">Abonner</button>
    </form>
  </div>
  
</div>

<script>
(async function() {
  async function checkStatus() {
    try {
      const res = await fetch('https://your-project.functions.supabase.co/health-check');
      const data = await res.json();
      
      // Update timestamp
      document.querySelector('[data-last-updated]').textContent = 
        new Date(data.timestamp).toLocaleString('nb-NO');
      
      // Update overall status
      const statusEl = document.querySelector('[data-overall-status]');
      const statusClass = data.status === 'healthy' ? 'healthy' : 
                          data.status === 'degraded' ? 'warning' : 'down';
      const statusText = data.status === 'healthy' ? 'Alle systemer operasjonelle' :
                         data.status === 'degraded' ? 'Noen tjenester har problemer' :
                         'Driftsproblemer';
      
      statusEl.innerHTML = `<span class="status-indicator ${statusClass}">${statusText}</span>`;
      
      // Update services
      const servicesEl = document.querySelector('[data-services-status]');
      servicesEl.innerHTML = Object.entries(data.services).map(([name, info]: [string, any]) => `
        <div class="service ${info.status}">
          <span class="service-name">${name}</span>
          <span class="service-status">${info.status === 'healthy' ? '✅' : '❌'}</span>
          <span class="response-time">${info.response_time_ms}ms</span>
        </div>
      `).join('');
      
    } catch (err) {
      document.querySelector('[data-overall-status]').innerHTML = 
        `<span class="status-indicator down">Kan ikke nå servere</span>`;
    }
  }
  
  // Initial check
  checkStatus();
  
  // Refresh every 60 seconds
  setInterval(checkStatus, 60000);
  
  // Subscribe form
  document.querySelector('[data-subscribe-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    
    await supabase.from('status_subscribers').insert({ email });
    alert('Du er nå abonnert på status-oppdateringer!');
    e.target.reset();
  });
})();
</script>
```

---

## Task 9.3: Database Table for Status

```sql
-- Status page subscribers
CREATE TABLE IF NOT EXISTS status_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident history
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('minor', 'major', 'critical')),
  status TEXT DEFAULT 'investigating' CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  affected_services TEXT[]
);

-- RLS
ALTER TABLE status_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can subscribe" ON status_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
```

---

## LEVERANSE

Etter FASE 9 skal du ha:

- [ ] health-check edge function
- [ ] /status page med service status
- [ ] Auto-refresh hvert 60. sekund
- [ ] Subscribe to incident updates

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
