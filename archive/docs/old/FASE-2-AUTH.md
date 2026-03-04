# FASE 2: AUTHENTICATION & ONBOARDING

**Estimert tid:** 12 timer  
**Mål:** Full auth flow med 60-sekunders onboarding (3 random spørsmål fra 7)

---

## Task 2.1: Database Schema for Onboarding

### Opprett migration fil

**Fil:** `supabase/migrations/20260201200000_onboarding_system.sql`

```sql
-- Onboarding System for Klarpakke
-- 7 questions in pool, 3 random per user

-- Onboarding Questions Pool
CREATE TABLE IF NOT EXISTS onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key TEXT UNIQUE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('experience', 'goal', 'risk', 'time', 'capital', 'asset', 'style')),
  options JSONB NOT NULL,
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 7 questions
INSERT INTO onboarding_questions (question_key, question_text, question_type, options, display_order) VALUES
  ('experience', 
   'Hva er din erfaring med trading?', 
   'experience',
   '[{"value": "beginner", "label": "Nybegynner - aldri tradet før", "safe_mode": true},
     {"value": "some", "label": "Litt erfaring - prøvd noen ganger", "safe_mode": true},
     {"value": "experienced", "label": "Erfaren - tradet aktivt", "safe_mode": false}]'::jsonb,
   1),
   
  ('goal', 
   'Hva er ditt hovedmål med Klarpakke?', 
   'goal',
   '[{"value": "learn", "label": "Lære trading fra bunnen"},
     {"value": "extra", "label": "Tjene ekstrainntekt"},
     {"value": "fulltime", "label": "Blir heltidstrader"}]'::jsonb,
   2),
   
  ('risk', 
   'Hva er din risikoappetitt?', 
   'risk',
   '[{"value": "low", "label": "Lav - vil helst bevare kapitalen", "max_position": 5},
     {"value": "medium", "label": "Medium - balansert risiko/avkastning", "max_position": 10},
     {"value": "high", "label": "Høy - villig til å ta større risiko", "max_position": 20}]'::jsonb,
   3),
   
  ('time', 
   'Hvor mye tid kan du bruke på trading daglig?', 
   'time',
   '[{"value": "minimal", "label": "Under 30 minutter"},
     {"value": "moderate", "label": "1-2 timer"},
     {"value": "extensive", "label": "3 timer eller mer"}]'::jsonb,
   4),
   
  ('capital', 
   'Hva er din plan for startkapital?', 
   'capital',
   '[{"value": "small", "label": "Under 10 000 kr"},
     {"value": "medium", "label": "10 000 - 50 000 kr"},
     {"value": "large", "label": "Over 50 000 kr"}]'::jsonb,
   5),
   
  ('asset', 
   'Hvilke assets vil du fokusere på?', 
   'asset',
   '[{"value": "crypto", "label": "Kryptovaluta"},
     {"value": "stocks", "label": "Aksjer"},
     {"value": "both", "label": "Begge deler"}]'::jsonb,
   6),
   
  ('style', 
   'Hvilken trading-stil passer deg best?', 
   'style',
   '[{"value": "swing", "label": "Swing trading (dager/uker)"},
     {"value": "day", "label": "Day trading (timer)"},
     {"value": "both", "label": "Begge deler"}]'::jsonb,
   7);

-- User Onboarding Responses
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  answer_label TEXT,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_key)
);

-- User Configuration (auto-set based on onboarding)
CREATE TABLE IF NOT EXISTS user_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  safe_mode BOOLEAN DEFAULT true,
  max_position_percent INTEGER DEFAULT 5,
  trading_goal TEXT,
  risk_level TEXT,
  time_availability TEXT,
  preferred_assets TEXT,
  trading_style TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX idx_user_config_completed ON user_config(onboarding_completed);

-- RLS Policies
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

-- Questions are public readable
CREATE POLICY "Onboarding questions are public readable"
  ON onboarding_questions FOR SELECT
  TO authenticated, anon
  USING (true);

-- Users can only see own responses
CREATE POLICY "Users can view own onboarding responses"
  ON user_onboarding FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding responses"
  ON user_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can manage own config
CREATE POLICY "Users can view own config"
  ON user_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own config"
  ON user_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function: Get random 3 questions for user
CREATE OR REPLACE FUNCTION get_onboarding_questions(p_user_id UUID)
RETURNS TABLE (
  question_key TEXT,
  question_text TEXT,
  question_type TEXT,
  options JSONB
) AS $$
BEGIN
  -- If user has already answered 3+ questions, return empty
  IF (SELECT COUNT(*) FROM user_onboarding WHERE user_id = p_user_id) >= 3 THEN
    RETURN;
  END IF;
  
  -- Get questions not yet answered, pick 3 random
  RETURN QUERY
  SELECT 
    oq.question_key,
    oq.question_text,
    oq.question_type,
    oq.options
  FROM onboarding_questions oq
  WHERE oq.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM user_onboarding uo 
    WHERE uo.user_id = p_user_id 
    AND uo.question_key = oq.question_key
  )
  ORDER BY RANDOM()
  LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Submit onboarding answer
CREATE OR REPLACE FUNCTION submit_onboarding_answer(
  p_user_id UUID,
  p_question_key TEXT,
  p_answer_value TEXT
)
RETURNS JSON AS $$
DECLARE
  v_question onboarding_questions%ROWTYPE;
  v_answer_label TEXT;
  v_safe_mode BOOLEAN;
  v_max_position INTEGER;
BEGIN
  -- Get question details
  SELECT * INTO v_question 
  FROM onboarding_questions 
  WHERE question_key = p_question_key;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Question not found');
  END IF;
  
  -- Get answer label from options
  SELECT option->>'label' INTO v_answer_label
  FROM jsonb_array_elements(v_question.options) AS option
  WHERE option->>'value' = p_answer_value;
  
  -- Store answer
  INSERT INTO user_onboarding (user_id, question_key, answer_value, answer_label)
  VALUES (p_user_id, p_question_key, p_answer_value, v_answer_label)
  ON CONFLICT (user_id, question_key) 
  DO UPDATE SET answer_value = p_answer_value, answer_label = v_answer_label, answered_at = NOW();
  
  -- Auto-configure based on answers
  IF p_question_key = 'experience' AND p_answer_value = 'beginner' THEN
    v_safe_mode := true;
  ELSIF p_question_key = 'risk' THEN
    SELECT (option->>'max_position')::INTEGER INTO v_max_position
    FROM jsonb_array_elements(v_question.options) AS option
    WHERE option->>'value' = p_answer_value;
  END IF;
  
  -- Update or create user_config
  INSERT INTO user_config (
    user_id, 
    safe_mode, 
    max_position_percent,
    trading_goal,
    risk_level,
    time_availability,
    preferred_assets,
    trading_style
  )
  VALUES (
    p_user_id,
    COALESCE(v_safe_mode, true),
    COALESCE(v_max_position, 5),
    CASE WHEN p_question_key = 'goal' THEN p_answer_value END,
    CASE WHEN p_question_key = 'risk' THEN p_answer_value END,
    CASE WHEN p_question_key = 'time' THEN p_answer_value END,
    CASE WHEN p_question_key = 'asset' THEN p_answer_value END,
    CASE WHEN p_question_key = 'style' THEN p_answer_value END
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    safe_mode = COALESCE(EXCLUDED.safe_mode, user_config.safe_mode),
    max_position_percent = COALESCE(EXCLUDED.max_position_percent, user_config.max_position_percent),
    trading_goal = COALESCE(EXCLUDED.trading_goal, user_config.trading_goal),
    risk_level = COALESCE(EXCLUDED.risk_level, user_config.risk_level),
    time_availability = COALESCE(EXCLUDED.time_availability, user_config.time_availability),
    preferred_assets = COALESCE(EXCLUDED.preferred_assets, user_config.preferred_assets),
    trading_style = COALESCE(EXCLUDED.trading_style, user_config.trading_style),
    updated_at = NOW();
  
  -- Check if onboarding is complete (3 questions answered)
  IF (SELECT COUNT(*) FROM user_onboarding WHERE user_id = p_user_id) >= 3 THEN
    UPDATE user_config 
    SET onboarding_completed = true, onboarding_completed_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'answered', 1,
    'total_answered', (SELECT COUNT(*) FROM user_onboarding WHERE user_id = p_user_id),
    'complete', (SELECT COUNT(*) FROM user_onboarding WHERE user_id = p_user_id) >= 3
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger for user_config
CREATE OR REPLACE FUNCTION update_user_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_config_timestamp
  BEFORE UPDATE ON user_config
  FOR EACH ROW
  EXECUTE FUNCTION update_user_config_updated_at();
```

