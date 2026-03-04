# FASE 5: SIGNAL SYSTEM

**Estimert tid:** 10 timer  
**Mål:** Live trading signaler med gating (futures krever quiz pass)

---

## Task 5.1: Signal Database Schema

### Migration

**Fil:** `supabase/migrations/20260201210000_signal_system.sql`

```sql
-- Signal System for Klarpakke

-- Trading Signals
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type TEXT NOT NULL CHECK (signal_type IN ('spot', 'futures')),
  ticker TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell', 'long', 'short')),
  entry_price DECIMAL(18, 8),
  target_price DECIMAL(18, 8),
  stop_loss DECIMAL(18, 8),
  leverage_suggestion INTEGER DEFAULT 1,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  timeframe TEXT, -- e.g., 'scalp', 'swing', 'position'
  analysis TEXT, -- Markdown analysis
  chart_url TEXT, -- URL to chart image
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  close_price DECIMAL(18, 8),
  realized_pnl_percent DECIMAL(10, 4),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Signal Interactions (views, paper trades linked to signals)
CREATE TABLE IF NOT EXISTS user_signal_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES trading_signals(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('viewed', 'paper_traded', 'dismissed')),
  paper_trade_id UUID REFERENCES paper_trades(id),
  interacted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, signal_id, interaction_type)
);

-- Signal Notifications (track who was notified)
CREATE TABLE IF NOT EXISTS signal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL REFERENCES trading_signals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('app', 'email', 'sms', 'telegram')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  UNIQUE(signal_id, user_id, channel)
);

-- Indexes
CREATE INDEX idx_signals_type_status ON trading_signals(signal_type, status);
CREATE INDEX idx_signals_published ON trading_signals(published_at DESC);
CREATE INDEX idx_signals_ticker ON trading_signals(ticker);
CREATE INDEX idx_user_interactions_user ON user_signal_interactions(user_id);
CREATE INDEX idx_user_interactions_signal ON user_signal_interactions(signal_id);
CREATE INDEX idx_notifications_user ON signal_notifications(user_id);

-- RLS Policies
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signal_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_notifications ENABLE ROW LEVEL SECURITY;

-- Signals: Users can view signals they have access to
CREATE POLICY "Users can view signals based on entitlements"
  ON trading_signals FOR SELECT
  TO authenticated
  USING (
    signal_type = 'spot' OR 
    EXISTS (
      SELECT 1 FROM user_entitlements ue 
      WHERE ue.user_id = auth.uid() 
      AND ue.can_access_futures = true
    )
  );

-- Admins can manage signals
CREATE POLICY "Admins can manage signals"
  ON trading_signals FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- User interactions: Users manage own
CREATE POLICY "Users manage own interactions"
  ON user_signal_interactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Notifications: Users view own
CREATE POLICY "Users view own notifications"
  ON signal_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function: Get available signals for user
CREATE OR REPLACE FUNCTION get_available_signals(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  signal_type TEXT,
  ticker TEXT,
  direction TEXT,
  entry_price DECIMAL,
  target_price DECIMAL,
  stop_loss DECIMAL,
  leverage_suggestion INTEGER,
  confidence TEXT,
  timeframe TEXT,
  analysis TEXT,
  status TEXT,
  published_at TIMESTAMPTZ,
  has_access BOOLEAN
) AS $$
DECLARE
  v_can_access_futures BOOLEAN;
BEGIN
  -- Check user's futures access
  SELECT can_access_futures INTO v_can_access_futures
  FROM user_entitlements
  WHERE user_id = p_user_id;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.signal_type,
    s.ticker,
    s.direction,
    s.entry_price,
    s.target_price,
    s.stop_loss,
    s.leverage_suggestion,
    s.confidence,
    s.timeframe,
    s.analysis,
    s.status,
    s.published_at,
    CASE 
      WHEN s.signal_type = 'spot' THEN true
      WHEN s.signal_type = 'futures' AND v_can_access_futures THEN true
      ELSE false
    END as has_access
  FROM trading_signals s
  WHERE s.status = 'active'
  AND (s.expires_at IS NULL OR s.expires_at > NOW())
  ORDER BY s.published_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record signal view
CREATE OR REPLACE FUNCTION record_signal_view(
  p_user_id UUID,
  p_signal_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_signal_interactions (user_id, signal_id, interaction_type)
  VALUES (p_user_id, p_signal_id, 'viewed')
  ON CONFLICT (user_id, signal_id, interaction_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger
CREATE TRIGGER update_signals_timestamp
  BEFORE UPDATE ON trading_signals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Task 5.2: Signal Admin Dashboard

### Edge Function: publish-signal

**Fil:** `supabase/functions/publish-signal/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: { user } } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  );
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  // Check admin role
  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }
  
  const signalData = await req.json();
  
  // Validate required fields
  if (!signalData.ticker || !signalData.direction) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  
  // Create signal
  const { data: signal, error } = await supabase
    .from('trading_signals')
    .insert({
      ...signalData,
      created_by: user.id,
      published_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  
  // Send notifications to eligible users
  await notifyUsers(supabase, signal);
  
  return new Response(JSON.stringify({ success: true, signal }), { status: 200 });
};

async function notifyUsers(supabase, signal) {
  // Get eligible users based on signal type
  const { data: users } = await supabase
    .from('profiles')
    .select('user_id, subscription_tier')
    .in('subscription_tier', signal.signal_type === 'futures' 
      ? ['premium', 'elite'] 
      : ['standard', 'pro', 'premium', 'elite']);
  
  // Queue notifications (processed by background job)
  const notifications = users?.map(u => ({
    signal_id: signal.id,
    user_id: u.user_id,
    channel: 'app'
  })) || [];
  
  if (notifications.length > 0) {
    await supabase.from('signal_notifications').insert(notifications);
  }
  
  // Send Telegram notification to #alerts channel
  if (Deno.env.get('TELEGRAM_BOT_TOKEN')) {
    await fetch(`https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: Deno.env.get('TELEGRAM_ALERTS_CHAT_ID'),
        text: formatTelegramMessage(signal),
        parse_mode: 'Markdown'
      })
    });
  }
}

function formatTelegramMessage(signal) {
  const emoji = signal.direction === 'buy' || signal.direction === 'long' ? '🟢' : '🔴';
  const type = signal.signal_type === 'futures' ? 'FUTURES' : 'SPOT';
  
  return `${emoji} *${type} SIGNAL: ${signal.ticker}*

Direction: ${signal.direction.toUpperCase()}
Entry: $${signal.entry_price}
Target: $${signal.target_price}
Stop Loss: $${signal.stop_loss}
Leverage: ${signal.leverage_suggestion || 1}x

${signal.analysis?.substring(0, 200) || ''}...`;
}
```

---

## Task 5.3: Signal Feed UI

### /app/signals page

**DOM Structure:**
```html
<div id="klarpakke-signals-root" data-kp-root="signals">
  
  <!-- Filters -->
  <div class="signal-filters">
    <button data-filter="all" class="active">Alle</button>
    <button data-filter="spot">Spot</button>
    <button data-filter="futures">Futures</button>
  </div>
  
  <!-- Signal List -->
  <div class="signals-list" data-signals-list>
    <!-- Signals loaded dynamically -->
  </div>
  
  <!-- Futures Gate Modal (shown if no access) -->
  <div class="futures-gate-modal" data-futures-gate style="display: none;">
    <div class="modal-content">
      <h2>🔒 Futures Trading Låst</h2>
      <p>For å få tilgang til futures-signalene må du:</p>
      <ol>
        <li>Oppgradere til PREMIUM eller ELITE</li>
        <li>Bestå <a href="/quiz/futures">Futures Quiz</a> (85%)</li>
      </ol>
      <button data-go-paywall>Oppgrader nå</button>
      <button data-close-modal>Lukk</button>
    </div>
  </div>
  
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
(async function() {
  await window.klarpakkeAuth.requireAuth();
  
  const supabase = window.klarpakkeSupabase;
  let currentFilter = 'all';
  
  // Load signals
  async function loadSignals() {
    const { data: signals, error } = await supabase
      .rpc('get_available_signals', { 
        p_user_id: (await window.klarpakkeAuth.getCurrentUser()).id 
      });
    
    if (error) {
      console.error('Error loading signals:', error);
      return;
    }
    
    // Filter
    const filtered = signals.filter(s => 
      currentFilter === 'all' || s.signal_type === currentFilter
    );
    
    // Render
    const listEl = document.querySelector('[data-signals-list]');
    listEl.innerHTML = filtered.map(s => `
      <div class="signal-card ${s.signal_type} ${s.has_access ? '' : 'locked'}" 
           data-signal-id="${s.id}"
           data-has-access="${s.has_access}">
        
        <div class="signal-header">
          <span class="type-badge ${s.signal_type}">${s.signal_type.toUpperCase()}</span>
          <span class="ticker">${s.ticker}</span>
          <span class="direction ${s.direction}">${s.direction.toUpperCase()}</span>
          ${!s.has_access ? '🔒' : ''}
        </div>
        
        <div class="signal-body">
          <div class="price-levels">
            <div>Entry: <strong>$${s.entry_price}</strong></div>
            <div>Target: <strong>$${s.target_price}</strong></div>
            <div>SL: <strong>$${s.stop_loss}</strong></div>
          </div>
          
          <div class="signal-meta">
            <span>Leverage: ${s.leverage_suggestion || 1}x</span>
            <span>Confidence: ${s.confidence}</span>
            <span>${formatTime(s.published_at)}</span>
          </div>
          
          ${s.has_access ? `
            <div class="signal-actions">
              <button data-paper-trade="${s.id}">Paper Trade</button>
              <button data-view-analysis="${s.id}">Se Analyse</button>
            </div>
          ` : `
            <div class="locked-message">
              <button data-unlock-futures>Oppgrader for tilgang</button>
            </div>
          `}
        </div>
        
      </div>
    `).join('');
    
    // Add handlers
    document.querySelectorAll('[data-signal-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        const hasAccess = card.dataset.hasAccess === 'true';
        if (!hasAccess && card.classList.contains('futures')) {
          showFuturesGate();
        }
      });
    });
  }
  
  function showFuturesGate() {
    document.querySelector('[data-futures-gate]').style.display = 'flex';
  }
  
  // Filter handlers
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadSignals();
    });
  });
  
  // Initial load
  loadSignals();
  
  // Refresh every 30 seconds
  setInterval(loadSignals, 30000);
})();
</script>
```

---

## Task 5.4: Quiz Gating

### /quiz/futures page

**DOM Structure:**
```html
<div id="klarpakke-quiz-root" data-kp-root="quiz-futures">
  
  <div class="quiz-container" data-quiz-container>
    <h1>Futures Trading Quiz</h1>
    <p>Bestå quizzen (85%) for å låse opp futures trading-signalene.</p>
    
    <div class="progress-bar">
      <div class="progress" data-progress></div>
    </div>
    
    <div data-question-container>
      <!-- Questions loaded dynamically -->
    </div>
    
    <div class="quiz-actions">
      <button data-submit-quiz style="display: none;">Lever Quiz</button>
    </div>
    
    <div data-quiz-result style="display: none;"></div>
  </div>
  
</div>

<script>
(async function() {
  await window.klarpakkeAuth.requireAuth();
  
  const supabase = window.klarpakkeSupabase;
  
  // Check if already passed
  const { data: entitlements } = await supabase
    .rpc('get_user_entitlements', { p_user_id: (await window.klarpakkeAuth.getCurrentUser()).id });
  
  if (entitlements?.futures_quiz_passed) {
    document.querySelector('[data-quiz-container]').innerHTML = `
      <h1>✅ Quiz Bestått!</h1>
      <p>Du har allerede bestått futures quizen.</p>
      <a href="/app/signals">Gå til Signalene</a>
    `;
    return;
  }
  
  // Load quiz questions
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_type', 'futures')
    .eq('is_active', true)
    .order('display_order');
  
  let answers = {};
  let currentQuestion = 0;
  
  function renderQuestion(index) {
    const q = questions[index];
    document.querySelector('[data-question-container]').innerHTML = `
      <div class="question" data-q-index="${index}">
        <h3>${q.question_text}</h3>
        <div class="options">
          ${q.options.map((opt, i) => `
            <label class="option">
              <input type="radio" name="q${index}" value="${i}" 
                     ${answers[q.id] === i ? 'checked' : ''}>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
    
    // Update progress
    const progress = ((index + 1) / questions.length) * 100;
    document.querySelector('[data-progress]').style.width = `${progress}%`;
    
    // Show submit on last question
    if (index === questions.length - 1) {
      document.querySelector('[data-submit-quiz]').style.display = 'block';
    }
    
    // Save answer on change
    document.querySelectorAll(`input[name="q${index}"]`).forEach(radio => {
      radio.addEventListener('change', (e) => {
        answers[q.id] = parseInt(e.target.value);
        // Auto-advance
        if (currentQuestion < questions.length - 1) {
          setTimeout(() => {
            currentQuestion++;
            renderQuestion(currentQuestion);
          }, 300);
        }
      });
    });
  }
  
  // Submit handler
  document.querySelector('[data-submit-quiz]').addEventListener('click', async () => {
    const userId = (await window.klarpakkeAuth.getCurrentUser()).id;
    
    // Submit each answer
    for (const [questionId, answerIndex] of Object.entries(answers)) {
      await supabase.rpc('submit_quiz_answer', {
        p_user_id: userId,
        p_quiz_type: 'futures',
        p_question_id: questionId,
        p_selected_option: answerIndex
      });
    }
    
    // Get result
    const { data: result } = await supabase.rpc('submit_quiz', {
      p_user_id: userId,
      p_quiz_type: 'futures'
    });
    
    const resultEl = document.querySelector('[data-quiz-result]');
    resultEl.style.display = 'block';
    
    if (result.passed) {
      resultEl.innerHTML = `
        <h2>🎉 Gratulerer! Du besto med ${result.score_percent}%</h2>
        <p>Futures trading er nå låst opp!</p>
        <a href="/app/signals" class="button">Se Futures Signaler</a>
      `;
    } else {
      resultEl.innerHTML = `
        <h2>😔 Du fikk ${result.score_percent}%</h2>
        <p>Du trenger 85% for å bestå. Prøv igjen!</p>
        <button onclick="location.reload()">Prøv Igjen</button>
      `;
    }
  });
  
  // Start
  renderQuestion(0);
})();
</script>
```

---

## VERIFIKASJON

### Test signal flow

```bash
# 1. Publish test signal
curl -X POST "${SUPABASE_URL}/functions/v1/publish-signal" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "signal_type": "spot",
    "ticker": "BTCUSDT",
    "direction": "buy",
    "entry_price": 65000,
    "target_price": 70000,
    "stop_loss": 62000,
    "confidence": "high"
  }'

# 2. Get available signals
curl -X GET "${SUPABASE_URL}/rest/v1/rpc/get_available_signals?p_user_id=[USER_ID]" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

---

## LEVERANSE

Etter FASE 5 skal du ha:

- [ ] Signal database schema
- [ ] publish-signal edge function
- [ ] Signal feed UI med filtre
- [ ] Futures gating (locked for non-passed)
- [ ] Quiz page for futures access
- [ ] Telegram notifications
- [ ] Paper trade from signal

---

## NESTE STEG

Gå til **FASE 6: Telegram Bot** → `docs/FASE-6-TELEGRAM.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
