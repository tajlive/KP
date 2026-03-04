# FASE 3: PAPER TRADING UI

**Estimert tid:** 8 timer  
**Mål:** Fungerende paper trading med 100k USD virtual balance

---

## Task 3.1: Paper Trading Dashboard

### Webflow Page: /app/dashboard

**Page Settings:**
- Title: `Dashboard - Klarpakke`
- Slug: `app/dashboard`
- Protected: Yes (auth required)

**DOM Structure:**
```html
<div id="klarpakke-dashboard-root" data-kp-root="dashboard">
  
  <!-- Account Summary -->
  <div class="account-card" data-account-summary>
    <h2>Paper Trading-konto</h2>
    <div class="balance-display">
      <span class="label">Balance</span>
      <span class="amount" data-paper-balance>$100,000.00</span>
    </div>
    <div class="stats-row">
      <div class="stat">
        <span class="label">Daglig endring</span>
        <span class="value" data-daily-pnl>+$0.00</span>
      </div>
      <div class="stat">
        <span class="label">Åpen P/L</span>
        <span class="value" data-open-pnl>+$0.00</span>
      </div>
      <div class="stat">
        <span class="label">Realisert P/L</span>
        <span class="value" data-realized-pnl>+$0.00</span>
      </div>
    </div>
  </div>
  
  <!-- Quick Actions -->
  <div class="quick-actions">
    <button data-action="new-trade" class="primary">Ny Handel</button>
    <button data-action="view-positions">Åpne Posisjoner</button>
    <button data-action="trade-history">Handelshistorikk</button>
  </div>
  
  <!-- Open Positions -->
  <div class="positions-section">
    <h3>Åpne Posisjoner <span data-positions-count>(0)</span></h3>
    <div data-positions-list>
      <p class="empty-state">Ingen åpne posisjoner</p>
    </div>
  </div>
  
  <!-- Recent Trades -->
  <div class="trades-section">
    <h3>Siste Handler</h3>
    <div data-recent-trades>
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Type</th>
            <th>Inngang</th>
            <th>Nåværende</th>
            <th>P/L</th>
            <th>Tid</th>
          </tr>
        </thead>
        <tbody data-trades-tbody>
          <!-- Filled dynamically -->
        </tbody>
      </table>
    </div>
  </div>
  
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/paper-trading.js"></script>
<script>
// Dashboard specific logic
(async function() {
  await window.klarpakkeAuth.requireAuth();
  
  const supabase = window.klarpakkeSupabase;
  
  // Load paper account data
  async function loadPaperAccount() {
    const { data: account, error } = await supabase
      .from('paper_accounts')
      .select('*')
      .single();
    
    if (account) {
      document.querySelector('[data-paper-balance]').textContent = 
        formatCurrency(account.current_balance);
      document.querySelector('[data-realized-pnl]').textContent = 
        formatCurrency(account.total_realized_pnl || 0);
    }
  }
  
  // Load open positions
  async function loadPositions() {
    const { data: positions, error } = await supabase
      .from('paper_positions')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false });
    
    document.querySelector('[data-positions-count]').textContent = `(${positions?.length || 0})`;
    
    const listEl = document.querySelector('[data-positions-list]');
    if (!positions || positions.length === 0) {
      listEl.innerHTML = '<p class="empty-state">Ingen åpne posisjoner</p>';
      return;
    }
    
    // Calculate total open P/L
    const totalOpenPnl = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
    document.querySelector('[data-open-pnl]').textContent = formatCurrency(totalOpenPnl);
    
    // Render positions
    listEl.innerHTML = positions.map(pos => `
      <div class="position-card" data-position-id="${pos.id}">
        <div class="pos-header">
          <span class="ticker">${pos.ticker}</span>
          <span class="side ${pos.side}">${pos.side === 'long' ? 'KJØP' : 'SALG'}</span>
          <span class="leverage">${pos.leverage}x</span>
        </div>
        <div class="pos-details">
          <div>Størrelse: ${pos.position_size} ${pos.ticker.replace('USDT', '')}</div>
          <div>Inngang: $${pos.entry_price}</div>
          <div>Nåværende: $${pos.current_price || pos.entry_price}</div>
          <div class="pnl ${(pos.unrealized_pnl || 0) >= 0 ? 'positive' : 'negative'}">
            P/L: ${formatCurrency(pos.unrealized_pnl || 0)}
          </div>
        </div>
        <div class="pos-actions">
          <button class="close-btn" data-close-position="${pos.id}">Lukk Posisjon</button>
        </div>
      </div>
    `).join('');
    
    // Add close handlers
    document.querySelectorAll('[data-close-position]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const positionId = e.target.dataset.closePosition;
        await closePosition(positionId);
      });
    });
  }
  
  // Load recent trades
  async function loadRecentTrades() {
    const { data: trades, error } = await supabase
      .from('paper_trades')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    const tbody = document.querySelector('[data-trades-tbody]');
    if (!trades || trades.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">Ingen handler ennå</td></tr>';
      return;
    }
    
    tbody.innerHTML = trades.map(trade => `
      <tr>
        <td>${trade.ticker}</td>
        <td class="${trade.trade_type}">${trade.trade_type.toUpperCase()}</td>
        <td>$${trade.entry_price}</td>
        <td>$${trade.close_price || '-'}</td>
        <td class="${(trade.realized_pnl || 0) >= 0 ? 'positive' : 'negative'}">
          ${formatCurrency(trade.realized_pnl || 0)}
        </td>
        <td>${formatTime(trade.created_at)}</td>
      </tr>
    `).join('');
  }
  
  // Close position
  async function closePosition(positionId) {
    if (!confirm('Er du sikker på at du vil lukke denne posisjonen?')) return;
    
    const { error } = await supabase
      .rpc('close_paper_position', { p_position_id: positionId });
    
    if (error) {
      alert('Kunne ikke lukke posisjon: ' + error.message);
      return;
    }
    
    // Refresh data
    await Promise.all([loadPaperAccount(), loadPositions(), loadRecentTrades()]);
  }
  
  // Helper functions
  function formatCurrency(value) {
    const num = parseFloat(value);
    const prefix = num >= 0 ? '+$' : '-$';
    return prefix + Math.abs(num).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }
  
  function formatTime(isoString) {
    return new Date(isoString).toLocaleString('nb-NO');
  }
  
  // Initialize
  await Promise.all([loadPaperAccount(), loadPositions(), loadRecentTrades()]);
  
  // Auto-refresh every 10 seconds
  setInterval(async () => {
    await loadPaperAccount();
    await loadPositions();
  }, 10000);
  
})();
</script>
```