Deploy migration:
```bash
supabase db push
```

---

## Task 2.2: Supabase Auth Integration

### Opprett auth.js

**Fil:** `web/auth.js`

```javascript
/**
 * Klarpakke Authentication Module
 * Supabase Auth integration for Webflow
 */

// Initialize Supabase client
const supabaseUrl = window.KLARPAKKE?.supabaseUrl || 'https://your-project.supabase.co';
const supabaseKey = window.KLARPAKKE?.supabaseAnonKey || 'your-anon-key';
const supabase = window.supabase?.createClient(supabaseUrl, supabaseKey) || 
                 supabase.createClient(supabaseUrl, supabaseKey);

// Store supabase globally
window.klarpakkeSupabase = supabase;

/**
 * Get current session
 */
async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return session;
}

/**
 * Require authentication - redirect if not logged in
 */
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    // Store current URL for redirect after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    window.location.href = '/login';
    return null;
  }
  return session;
}

/**
 * Check if user is authenticated (without redirect)
 */
async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

/**
 * Sign up new user
 */
async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/app/dashboard`
    }
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign in existing user
 */
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // Clear any local storage
  localStorage.removeItem('redirectAfterLogin');
  
  // Redirect to home
  window.location.href = '/';
}

/**
 * Send password reset email
 */
