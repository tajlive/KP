# FASE 7: REFERRAL SYSTEM

**Estimert tid:** 5 timer  
**Mål:** "Gi 1 mnd, få 30%" referral system

---

## Task 7.1: Referral Database Schema

### Migration

**Fil:** `supabase/migrations/20260201220000_referral_system.sql`

```sql
-- Referral System for Klarpakke
-- "Gi 1 mnd, få 30%" - Referrer gets 1 month free PRO, Referee gets 30% off

-- Referral Tracking
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'expired')),
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ, -- Became paying customer
  reward_claimed BOOLEAN DEFAULT false,
  reward_claimed_at TIMESTAMPTZ,
  referee_discount_used BOOLEAN DEFAULT false,
  referee_discount_amount INTEGER DEFAULT 150, -- 30% of 500kr
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Rewards (for referrers)
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_month', 'credit')),
  reward_value INTEGER NOT NULL, -- NOK value
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired')),
  source_referral_id UUID REFERENCES referral_tracking(id),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_referral_code ON referral_tracking(referral_code);
CREATE INDEX idx_referral_referrer ON referral_tracking(referrer_user_id);
CREATE INDEX idx_referral_referred ON referral_tracking(referred_user_id);
CREATE INDEX idx_referral_status ON referral_tracking(status);
CREATE INDEX idx_rewards_referrer ON referral_rewards(referrer_user_id);
CREATE INDEX idx_rewards_status ON referral_rewards(status);

-- RLS Policies
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users view own referrals"
  ON referral_tracking FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

-- Users can view their own rewards
CREATE POLICY "Users view own rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING (referrer_user_id = auth.uid());

-- Function: Get or create referral code for user
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_existing_code TEXT;
  v_new_code TEXT;
BEGIN
  -- Check if user already has a code
  SELECT referral_code INTO v_existing_code
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_existing_code IS NOT NULL AND v_existing_code != '' THEN
    RETURN v_existing_code;
  END IF;
  
  -- Generate new code (first 8 chars of uuid, uppercase)
  v_new_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
  
  -- Update profile
  UPDATE profiles
  SET referral_code = v_new_code
  WHERE user_id = p_user_id;
  
  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track referral click
CREATE OR REPLACE FUNCTION track_referral_click(p_referral_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_referrer_id UUID;
  v_tracking_id UUID;
BEGIN
  -- Find referrer
  SELECT user_id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = UPPER(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid referral code');
  END IF;
  
  -- Create tracking record
  INSERT INTO referral_tracking (referral_code, referrer_user_id)
  VALUES (UPPER(p_referral_code), v_referrer_id)
  RETURNING id INTO v_tracking_id;
  
  RETURN json_build_object(
    'success', true,
    'tracking_id', v_tracking_id,
    'referrer_id', v_referrer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete referral (when referee becomes paying customer)
CREATE OR REPLACE FUNCTION complete_referral(
  p_referred_user_id UUID,
  p_subscription_tier TEXT
)
RETURNS JSON AS $$
DECLARE
  v_referral_record referral_tracking%ROWTYPE;
  v_reward_value INTEGER := 500; -- 1 month of PRO = 500 NOK
BEGIN
  -- Find pending referral for this user
  SELECT * INTO v_referral_record
  FROM referral_tracking
  WHERE referred_user_id = p_referred_user_id
  AND status = 'signed_up'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'No pending referral found');
  END IF;
  
  -- Update referral status
  UPDATE referral_tracking
  SET status = 'converted',
      converted_at = NOW()
  WHERE id = v_referral_record.id;
  
  -- Create reward for referrer (1 month free PRO)
  INSERT INTO referral_rewards (
    referrer_user_id,
    reward_type,
    reward_value,
    source_referral_id,
    expires_at
  )
  VALUES (
    v_referral_record.referrer_user_id,
    'free_month',
    v_reward_value,
    v_referral_record.id,
    NOW() + INTERVAL '12 months'
  );
  
  -- Apply discount to referrer's next invoice (credit)
  UPDATE profiles
  SET referral_credit = COALESCE(referral_credit, 0) + v_reward_value
  WHERE user_id = v_referral_record.referrer_user_id;
  
  RETURN json_build_object(
    'success', true,
    'reward_value', v_reward_value,
    'referrer_id', v_referral_record.referrer_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get referral stats for user
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_clicks INTEGER;
  v_total_signups INTEGER;
  v_total_converted INTEGER;
  v_pending_rewards INTEGER;
  v_total_earned INTEGER;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE 1=1),
    COUNT(*) FILTER (WHERE status IN ('signed_up', 'converted')),
    COUNT(*) FILTER (WHERE status = 'converted'),
    COALESCE(SUM(reward_value) FILTER (WHERE status = 'pending'), 0),
    COALESCE(SUM(reward_value) FILTER (WHERE status = 'applied'), 0)
  INTO v_total_clicks, v_total_signups, v_total_converted, v_pending_rewards, v_total_earned
  FROM referral_tracking rt
  LEFT JOIN referral_rewards rr ON rt.id = rr.source_referral_id
  WHERE rt.referrer_user_id = p_user_id;
  
  RETURN json_build_object(
    'total_clicks', v_total_clicks,
    'total_signups', v_total_signups,
    'total_converted', v_total_converted,
    'pending_rewards', v_pending_rewards,
    'total_earned', v_total_earned,
    'conversion_rate', CASE 
      WHEN v_total_clicks > 0 THEN ROUND((v_total_converted::NUMERIC / v_total_clicks) * 100, 1)
      ELSE 0
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add referral_credit to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_credit INTEGER DEFAULT 0;
```