---

## Task 3.2: New Trade Dialog

### Opprett new-trade-modal.js

**Fil:** `web/new-trade-modal.js`

```javascript
/**
 * New Trade Modal for Paper Trading
 */

class NewTradeModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
  }
  
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'trade-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Ny Paper Trade</h2>
            <button class="close-btn" data-close-modal>&times;</button>
          </div>
          
          <form class="trade-form" data-trade-form>
            <!-- Asset Selection -->
            <div class="form-group">
              <label>Asset</label>
              <select name="ticker" required>
                <option value="">Velg...</option>
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="SOLUSDT">SOL/USDT</option>
                <option value="ADAUSDT">ADA/USDT</option>
              </select>
            </div>
            
            <!-- Trade Type -->
            <div class="form-group">
              <label>Retning</label>
              <div class="radio-group">
                <label>
                  <input type="radio" name="side" value="long" checked>
                  <span>Kjøp (Long)</span>
                </label>
                <label>
                  <input type="radio" name="side" value="short">
                  <span>Selg (Short)</span>
                </label>
              </div>
            </div>
            
            <!-- Position Size -->
            <div class="form-group">
              <label>Posisjonsstørrelse (USD)</label>
              <input type="number" name="position_size" min="100" step="100" 
                     value="1000" required>
              <small>Maks: <span data-max-position>$5,000</span></small>
            </div>
            
            <!-- Leverage -->
            <div class="form-group">
              <label>Leverage</label>
              <select name="leverage">
                <option value="1">1x (Ingen)</option>
                <option value="3">3x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
              </select>
            </div>
            
            <!-- Stop Loss -->
            <div class="form-group">
              <label>
                <input type="checkbox" name="use_stop_loss">
                Bruk Stop Loss
              </label>
              <input type="number" name="stop_loss" step="0.01" 
                     placeholder="SL pris" disabled>
            </div>
            
            <!-- Take Profit -->
            <div class="form-group">
              <label>
                <input type="checkbox" name="use_take_profit">
                Bruk Take Profit
              </label>
              <input type="number" name="take_profit" step="0.01" 
                     placeholder="TP pris" disabled>
            </div>
            
            <!-- Risk Warning for Beginners -->
            <div class="risk-warning" data-risk-warning style="display: none;">
              ⚠️ <strong>Husk:</strong> Du er i Safe Mode. Start med paper trading 
              til du forstår risikoen ved leverage.
            </div>
            
            <!-- Error Display -->
            <div class="error-message" data-error style="display: none; color: red;"></div>
            
            <!-- Submit -->
            <button type="submit" class="primary">Åpne Posisjon</button>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.modal = modal;
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    // Close button
    this.modal.querySelector('[data-close-modal]').addEventListener('click', () => {
      this.close();
    });
    
    // Close on overlay click
    this.modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.close();
    });
    
    // Form submission
    this.modal.querySelector('[data-trade-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitTrade();
    });
    
    // Toggle SL/TP inputs
    const slCheckbox = this.modal.querySelector('[name="use_stop_loss"]');
    const slInput = this.modal.querySelector('[name="stop_loss"]');
    slCheckbox.addEventListener('change', () => {
      slInput.disabled = !slCheckbox.checked;
    });
    
    const tpCheckbox = this.modal.querySelector('[name="use_take_profit"]');
    const tpInput = this.modal.querySelector('[name="take_profit"]');
    tpCheckbox.addEventListener('change', () => {
      tpInput.disabled = !tpCheckbox.checked;
    });
  }
  
  async loadUserConfig() {
    const { data: config } = await window.klarpakkeSupabase
      .from('user_config')
      .select('safe_mode, max_position_percent')
      .single();
    
    if (config) {
      // Update max position display
      const maxPosition = config.max_position_percent * 1000; // Assuming 100k balance
      this.modal.querySelector('[data-max-position]').textContent = 
        '$' + maxPosition.toLocaleString();
      
      // Show safe mode warning
      if (config.safe_mode) {
        this.modal.querySelector('[data-risk-warning]').style.display = 'block';
      }
    }
  }
  
  async submitTrade() {
    const form = this.modal.querySelector('[data-trade-form]');
    const formData = new FormData(form);
    
    const tradeData = {
      ticker: formData.get('ticker'),
      side: formData.get('side'),
      position_size: parseFloat(formData.get('position_size')),
      leverage: parseInt(formData.get('leverage')),
      stop_loss: formData.get('use_stop_loss') ? parseFloat(formData.get('stop_loss')) : null,
      take_profit: formData.get('use_take_profit') ? parseFloat(formData.get('take_profit')) : null
    };
    
    const errorEl = this.modal.querySelector('[data-error]');
    
    try {
      const { data, error } = await window.klarpakkeSupabase
        .rpc('open_paper_position', tradeData);
      
      if (error) throw error;
      
      this.close();
      // Emit event for dashboard to refresh
      document.dispatchEvent(new CustomEvent('trade:opened', { detail: data }));
      
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    }
  }
  
  open() {
    if (!this.modal) {
      this.createModal();
    }
    this.modal.style.display = 'block';
    this.isOpen = true;
    this.loadUserConfig();
  }
  
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.isOpen = false;
    }
  }
}

// Export
window.NewTradeModal = NewTradeModal;

// Auto-initialize on dashboard
if (document.querySelector('[data-kp-root="dashboard"]')) {
  const modal = new NewTradeModal();
  
  document.querySelector('[data-action="new-trade"]')?.addEventListener('click', () => {
    modal.open();
  });
}
```

