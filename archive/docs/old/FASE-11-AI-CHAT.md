# FASE 11: AI TRADING ASSISTANT

**Estimert tid:** 8 timer  
**Mål:** Chatbot som hjelper med trading-spørsmål

---

## Task 11.1: AI Chat Backend

### Edge Function: ai-chat

**Fil:** `supabase/functions/ai-chat/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
  
  const { message, conversation_id } = await req.json();
  
  // Rate limiting check
  const { count } = await supabase
    .from('ai_chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour
  
  const tier = await getUserTier(supabase, user.id);
  const limit = tier === 'elite' ? 100 : tier === 'premium' ? 50 : tier === 'pro' ? 20 : 5;
  
  if ((count || 0) >= limit) {
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded. Upgrade for more messages.' 
    }), { status: 429 });
  }
  
  // Get conversation history
  const { data: history } = await supabase
    .from('ai_chat_messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })
    .limit(20);
  
  // Build system prompt
  const systemPrompt = `Du er Klarpakke AI, en trading-assistent. 
Du hjelper brukere med:
- Forklaring av trading-konsepter
- Risikostyring råd
- Teknisk analyse veiledning
- Platform-bruks-spørsmål

VIKTIG: 
- Du gir IKKE konkrete kjøps- eller salgsråd
- Du er IKKE en finansiell rådgiver
- Alltid minn brukere om risiko ved trading

Brukerens tier: ${tier}`;
  
  // Call OpenAI
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history || []),
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  const aiResponse = await response.json();
  const reply = aiResponse.choices[0].message.content;
  
  // Store messages
  await supabase.from('ai_chat_messages').insert([
    {
      user_id: user.id,
      conversation_id: conversation_id,
      role: 'user',
      content: message
    },
    {
      user_id: user.id,
      conversation_id: conversation_id,
      role: 'assistant',
      content: reply
    }
  ]);
  
  return new Response(JSON.stringify({ reply }), { status: 200 });
};

async function getUserTier(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', userId)
    .single();
  return data?.subscription_tier || 'free';
}
```

---

## Task 11.2: Chat UI

### /app/chat page

```html
<div id="klarpakke-chat-root" data-kp-root="ai-chat">
  
  <div class="chat-container">
    
    <!-- Messages -->
    <div class="chat-messages" data-chat-messages>
      <div class="message bot">
        <div class="avatar">🤖</div>
        <div class="content">
          Hei! Jeg er din Klarpakke AI-assistent. Jeg kan hjelpe deg med:
          <ul>
            <li>Trading-konsepter og strategier</li>
            <li>Risikostyring</li>
            <li>Teknisk analyse</li>
            <li>Spørsmål om plattformen</li>
          </ul>
          <p class="disclaimer">⚠️ Jeg er ikke en finansiell rådgiver og gir ikke kjøps/salgsråd.</p>
        </div>
      </div>
    </div>
    
    <!-- Input -->
    <div class="chat-input">
      <input type="text" data-chat-input placeholder="Spør om trading..." maxlength="500">
      <button data-send-btn>Send</button>
    </div>
    
    <!-- Usage -->
    <div class="usage-info">
      <span data-usage-text>0 / 20 meldinger i dag</span>
    </div>
    
  </div>
  
  <!-- Suggested Questions -->
  <div class="suggested-questions">
    <h3>Forslag:</h3>
    <button data-suggest="Hva er stop loss?">Hva er stop loss?</button>
    <button data-suggest="Forklar RSI">Forklar RSI</button>
    <button data-suggest="Hvordan bruker jeg paper trading?">Hvordan bruker jeg paper trading?</button>
  </div>
  
</div>

<style>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f9fafb;
}

.message {
  display: flex;
  margin-bottom: 16px;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.message .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
}

.message .content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.message.user .content {
  background: #2563eb;
  color: white;
}

.chat-input {
  display: flex;
  padding: 16px;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.chat-input input {
  flex: 1;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.chat-input button {
  padding: 12px 24px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.usage-info {
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.suggested-questions {
  margin-top: 16px;
}

.suggested-questions button {
  margin: 4px;
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  background: white;
  cursor: pointer;
}

.suggested-questions button:hover {
  background: #f3f4f6;
}

.disclaimer {
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
  font-style: italic;
}
</style>

<script>
(async function() {
  await window.klarpakkeAuth.requireAuth();
  
  const conversationId = localStorage.getItem('chatConversationId') || crypto.randomUUID();
  localStorage.setItem('chatConversationId', conversationId);
  
  const messagesEl = document.querySelector('[data-chat-messages]');
  const inputEl = document.querySelector('[data-chat-input]');
  const sendBtn = document.querySelector('[data-send-btn]');
  
  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
      <div class="avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="content">${content}</div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  async function sendMessage() {
    const message = inputEl.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage('user', message);
    inputEl.value = '';
    
    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = typingId;
    typingDiv.className = 'message bot';
    typingDiv.innerHTML = `
      <div class="avatar">🤖</div>
      <div class="content">Skriver...</div>
    `;
    messagesEl.appendChild(typingDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    
    try {
      const { data, error } = await window.klarpakkeSupabase
        .functions.invoke('ai-chat', {
          body: { message, conversation_id: conversationId }
        });
      
      // Remove typing indicator
      document.getElementById(typingId)?.remove();
      
      if (error) throw error;
      
      addMessage('bot', data.reply);
      
    } catch (err) {
      document.getElementById(typingId)?.remove();
      addMessage('bot', 'Beklager, jeg kunne ikke svare. ' + err.message);
    }
  }
  
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Suggested questions
  document.querySelectorAll('[data-suggest]').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.dataset.suggest;
      sendMessage();
    });
  });
})();
</script>
```

---

## Task 11.3: Chat Database Schema

```sql
-- AI Chat Messages
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Conversations
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_messages_user ON ai_chat_messages(user_id);
CREATE INDEX idx_chat_messages_conversation ON ai_chat_messages(conversation_id);
CREATE INDEX idx_chat_conversations_user ON ai_chat_conversations(user_id);

-- RLS
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat messages"
  ON ai_chat_messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own conversations"
  ON ai_chat_conversations FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
```

---

## LEVERANSE

Etter FASE 11 skal du ha:

- [ ] ai-chat edge function
- [ ] /app/chat page med chat UI
- [ ] Rate limiting basert på tier
- [ ] Chat history i database
- [ ] Disclaimer om ikke-finansiell-rådgivning

---

## PROSJEKT FULLFØRT! 🎉

Alle 11 faser implementert:
- ✅ FASE 0: Infrastructure (4t)
- ✅ FASE 1: Legal & Compliance (4t)
- ✅ FASE 2: Auth & Onboarding (12t)
- ✅ FASE 3: Paper Trading (8t)
- ✅ FASE 4: Stripe Billing (10t)
- ✅ FASE 5: Signal System (10t)
- ✅ FASE 6: Telegram Bot (6t)
- ✅ FASE 7: Referral System (5t)
- ✅ FASE 8: Content Management (8t)
- ✅ FASE 9: Status Page (4t)
- ✅ FASE 10: Analytics (6t)
- ✅ FASE 11: AI Chat (8t)

**Total estimert tid: 95 timer**

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