---

## Task 7.2: Referral UI

### /app/referrals page

**DOM Structure:**
```html
<div id="klarpakke-referrals-root" data-kp-root="referrals">
  
  <h1>Ver en Venn</h1>
  <p class="subtitle">Gi 1 måned gratis, få 30% rabatt</p>
  
  <!-- Referral Code -->
  <div class="referral-code-section">
    <h2>Din Referral Link</h2>
    <div class="code-box">
      <input type="text" data-referral-link readonly value="https://klarpakke.no/?ref=LOADING...">
      <button data-copy-link>Kopier</button>
    </div>
    <p class="hint">Del denne linken med venner. Når de blir betalende kunder:</p>
    <ul class="benefits">
      <li>🏆 <strong>Du får:</strong> 1 måned PRO gratis (500 kr verdi)</li>
      <li>🎁 <strong>Vennen får:</strong> 30% rabatt første måned</li>
    </ul>
  </div>
  
  <!-- Stats -->
  <div class="referral-stats">
    <h2>Din Statistikk</h2>
    <div class="stats-grid">
      <div class="stat">
        <span class="number" data-stat-clicks>0</span>
        <span class="label">Klikk</span>
      </div>
      <div class="stat">
        <span class="number" data-stat-signups>0</span>
        <span class="label">Påmeldinger</span>
      </div>
      <div class="stat">
        <span class="number" data-stat-converted>0</span>
        <span class="label">Betaling</span>
      </div>
      <div class="stat highlight">
        <span class="number" data-stat-earned>0 kr</span>
        <span class="label">Tjent</span>
      </div>
    </div>
  </div>
  
  <!-- Share Buttons -->
  <div class="share-section">
    <h2>Del</h2>
    <div class="share-buttons">
      <button data-share="twitter">Twitter</button>
      <button data-share="facebook">Facebook</button>
      <button data-share="email">E-post</button>
      <button data-share="whatsapp">WhatsApp</button>
    </div>
  </div>
  
  <!-- Recent Referrals -->
  <div class="recent-referrals">
    <h2>Siste Henvisninger</h2>
    <table data-referrals-table>
      <thead>
        <tr>
          <th>Dato</th>
          <th>Status</th>
          <th>Belønning</th>
        </tr>
      </thead>
      <tbody>
        <!-- Loaded dynamically -->
      </tbody>
    </table>
  </div>
  
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
(async function() {
  await window.klarpakkeAuth.requireAuth();
  
  const supabase = window.klarpakkeSupabase;
  const user = await window.klarpakkeAuth.getCurrentUser();
  
  // Get or create referral code
  const { data: code } = await supabase
    .rpc('get_or_create_referral_code', { p_user_id: user.id });
  
  const referralLink = `https://klarpakke.no/?ref=${code}`;
  document.querySelector('[data-referral-link]').value = referralLink;
  
  // Copy handler
  document.querySelector('[data-copy-link]').addEventListener('click', () => {
    navigator.clipboard.writeText(referralLink);
    alert('Kopiert til utklippstavlen!');
  });
  
  // Load stats
  const { data: stats } = await supabase
    .rpc('get_referral_stats', { p_user_id: user.id });
  
  if (stats) {
    document.querySelector('[data-stat-clicks]').textContent = stats.total_clicks;
    document.querySelector('[data-stat-signups]').textContent = stats.total_signups;
    document.querySelector('[data-stat-converted]').textContent = stats.total_converted;
    document.querySelector('[data-stat-earned]').textContent = `${stats.total_earned} kr`;
  }
  
  // Share handlers
  const shareText = `Prøv Klarpakke - trading signaltjeneste! Få 30% rabatt med min link: ${referralLink}`;
  
  document.querySelector('[data-share="twitter"]').addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`);
  });
  
  document.querySelector('[data-share="facebook"]').addEventListener('click', () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`);
  });
  
  document.querySelector('[data-share="email"]').addEventListener('click', () => {
    window.location.href = `mailto:?subject=Prøv Klarpakke&body=${encodeURIComponent(shareText)}`;
  });
  
  document.querySelector('[data-share="whatsapp"]').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  });
  
  // Load recent referrals
  const { data: referrals } = await supabase
    .from('referral_tracking')
    .select('*')
    .eq('referrer_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  
  const tbody = document.querySelector('[data-referrals-table] tbody');
  tbody.innerHTML = referrals?.map(r => `
    <tr>
      <td>${new Date(r.created_at).toLocaleDateString('nb-NO')}</td>
      <td>
        ${r.status === 'pending' ? '⏳ Klikket' : ''}
        ${r.status === 'signed_up' ? '✅ Registrert' : ''}
        ${r.status === 'converted' ? '🎉 Betalende' : ''}
      </td>
      <td>${r.status === 'converted' ? '500 kr' : '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="3">Ingen henvisninger ennå</td></tr>';
})();
</script>
```

---

## Task 7.3: Landing Page Referral Capture

### Capture referral on signup

```javascript
// Add to signup page

// Check for ref parameter
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');

if (refCode) {
  // Store in localStorage
  localStorage.setItem('referralCode', refCode);
  
  // Track click (optional - could be done server-side)
  fetch(`${SUPABASE_URL}/functions/v1/track-referral`, {
    method: 'POST',
    body: JSON.stringify({ code: refCode })
  });
}

// On signup, include referral code
async function handleSignup(email, password) {
  const referralCode = localStorage.getItem('referralCode');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        referral_code: referralCode
      }
    }
  });
  
  // Clear stored code
  localStorage.removeItem('referralCode');
  
  return { data, error };
}
```

---

## Task 7.4: Apply Discount at Checkout

### Update create-checkout-session

```typescript
// In create-checkout-session edge function

async function createCheckout(req) {
  const { tier, referral_code } = await req.json();
  
  let discountAmount = 0;
  
  // Check if user has referral discount
  if (referral_code) {
    const { data: referral } = await supabase
      .from('referral_tracking')
      .select('*')
      .eq('referral_code', referral_code.toUpperCase())
      .eq('referred_user_id', user.id)
      .eq('referee_discount_used', false)
      .single();
    
    if (referral) {
      discountAmount = referral.referee_discount_amount;
      
      // Mark as used
      await supabase
        .from('referral_tracking')
        .update({ referee_discount_used: true })
        .eq('id', referral.id);
    }
  }
  
  // Calculate final amount
  const baseAmount = getTierAmount(tier);
  const finalAmount = Math.max(0, baseAmount - discountAmount);
  
  // Create Stripe checkout with discount
  // ... implementation
}
```

---

## VERIFIKASJON

```bash
# 1. Create referral code
curl -X GET "${SUPABASE_URL}/rest/v1/rpc/get_or_create_referral_code?p_user_id=[USER_ID]" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# 2. Track click
curl -X GET "${SUPABASE_URL}/rest/v1/rpc/track_referral_click?p_referral_code=ABC123" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# 3. Complete referral
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/complete_referral" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_referred_user_id": "[USER_ID]", "p_subscription_tier": "pro"}'
```

---

## LEVERANSE

Etter FASE 7 skal du ha:

- [ ] Referral database schema
- [ ] get_or_create_referral_code function
- [ ] track_referral_click function
- [ ] complete_referral function
- [ ] Referrals page med stats
- [ ] Landing page capture
- [ ] 30% discount applied at checkout

---

## NESTE STEG

Gå til **FASE 8: Content Management** → `docs/FASE-8-CMS.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