---

## Task 3.3: Paper Trading Edge Functions

### open-paper-position function

**Fil:** `supabase/functions/open-paper-position/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

interface TradeRequest {
  ticker: string;
  side: 'long' | 'short';
  position_size: number;
  leverage: number;
  stop_loss?: number;
  take_profit?: number;
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const tradeData: TradeRequest = await req.json();
  
  // Validation
  if (!tradeData.ticker || !tradeData.side) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  
  // Get current price (mock - integrate with Binance API)
  const currentPrice = await getMockPrice(tradeData.ticker);
  
  // Get user config for limits
  const { data: config } = await supabase
    .from('user_config')
    .select('max_position_percent, safe_mode')
    .eq('user_id', user.id)
    .single();
  
  // Get paper account
  const { data: account } = await supabase
    .from('paper_accounts')
    .select('current_balance')
    .eq('user_id', user.id)
    .single();
  
  const maxPositionValue = (account?.current_balance || 100000) * (config?.max_position_percent || 5) / 100;
  
  if (tradeData.position_size > maxPositionValue) {
    return new Response(
      JSON.stringify({ error: `Position size exceeds max ${config?.max_position_percent || 5}% limit` }), 
      { status: 400 }
    );
  }
  
  // Safe mode: limit leverage
  if (config?.safe_mode && tradeData.leverage > 5) {
    return new Response(
      JSON.stringify({ error: 'Safe mode limits leverage to 5x maximum' }), 
      { status: 400 }
    );
  }
  
  // Calculate position details
  const quantity = tradeData.position_size / currentPrice;
  const margin = tradeData.position_size / tradeData.leverage;
  
  // Create position
  const { data: position, error } = await supabase
    .from('paper_positions')
    .insert({
      user_id: user.id,
      ticker: tradeData.ticker,
      side: tradeData.side,
      entry_price: currentPrice,
      position_size: quantity,
      margin_used: margin,
      leverage: tradeData.leverage,
      stop_loss: tradeData.stop_loss,
      take_profit: tradeData.take_profit,
      status: 'open',
      opened_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  
  // Update paper account
  await supabase
    .from('paper_accounts')
    .update({ 
      margin_used: supabase.rpc('coalesce', { value: 'margin_used', default: 0 }) + margin 
    })
    .eq('user_id', user.id);
  
  // Create trade record
  await supabase
    .from('paper_trades')
    .insert({
      user_id: user.id,
      position_id: position.id,
      ticker: tradeData.ticker,
      trade_type: tradeData.side,
      entry_price: currentPrice,
      quantity: quantity,
      leverage: tradeData.leverage,
      status: 'open'
    });
  
  return new Response(JSON.stringify({ success: true, position }), { status: 200 });
};

// Mock price function - replace with real Binance API
async function getMockPrice(ticker: string): Promise<number> {
  // TODO: Integrate with Binance API
  const mockPrices: Record<string, number> = {
    'BTCUSDT': 65000,
    'ETHUSDT': 3500,
    'SOLUSDT': 150,
    'ADAUSDT': 0.50
  };
  return mockPrices[ticker] || 100;
}
```