async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  
  if (error) throw error;
  return data;
}

/**
 * Update password
 */
async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
  return data;
}

/**
 * Get current user
 */
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

/**
 * Check if user needs onboarding
 */
async function needsOnboarding() {
  const { data, error } = await supabase
    .from('user_config')
    .select('onboarding_completed')
    .single();
  
  if (error || !data) return true;
  return !data.onboarding_completed;
}

// Export functions
window.klarpakkeAuth = {
  supabase,
  getSession,
  requireAuth,
  isAuthenticated,
  signUp,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  needsOnboarding
};

// Auto-check session on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Update UI based on auth state
  const session = await getSession();
  
  if (session) {
    // User is logged in
    document.body.classList.add('user-logged-in');
    document.body.classList.remove('user-logged-out');
    
    // Update user display elements
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    userEmailElements.forEach(el => {
      el.textContent = session.user.email;
      el.setAttribute('data-user-email', session.user.email);
    });
  } else {
    // User is logged out
    document.body.classList.add('user-logged-out');
    document.body.classList.remove('user-logged-in');
  }
});
```

### Opprett session-guard.js

**Fil:** `web/session-guard.js`

```javascript
/**
 * Session Guard - Protect /app/* routes
 * Redirects to login if not authenticated
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Only run on app pages
  if (!window.location.pathname.startsWith('/app/')) {
    return;
  }
  
  // Check session
  const session = await window.klarpakkeAuth.getSession();
  
  if (!session) {
    // Store current URL
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    // Redirect to login
    window.location.href = '/login';
    return;
  }
  
  // Check if onboarding is needed
  const needsOnboarding = await window.klarpakkeAuth.needsOnboarding();
  
  if (needsOnboarding && window.location.pathname !== '/onboarding') {
    window.location.href = '/onboarding';
    return;
  }
  
  // Check trial/paywall status
  const { data: profile } = await window.klarpakkeSupabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .single();
  
  if (profile) {
    const trialExpired = profile.subscription_status === 'trial' && 
                         new Date(profile.trial_ends_at) < new Date();
    
    if (trialExpired && !window.location.pathname.includes('/paywall')) {
      window.location.href = '/app/paywall';
      return;
    }
  }
  
  // All checks passed - user can access the page
  console.log('Session guard: Access granted');
});
```

---

## Task 2.3: Webflow Auth Pages

### /login page

**Page Settings:**
- Title: `Logg inn - Klarpakke`
- Slug: `login`

**DOM Structure:**
```html
<div id="klarpakke-login-root" data-kp-root="login">
  <form data-login-form>
    <h1>Logg inn</h1>
    
    <div class="form-group">
      <label>E-post</label>
      <input type="email" data-login-email required placeholder="din@email.no">
    </div>
    
    <div class="form-group">
      <label>Passord</label>
      <input type="password" data-login-password required placeholder="••••••••">
    </div>
    
    <div data-login-error style="display: none; color: red;"></div>
    
    <button type="submit" data-login-submit>Logg inn</button>
    
    <p><a href="/forgot-password">Glemt passord?</a></p>
    <p>Har du ikke konto? <a href="/signup">Registrer deg</a></p>
  </form>
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
document.querySelector('[data-login-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.querySelector('[data-login-email]').value;
  const password = document.querySelector('[data-login-password]').value;
  const errorEl = document.querySelector('[data-login-error]');
  
  try {
    await window.klarpakkeAuth.signIn(email, password);
    
    // Redirect
    const redirect = localStorage.getItem('redirectAfterLogin') || '/app/dashboard';
    localStorage.removeItem('redirectAfterLogin');
    window.location.href = redirect;
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
});
</script>
```

### /signup page

**Page Settings:**
- Title: `Registrer deg - Klarpakke`
- Slug: `signup`

**DOM Structure:**
```html
<div id="klarpakke-signup-root" data-kp-root="signup">
  <form data-signup-form>
    <h1>Opprett konto</h1>
    <p>Start din 14-dagers gratis prøveperiode i dag</p>
    
    <div class="form-group">
      <label>E-post</label>
      <input type="email" data-signup-email required>
    </div>
    
    <div class="form-group">
      <label>Passord</label>
      <input type="password" data-signup-password required minlength="8">
      <small>Minst 8 tegn</small>
    </div>
    
    <div class="form-group">
      <label>
        <input type="checkbox" data-signup-terms required>
        Jeg godtar <a href="/terms" target="_blank">brukervilkårene</a> og 
        <a href="/privacy" target="_blank">personvernerklæringen</a>
      </label>
    </div>
    
    <div data-signup-error style="display: none; color: red;"></div>
    
    <button type="submit" data-signup-submit>Opprett konto</button>
    
    <p>Har du allerede konto? <a href="/login">Logg inn</a></p>
  </form>
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
document.querySelector('[data-signup-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.querySelector('[data-signup-email]').value;
  const password = document.querySelector('[data-signup-password]').value;
  const errorEl = document.querySelector('[data-signup-error]');
  
  try {
    await window.klarpakkeAuth.signUp(email, password);
    
    // Show success message or redirect
    alert('Sjekk e-posten din for bekreftelseslenke!');
    window.location.href = '/login';
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
});
</script>
```

### /forgot-password page

**DOM Structure:**
```html
<div id="klarpakke-forgot-password-root">
  <form data-forgot-form>
    <h1>Glemt passord?</h1>
    <p>Skriv inn e-posten din, så sender vi en lenke for å tilbakestille passordet.</p>
    
    <input type="email" data-forgot-email required placeholder="din@email.no">
    <div data-forgot-error style="display: none; color: red;"></div>
    <div data-forgot-success style="display: none; color: green;"></div>
    
    <button type="submit">Send tilbakestillingslenke</button>
    
    <p><a href="/login">Tilbake til innlogging</a></p>
  </form>
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
document.querySelector('[data-forgot-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.querySelector('[data-forgot-email]').value;
  const errorEl = document.querySelector('[data-forgot-error]');
  const successEl = document.querySelector('[data-forgot-success]');
  
  try {
    await window.klarpakkeAuth.resetPassword(email);
    successEl.textContent = 'Sjekk e-posten din for tilbakestillingslenke!';
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
    successEl.style.display = 'none';
  }
});
</script>
```

---

## Task 2.4: 60-Second Onboarding

### /onboarding page

**Page Settings:**
- Title: `Velkommen til Klarpakke - La oss bli kjent`
- Slug: `onboarding`
- Protected: Ja (requires auth)

**DOM Structure:**
```html
<div id="klarpakke-onboarding-root" data-kp-root="onboarding">
  <div class="onboarding-container">
    <h1>La oss sette opp din opplevelse</h1>
    <p>3 raske spørsmål for å tilpasse Klarpakke til deg (tar 60 sekunder)</p>
    
    <!-- Progress bar -->
    <div class="progress-bar">
      <div class="progress" data-progress style="width: 0%"></div>
    </div>
    <p data-progress-text>Spørsmål 1 av 3</p>
    
    <!-- Question container -->
    <div data-question-container>
      <!-- Questions loaded dynamically -->
    </div>
    
    <!-- Navigation -->
    <div class="navigation">
      <button data-prev-btn style="display: none;">Forrige</button>
      <button data-next-btn>Neste</button>
    </div>
  </div>
</div>

<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
(async function() {
  const session = await window.klarpakkeAuth.requireAuth();
  if (!session) return;
  
  // Get 3 random questions
  const { data: questions, error } = await window.klarpakkeSupabase
    .rpc('get_onboarding_questions', { p_user_id: session.user.id });
  
  if (error || !questions || questions.length === 0) {
    // Onboarding already complete or error
    window.location.href = '/app/dashboard';
    return;
  }
  
  let currentQuestion = 0;
  const answers = {};
  
  function renderQuestion(index) {
    const q = questions[index];
    const container = document.querySelector('[data-question-container]');
    
    let optionsHtml = '';
    q.options.forEach((opt, i) => {
      optionsHtml += `
        <label class="option-card">
          <input type="radio" name="answer" value="${opt.value}" 
                 ${answers[q.question_key] === opt.value ? 'checked' : ''}>
          <span class="option-label">${opt.label}</span>
        </label>
      `;
    });
    
    container.innerHTML = `
      <div class="question" data-question-key="${q.question_key}">
        <h2>${q.question_text}</h2>
        <div class="options">${optionsHtml}</div>
      </div>
    `;
    
    // Update progress
    const progress = ((index + 1) / questions.length) * 100;
    document.querySelector('[data-progress]').style.width = `${progress}%`;
    document.querySelector('[data-progress-text]').textContent = 
      `Spørsmål ${index + 1} av ${questions.length}`;
    
    // Update buttons
    document.querySelector('[data-prev-btn]').style.display = 
      index === 0 ? 'none' : 'inline-block';
    document.querySelector('[data-next-btn]').textContent = 
      index === questions.length - 1 ? 'Fullfør' : 'Neste';
  }
  
  // Next button
  document.querySelector('[data-next-btn]').addEventListener('click', async () => {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) {
      alert('Velg et alternativ');
      return;
    }
    
    const q = questions[currentQuestion];
    answers[q.question_key] = selected.value;
    
    // Submit answer to database
    await window.klarpakkeSupabase
      .rpc('submit_onboarding_answer', {
        p_user_id: session.user.id,
        p_question_key: q.question_key,
        p_answer_value: selected.value
      });
    
    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
      renderQuestion(currentQuestion);
    } else {
      // Complete - redirect to dashboard
      window.location.href = '/app/dashboard';
    }
  });
  
  // Previous button
  document.querySelector('[data-prev-btn]').addEventListener('click', () => {
    if (currentQuestion > 0) {
      currentQuestion--;
      renderQuestion(currentQuestion);
    }
  });
  
  // Initial render
  renderQuestion(0);
})();
</script>
```

---

## Task 2.5: Auto Paper Account Creation

### Oppdater handle_new_user trigger

**Legg til i migration:**

```sql
-- Auto-create paper account on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_referred_by UUID;
BEGIN
  -- Generate referral code
  v_referral_code := encode(gen_random_bytes(4), 'hex');
  
  -- Check if signup came from referral
  SELECT referrer_user_id INTO v_referred_by
  FROM referral_tracking
  WHERE referred_user_id IS NULL
  AND created_at > NOW() - INTERVAL '30 days'
  ORDER BY clicked_at DESC
  LIMIT 1;
  
  -- Create profile
  INSERT INTO public.profiles (
    user_id,
    display_name,
    subscription_tier,
    subscription_status,
    trial_started_at,
    trial_ends_at,
    referral_code,
    referred_by
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'free',
    'trial',
    NOW(),
    NOW() + INTERVAL '14 days',
    v_referral_code,
    v_referred_by
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create paper account
  INSERT INTO public.paper_accounts (
    user_id,
    initial_balance,
    current_balance,
    currency
  )
  VALUES (
    NEW.id,
    100000,
    100000,
    'USD'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user config
  INSERT INTO public.user_config (
    user_id,
    safe_mode,
    max_position_percent,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    true,
    5,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Complete referral if applicable
  IF v_referred_by IS NOT NULL THEN
    UPDATE referral_tracking
    SET referred_user_id = NEW.id,
        status = 'signed_up',
        signed_up_at = NOW()
    WHERE referrer_user_id = v_referred_by
    AND referred_user_id IS NULL
    AND created_at > NOW() - INTERVAL '30 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## VERIFIKASJON

### Test onboarding flow

```bash
# 1. Sign up new user
curl -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}'

# 2. Verify profile created
curl -X GET "${SUPABASE_URL}/rest/v1/profiles?user_id=eq.[USER_ID]" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# 3. Verify paper account created
curl -X GET "${SUPABASE_URL}/rest/v1/paper_accounts?user_id=eq.[USER_ID]" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# 4. Get onboarding questions
curl -X GET "${SUPABASE_URL}/rest/v1/rpc/get_onboarding_questions?p_user_id=[USER_ID]" \
  -H "apikey: ${SUPABASE_ANON_KEY}"

# 5. Submit answer
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/submit_onboarding_answer" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "[USER_ID]", "p_question_key": "experience", "p_answer_value": "beginner"}'
```

---

## LEVERANSE

Etter FASE 2 skal du ha:

- [ ] Database schema for onboarding (7 questions, 3 random)
- [ ] auth.js med alle auth-funksjoner
- [ ] session-guard.js for /app/* protection
- [ ] Login page fungerende
- [ ] Signup page fungerende
- [ ] Forgot password page fungerende
- [ ] Onboarding page med 3 random spørsmål
- [ ] Auto paper account creation ved signup
- [ ] Safe mode auto-activated for beginners

---

## NESTE STEG

Gå til **FASE 3: Paper Trading UI** → `docs/FASE-3-PAPER-TRADING.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