### close-paper-position function

**Fil:** `supabase/functions/close-paper-position/index.ts`

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
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  );
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const { position_id } = await req.json();
  
  // Get position
  const { data: position, error: posError } = await supabase
    .from('paper_positions')
    .select('*')
    .eq('id', position_id)
    .eq('user_id', user.id)
    .eq('status', 'open')
    .single();
  
  if (posError || !position) {
    return new Response(JSON.stringify({ error: 'Position not found' }), { status: 404 });
  }
  
  // Get current price
  const currentPrice = await getMockPrice(position.ticker);
  
  // Calculate P/L
  let realizedPnl = 0;
  if (position.side === 'long') {
    realizedPnl = (currentPrice - position.entry_price) * position.position_size;
  } else {
    realizedPnl = (position.entry_price - currentPrice) * position.position_size;
  }
  
  // Update position
  await supabase
    .from('paper_positions')
    .update({
      status: 'closed',
      close_price: currentPrice,
      realized_pnl: realizedPnl,
      closed_at: new Date().toISOString()
    })
    .eq('id', position_id);
  
  // Update trade record
  await supabase
    .from('paper_trades')
    .update({
      close_price: currentPrice,
      realized_pnl: realizedPnl,
      status: 'closed',
      closed_at: new Date().toISOString()
    })
    .eq('position_id', position_id);
  
  // Update paper account
  await supabase.rpc('update_paper_account_on_close', {
    p_user_id: user.id,
    p_realized_pnl: realizedPnl,
    p_margin_released: position.margin_used
  });
  
  return new Response(JSON.stringify({ 
    success: true, 
    realized_pnl: realizedPnl 
  }), { status: 200 });
};

async function getMockPrice(ticker: string): Promise<number> {
  const mockPrices: Record<string, number> = {
    'BTCUSDT': 65000,
    'ETHUSDT': 3500,
    'SOLUSDT': 150,
    'ADAUSDT': 0.50
  };
  return mockPrices[ticker] || 100;
}
```

---

## Task 3.4: Safe Mode Configuration

### Safe Mode UI Elements

**På dashboard:**
```html
<!-- Safe Mode Badge -->
<div class="safe-mode-badge" data-safe-mode-badge>
  🛡️ Safe Mode: PÅ
  <button data-toggle-safe>Deaktiver</button>
</div>

<script>
// Load safe mode status
async function loadSafeMode() {
  const { data: config } = await window.klarpakkeSupabase
    .from('user_config')
    .select('safe_mode')
    .single();
  
  const badge = document.querySelector('[data-safe-mode-badge]');
  if (config?.safe_mode) {
    badge.innerHTML = '🛡️ Safe Mode: PÅ <button data-toggle-safe>Deaktiver</button>';
  } else {
    badge.innerHTML = '⚡ Safe Mode: AV <button data-toggle-safe>Aktiver</button>';
  }
  
  // Toggle handler
  document.querySelector('[data-toggle-safe]')?.addEventListener('click', async () => {
    const newValue = !config?.safe_mode;
    
    if (!newValue) {
      // Confirm before disabling
      if (!confirm('Ved å deaktivere Safe Mode kan du bruke høyere leverage. ' +
                   'Dette øker risikoen betraktelig. Er du sikker?')) {
        return;
      }
    }
    
    await window.klarpakkeSupabase
      .from('user_config')
      .update({ safe_mode: newValue })
      .eq('user_id', (await window.klarpakkeAuth.getCurrentUser()).id);
    
    loadSafeMode(); // Refresh
  });
}

loadSafeMode();
</script>
```

---

## VERIFIKASJON

### Test paper trading flow

```bash
# 1. Sign in as test user
export TOKEN=$(curl -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}' \
  | jq -r '.access_token')

# 2. Verify paper account exists
curl -X GET "${SUPABASE_URL}/rest/v1/paper_accounts?select=*" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Open position
curl -X POST "${SUPABASE_URL}/functions/v1/open-paper-position" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "BTCUSDT",
    "side": "long",
    "position_size": 1000,
    "leverage": 3
  }'

# 4. Check positions
curl -X GET "${SUPABASE_URL}/rest/v1/paper_positions?status=eq.open" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## LEVERANSE

Etter FASE 3 skal du ha:

- [ ] Dashboard med paper account summary
- [ ] "Ny Handel" knapp og modal
- [ ] Åpne posisjoner display
- [ ] Trade history table
- [ ] open-paper-position edge function
- [ ] close-paper-position edge function
- [ ] Safe mode toggle i UI
- [ ] Auto-refresh hvert 10. sekund

---

## NESTE STEG

Gå til **FASE 4: Stripe Billing** → `docs/FASE-4-STRIPE.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
